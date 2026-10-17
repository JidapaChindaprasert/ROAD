"""ROAD AI Vision Engine - training script (YOLO11s, NVIDIA GPU).

Usage:
  python train.py                               # train default project & version
  python train.py --project road-2-q4wbw --version 1
  python train.py --version 7 --epochs 150 --resume   # resume interrupted training
  python train.py --force-download              # re-download dataset from Roboflow
  python train.py --epochs 100 --batch 8
  python train.py --skip-download               # use only already downloaded data

Configuration:
  - Project/Workspace: Change below, or pass --project / --workspace, or set in .env
  - Roboflow API key: Read from road-ai/.env, ROBOFLOW_API_KEY env var, or --api-key
"""
import argparse
import os
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKSPACE = os.environ.get("ROBOFLOW_WORKSPACE", "new-workspace-vy6qm")
PROJECT = os.environ.get("ROBOFLOW_PROJECT", "road-3-2jpyd")
DEFAULT_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")


def load_dotenv():
    env = HERE / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def auto_batch(vram_gb: float) -> int:
    if vram_gb >= 7.5:
        return 16
    if vram_gb >= 5.5:
        return 8
    return 4


def get_dataset(
    version: int,
    skip_download: bool = False,
    force_download: bool = False,
    api_key: str | None = None,
    workspace: str = WORKSPACE,
    project: str = PROJECT,
) -> Path:
    """Gets dataset path, automatically downloading it from Roboflow if missing or if project changed."""
    target = HERE / "datasets" / f"{project}-v{version}"
    data_yaml = target / "data.yaml"

    legacy_target = HERE / "datasets" / f"road-v{version}"
    candidates = [target]
    if legacy_target.exists():
        candidates.append(legacy_target)

    if not force_download:
        for cand in candidates:
            cand_yaml = cand / "data.yaml"
            if cand_yaml.exists():
                try:
                    import yaml
                    cfg = yaml.safe_load(cand_yaml.read_text()) or {}
                    cached_proj = cfg.get("roboflow", {}).get("project")
                    if not cached_proj or cached_proj == project:
                        print(f"Using existing dataset for '{project}' v{version}: {cand}")
                        return cand_yaml
                    else:
                        print(f"Notice: Cached dataset at {cand.name} is '{cached_proj}', but current project is '{project}'.")
                except Exception:
                    pass

    if skip_download:
        sys.exit(f"--skip-download set but dataset for '{project}' v{version} does not exist at {target}")

    key = api_key or os.environ.get("ROBOFLOW_API_KEY") or DEFAULT_API_KEY
    if not key:
        sys.exit("ROBOFLOW_API_KEY not set. Put it in .env or pass --api-key.")

    try:
        from roboflow import Roboflow
    except ImportError:
        sys.exit("roboflow package not installed. Run: pip install roboflow")

    if force_download and target.exists():
        print(f"Force re-download requested. Cleaning {target}...")
        shutil.rmtree(target, ignore_errors=True)

    print(f"Downloading dataset from Roboflow ({workspace}/{project} v{version}) into {target.name}...")
    rf = Roboflow(api_key=key)
    ds = (
        rf.workspace(workspace)
        .project(project)
        .version(version)
        .download("yolov11", location=str(target))
    )
    downloaded_yaml = Path(ds.location) / "data.yaml"
    if not downloaded_yaml.exists():
        sys.exit(f"Downloaded dataset but data.yaml not found at {downloaded_yaml}")

    print(f"Dataset ready at: {downloaded_yaml}")
    return downloaded_yaml


def main():
    load_dotenv()
    ap = argparse.ArgumentParser(description="Train ROAD YOLO11 damage detection model")
    ap.add_argument("--project", default=PROJECT, help=f"Roboflow project name (default: {PROJECT})")
    ap.add_argument("--workspace", default=WORKSPACE, help=f"Roboflow workspace (default: {WORKSPACE})")
    ap.add_argument("--version", type=int, default=1, help="Roboflow dataset version (default: 1)")
    ap.add_argument("--force-download", action="store_true", help="Force fresh download even if cached")
    ap.add_argument("--skip-download", action="store_true", help="Skip download, fail if not local")
    ap.add_argument("--resume", action="store_true", help="Resume training from last checkpoint (last.pt)")
    ap.add_argument("--api-key", default=None, help="Roboflow API key (default: from .env or environment)")
    ap.add_argument("--model", default="yolo11s.pt", help="Base model weights (yolo11s.pt or yolo11n.pt)")
    ap.add_argument("--epochs", type=int, default=120)
    ap.add_argument("--batch", type=int, default=0, help="Batch size (0 = auto from VRAM)")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--workers", type=int, default=4 if os.name != "nt" else 2)
    args = ap.parse_args()

    import torch
    import yaml
    from ultralytics import YOLO

    if not torch.cuda.is_available():
        sys.exit("CUDA not available. Install the CUDA build of PyTorch and check nvidia-smi.")
    props = torch.cuda.get_device_properties(0)
    vram = props.total_memory / 1024**3
    batch = args.batch or auto_batch(vram)
    print(f"GPU: {props.name} ({vram:.1f} GB) -> batch={batch}")

    data_yaml = get_dataset(
        version=args.version,
        skip_download=args.skip_download,
        force_download=args.force_download,
        api_key=args.api_key,
        workspace=args.workspace,
        project=args.project,
    )
    cfg = yaml.safe_load(data_yaml.read_text())
    print(f"Dataset '{args.project}' v{args.version} loaded successfully.")
    print("Classes in dataset:", cfg.get("names"))
    has_test = "test" in cfg and cfg["test"]

    name = f"yolo11s-{args.project}-v{args.version}"
    last_ckpt = HERE / "runs" / name / "weights" / "last.pt"

    if args.resume:
        if not last_ckpt.exists():
            sys.exit(f"Cannot resume: checkpoint not found at {last_ckpt}")
        print(f"Resuming training from checkpoint: {last_ckpt}")
        model = YOLO(str(last_ckpt))
        model.train(resume=True)
    else:
        model = YOLO(args.model)
        model.train(
            data=str(data_yaml),
            imgsz=args.imgsz,
            epochs=args.epochs,
            patience=20,
            batch=batch,
            device=0,
            amp=True,          # mixed precision (FP16)
            workers=args.workers,
            mosaic=1.0,
            mixup=0.15,
            project=str(HERE / "runs"),
            name=name,
            exist_ok=True,
        )

    best_path = Path(model.trainer.best)
    print(f"Best weights: {best_path}")
    shutil.copy(best_path, HERE / "best.pt")
    print(f"Copied to {HERE / 'best.pt'} (used by main.py)")

    best = YOLO(str(best_path))
    split = "test" if has_test else "val"
    m = best.val(data=str(data_yaml), split=split, imgsz=args.imgsz, conf=0.001, iou=0.45)
    print(f"\n=== {split} set ===")
    print(f"mAP50 = {m.box.map50:.3f}   (target >= 0.80)")
    print(f"mAP50-95 = {m.box.map:.3f}")
    for i, cls_idx in enumerate(m.box.ap_class_index):
        print(f"  {m.names[int(cls_idx)]:<20} mAP50 = {m.box.ap50[i]:.3f}")


if __name__ == "__main__":  # guard needed on Windows (dataloader workers)
    main()
