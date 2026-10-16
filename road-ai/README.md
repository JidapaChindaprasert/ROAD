---
title: ROAD AI Vision Engine
emoji: 🛣️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# ROAD AI Dual-Model Vision Engine

FastAPI inference service running **two YOLOv11s models in parallel** for road damage detection.

- **Model 1** (`model1/best.pt`) — Context & structure model: detects `road`, `sidewalk`, `pothole`, `crack`, `subsidence`, `damage sidewalk`
- **Model 2** (`model2/best_map50.pt`) — Damage specialist: detects `pothole`, `crack`, `subsidence`, `damage sidewalk`

Results are fused using a context-grounded spatial ensemble algorithm.

## Endpoints

- `GET /` — Service info and loaded model classes
- `GET /health` — Health check
- `POST /predict` — Accepts `multipart/form-data` with `file: UploadFile`. Returns JSON with `primaryCategory`, `confidenceScore`, `labels`, `needsHumanReview`, `summary`.
- `POST /predict/image` — Returns annotated image with bounding boxes (debug use).
