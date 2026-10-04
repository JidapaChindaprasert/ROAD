"""ROAD inference API.
Run:  uvicorn main:app --host 0.0.0.0 --port 7860
Env (all optional):
  MODEL_PATH=best.pt   CONF=0.35   IOU=0.45   TTA=0   API_TOKEN=<secret>
"""
import io
import os

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image
from ultralytics import YOLO

MODEL_NAME = "yolo11s-road-v1"
MODEL_PATH = os.getenv("MODEL_PATH", "best_v3.pt")
CONF = float(os.getenv("CONF", "0.35"))
IOU = float(os.getenv("IOU", "0.45"))
TTA = os.getenv("TTA", "0") == "1"
API_TOKEN = os.getenv("API_TOKEN")  # if set, requests must send X-API-Token

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ROAD AI Vision Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO(MODEL_PATH)

# Normalise dataset class names to the PRD / database names.
CANON = {
    "pothole": "pothole",
    "crack": "crack",
    "subsidence": "subsidence",
    "sidewalk damage": "sidewalk damage",
    "damaged sidewalk": "sidewalk damage",
}
IGNORE = {"road"}  # classes in the dataset that are not part of the PRD

TH = {
    "pothole": "หลุมบ่อ",
    "crack": "รอยแตกร้าว",
    "subsidence": "ถนนทรุดตัว",
    "sidewalk damage": "ทางเดินพังเสียหาย",
}


def canon(name: str):
    n = name.lower().replace("_", " ").strip()
    if n in IGNORE:
        return None
    return CANON.get(n, n)


def severity(category: str, area_ratio: float) -> str:
    """Heuristic only - tune with real labelled severity data."""
    if area_ratio > 0.15 or (category == "subsidence" and area_ratio > 0.05):
        return "high"
    if area_ratio > 0.04:
        return "medium"
    return "low"


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "classes": model.names}


@app.post("/predict")
async def predict(file: UploadFile = File(...), x_api_token: str = Header(None)):
    if API_TOKEN and x_api_token != API_TOKEN:
        raise HTTPException(401, "Invalid token")
    try:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image")

    W, H = img.size
    res = model.predict(img, imgsz=640, conf=CONF, iou=IOU, augment=TTA, verbose=False)[0]

    labels = []
    for b in res.boxes:
        cat = canon(model.names[int(b.cls)])
        if cat is None:
            continue
        x1, y1, x2, y2 = b.xyxy[0].tolist()
        labels.append({
            "category": cat,
            "score": round(float(b.conf), 4),
            "boundingBox": {"x": round(x1), "y": round(y1),
                            "width": round(x2 - x1), "height": round(y2 - y1)},
            "_area": ((x2 - x1) * (y2 - y1)) / (W * H),
        })

    if not labels:
        return {"provider": "custom_yolo", "model": MODEL_NAME, "primaryCategory": None,
                "suggestedSeverity": "low", "confidenceScore": 0.0, "labels": [],
                "summary": "ระบบ AI ไม่พบความเสียหายในภาพนี้", "needsHumanReview": True}

    top = max(labels, key=lambda l: l["score"])
    sev = severity(top["category"], max(l["_area"] for l in labels))
    for l in labels:
        l.pop("_area")

    return {
        "provider": "custom_yolo",
        "model": MODEL_NAME,
        "primaryCategory": top["category"],
        "suggestedSeverity": sev,
        "confidenceScore": top["score"],
        "labels": labels,
        "summary": f"ระบบ AI ตรวจพบ{TH.get(top['category'], top['category'])}บนผิวทาง "
                   f"(ความมั่นใจ {round(top['score'] * 100)}%)",
        "needsHumanReview": top["score"] < 0.5,
    }



# ---- Debug endpoint: returns the image with boxes drawn ----
import cv2
from fastapi.responses import Response


@app.post("/predict/image")
async def predict_image(file: UploadFile = File(...), x_api_token: str = Header(None)):
    if API_TOKEN and x_api_token != API_TOKEN:
        raise HTTPException(401, "Invalid token")
    try:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image")
    res = model.predict(img, imgsz=640, conf=CONF, iou=IOU, augment=TTA, verbose=False)[0]
    ok, buf = cv2.imencode(".jpg", res.plot())  # res.plot() returns the image with boxes (BGR)
    return Response(content=buf.tobytes(), media_type="image/jpeg")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

