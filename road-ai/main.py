"""ROAD Dual-Model Inference API (FastAPI).

Runs Model 1 (Context & Structure Aware) and Model 2 (Damage Specialist) in parallel,
then applies spatial grounding, context weighting, and conflict/swap resolution.

Run:
  uvicorn main:app --host 0.0.0.0 --port 7860
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import io
import os
import torch
from typing import Optional

# Limit PyTorch to 1 CPU thread to avoid memory spikes and thrashing on containerized free tier (512MB RAM)
torch.set_num_threads(1)

import cv2
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import numpy as np
from PIL import Image
from ultralytics import YOLO

from ensemble import fuse_dual_predictions, normalize_class_name

# Configuration & Path Resolution
def resolve_model_path(env_var: str, candidates: list[str]) -> str:
    from_env = os.getenv(env_var)
    if from_env and os.path.exists(from_env):
        return from_env
    for cand in candidates:
        if os.path.exists(cand):
            return cand
    return candidates[0]

MODEL1_PATH = resolve_model_path("MODEL1_PATH", [
    "model1/best.pt",
    "model1/best_v1.pt",
    "best.pt",
])

MODEL2_PATH = resolve_model_path("MODEL2_PATH", [
    "model2/best_map50.pt",
    "model2/best.pt",
    "best_v5.pt",
    "best.pt",
])

CONF = float(os.getenv("CONF", "0.20"))
IOU = float(os.getenv("IOU", "0.45"))
TTA = os.getenv("TTA", "0") == "1"
API_TOKEN = os.getenv("API_TOKEN")

app = FastAPI(title="ROAD AI Dual-Model Vision Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import gc

print(f"Loading Model 1 (Context & Damage): {MODEL1_PATH}")
model1 = YOLO(MODEL1_PATH)
print(f"Model 1 loaded. Classes: {model1.names}")

print(f"Loading Model 2 (Damage Specialist): {MODEL2_PATH}")
model2 = YOLO(MODEL2_PATH)
print(f"Model 2 loaded. Classes: {model2.names}")
gc.collect()

executor = ThreadPoolExecutor(max_workers=1)


@torch.inference_mode()
def run_single_inference(m: YOLO, img: Image.Image, conf: float, iou: float, tta: bool):
    return m.predict(img, imgsz=640, conf=conf, iou=iou, augment=tta, verbose=False)[0]


async def run_parallel_inference(img: Image.Image, conf: float = CONF, iou: float = IOU, tta: bool = TTA):
    loop = asyncio.get_running_loop()
    def _run():
        r1 = run_single_inference(model1, img, conf, iou, tta)
        r2 = run_single_inference(model2, img, conf, iou, tta)
        return r1, r2
    return await loop.run_in_executor(executor, _run)


@app.get("/")
def root():
    return {
        "name": "ROAD AI Dual-Model Vision Engine",
        "status": "online",
        "architecture": "parallel_ensemble_context_grounded",
        "model1": {"path": MODEL1_PATH, "classes": model1.names},
        "model2": {"path": MODEL2_PATH, "classes": model2.names},
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model1": {"path": MODEL1_PATH, "classes": model1.names},
        "model2": {"path": MODEL2_PATH, "classes": model2.names},
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    conf: float = CONF,
    x_api_token: Optional[str] = Header(None),
):
    if API_TOKEN and x_api_token != API_TOKEN:
        raise HTTPException(401, "Invalid token")

    try:
        raw_bytes = await file.read()
        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image")

    W, H = img.size

    # Run Model 1 & Model 2 in parallel
    res1, res2 = await run_parallel_inference(img, conf=conf, iou=IOU, tta=TTA)

    # Fuse predictions with context grounding and conflict/swap resolution
    result = fuse_dual_predictions(
        res_model1=res1,
        res_model2=res2,
        img_width=W,
        img_height=H,
        conf_threshold=conf,
        iou_match_threshold=IOU,
    )

    return result


@app.post("/predict/image")
async def predict_image(
    file: UploadFile = File(...),
    conf: float = CONF,
    x_api_token: Optional[str] = Header(None),
):
    """Debug visualizer: Draws surface regions (dashed/light) and fused damages."""
    if API_TOKEN and x_api_token != API_TOKEN:
        raise HTTPException(401, "Invalid token")

    try:
        raw_bytes = await file.read()
        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image")

    W, H = img.size
    res1, res2 = await run_parallel_inference(img, conf=conf, iou=IOU, tta=TTA)

    fused = fuse_dual_predictions(
        res_model1=res1,
        res_model2=res2,
        img_width=W,
        img_height=H,
        conf_threshold=conf,
        iou_match_threshold=IOU,
    )

    # Convert PIL Image to OpenCV BGR format for drawing
    cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # 1. Draw Surface boundaries from Model 1 in subtle tones
    for b in res1.boxes:
        name = normalize_class_name(model1.names[int(b.cls)])
        if name in {"road", "sidewalk"}:
            x1, y1, x2, y2 = map(int, b.xyxy[0].tolist())
            color = (60, 180, 75) if name == "road" else (240, 150, 30)  # BGR
            cv2.rectangle(cv_img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                cv_img,
                f"[{name.upper()} {float(b.conf):.2f}]",
                (x1 + 4, max(y1 + 18, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                1,
                cv2.LINE_AA,
            )

    # 2. Draw Fused Damage Bounding Boxes with high visibility
    for label in fused.get("labels", []):
        bb = label["boundingBox"]
        x1, y1 = bb["x"], bb["y"]
        x2, y2 = x1 + bb["width"], y1 + bb["height"]
        cat = label["category"]
        score = label["score"]
        ctx = label.get("surfaceContext", "")

        # Color coding damages: Red for pothole/subsidence, Orange for sidewalk, Amber for crack
        if cat in {"pothole", "subsidence"}:
            box_color = (0, 0, 230)  # Bright Red
        elif cat == "sidewalk damage":
            box_color = (0, 140, 255)  # Orange
        else:
            box_color = (0, 215, 255)  # Amber

        cv2.rectangle(cv_img, (x1, y1), (x2, y2), box_color, 3)
        tag = f"{cat} {round(score * 100)}% ({ctx})"
        (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(cv_img, (x1, max(0, y1 - th - 6)), (x1 + tw + 6, max(th + 6, y1)), box_color, -1)
        cv2.putText(
            cv_img,
            tag,
            (x1 + 3, max(y1 - 4, th)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

    # Encode back to JPEG
    ok, buf = cv2.imencode(".jpg", cv_img)
    if not ok:
        raise HTTPException(500, "Image encoding error")

    return Response(content=buf.tobytes(), media_type="image/jpeg")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
