# ROAD — Civic Road Damage Reporting & Tracking System

An end-to-end web application for reporting, classifying, and tracking road damage (potholes, surface cracks, subsidence, and road wear) to improve municipal maintenance and civic engagement.

---

## Project Overview

ROAD connects citizens with municipal public works departments. When citizens report road damage, our computer vision service automatically classifies damage type and severity. Municipal staff can view reports on an interactive map, triage issues by priority, assign repair teams, and export official Thai government repair petitions.

### System Architecture

The project is organized into two primary components:

```
ROAD/
├── road/            # Full-stack web application (Next.js 16 + React 19 + TypeScript)
└── hf-road-ai/      # AI computer vision service (FastAPI + YOLOv11 Dual-Model Ensemble)
```

1. **`road/` (Frontend & Application Backend)**
   - Built with Next.js App Router, React 19, and Tailwind CSS.
   - Database and spatial queries powered by Supabase (PostgreSQL with PostGIS extensions).
   - Interactive map with Leaflet and CARTO raster tiles.
   - Official Thai government repair petition generator (`หนังสือขอความอนุเคราะห์ซ่อมแซมถนน`) with Garuda emblem and A4 print layout.
   - Staff triage dashboard with role-based authentication and status workflows.

2. **`hf-road-ai/` (AI Vision Engine)**
   - FastAPI microservice deployed as a Docker container on Hugging Face Spaces.
   - Dual-model YOLOv11 ensemble:
     - **Model 1** (`model1/best.pt`): Scene context and road structure detection.
     - **Model 2** (`model2/best_map50.pt`): Fine-grained road damage specialist.
   - Fuses predictions with confidence thresholds to identify damage categories (potholes, cracks, subsidence, surface wear).

---

## Quick Start

### 1. Web Application (`road/`)

```bash
cd road

# Install dependencies
npm install

# Run development server (runs in demo mode by default)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Running Tests & Validation

```bash
# Typecheck
npm run typecheck

# Unit tests
npm run test

# Production build
npm run build
```

---

### 2. AI Vision Service (`hf-road-ai/`)

#### Running Locally with Python

```bash
cd hf-road-ai

# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the inference server
uvicorn main:app --host 0.0.0.0 --port 7860
```

#### Running with Docker

```bash
cd hf-road-ai
docker build -t road-ai .
docker run -p 7860:7860 road-ai
```

The service exposes:
- `GET /` — API status and loaded model details
- `GET /health` — Health check endpoint
- `POST /predict` — Image damage classification endpoint (accepts `file: UploadFile`)
- `POST /predict/image` — Annotated preview with bounding boxes

---

## Key Features

- **Damage Reporting**: Single-photo upload with client-side image optimization and interactive map coordinate selection.
- **AI Classification**: Dual-model YOLOv11 ensemble detects damage type and suggests severity.
- **Interactive Community Map**: Filter by damage category, status, and view nearby community reports.
- **Official Repair Petition**: Generates a standard Thai government official letterhead with incident details, map coordinates, and photos ready for print or PDF export.
- **Staff Operations Queue**: Priority-based triage queue (`P1`–`P4`), team assignment, and lifecycle progression (reported → investigating → scheduled → in progress → resolved).
