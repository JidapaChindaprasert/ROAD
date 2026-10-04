---
title: ROAD AI Vision Engine
emoji: 🛣️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# ROAD AI Vision Engine

FastAPI inference service powered by YOLO11s (`best_v3.pt`) for road damage detection (potholes, cracks, subsidence, damaged sidewalks).

## Endpoints

- `GET /health` - Health check and model class metadata.
- `POST /predict` - Accepts `multipart/form-data` with `file: UploadFile` and optional `X-API-Token`.
- `POST /predict/image` - Returns annotated image with bounding boxes.
