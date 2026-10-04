# ROAD — Zero-Cost (100% Free) Production Deployment Guide

This guide details how to run the entire **ROAD** ecosystem in production without paying any subscription fees or API charges ($0.00 / month forever).

---

## Architecture at Zero Cost

```
┌────────────────────────────────────────────────────────┐
│  Citizens & Municipal Staff (Browsers & Mobile Web)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS
                            ▼
┌────────────────────────────────────────────────────────┐
│  Next.js 16 Web Application (Frontend + Server APIs)   │
│  Hosted on: VERCEL HOBBY (100% Free)                   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
   Server-side AI Proxy              PostgreSQL / Storage
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│  road-ai YOLO Microservice│ │  Supabase Free Tier      │
│  Hosted on: RENDER.COM    │ │  - PostGIS Database      │
│  or KOYEB / CLOUDFLARE    │ │  - Auth & Row Security   │
│  (100% Free Web Service)  │ │  - 1 GB Photo Evidence   │
└───────────────────────────┘ └──────────────────────────┘
```

---

## 1. AI Vision Engine: 100% Free Cloud Hosting on Render.com

> [!NOTE]
> Hugging Face recently moved Docker and Gradio Spaces to a paid plan. **Render.com** and **Koyeb** provide genuinely free Python hosting with no credit card required.

### Step-by-Step Deployment on Render.com (100% Free)

Render provides a free Web Service tier that natively runs Python without needing Docker.

1. **Sign up for free**: Go to [render.com](https://render.com) and create an account using your GitHub account (no credit card required).
2. **Push your code to GitHub**: Make sure your `road-ai` folder (including `main.py`, `best_v3.pt`, and `requirements.txt`) is committed to your GitHub repository.
3. **Create Web Service**:
   - In Render dashboard, click **New +** → **Web Service**.
   - Connect your GitHub repository.
4. **Configure Settings**:
   - **Name**: `road-ai`
   - **Root Directory**: `road-ai` (or leave blank if `road-ai` is its own repository)
   - **Environment**: `Python 3`
   - **Region**: Choose closest region (e.g. `Singapore` or `Frankfurt`)
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: Select **Free** ($0 / month).
5. **Environment Variables**:
   Under the "Environment Variables" section, add:
   - `MODEL_PATH`: `best_v3.pt`
6. Click **Deploy Web Service**.

Once built, Render provides a public HTTPS URL:
```
https://road-ai-xxxx.onrender.com
```

Test it immediately in your terminal or browser:
```bash
curl https://road-ai-xxxx.onrender.com/health
```

---

## 2. Alternative Free Options for the YOLO Engine

### Option B: Koyeb (100% Free Eco Tier)
- Sign up at [koyeb.com](https://www.koyeb.com).
- Connect GitHub repository, select `road-ai`, and choose the free Eco nano instance.
- Auto-detects Dockerfile or Python buildpack.
- URL: `https://road-ai-<your-org>.koyeb.app`.

### Option C: Cloudflare Quick Tunnel (Free, Zero Setup, Self-Hosted)
If you run `main.py` on your own computer, laptop, or home/office server:
```bash
# Start your AI service locally
cd ~/ROAD/road-ai && source venv/bin/activate
MODEL_PATH=best_v3.pt uvicorn main:app --host 0.0.0.0 --port 7860

# In another terminal, expose it via Cloudflare free tunnel (no account needed):
npx untun@latest tunnel http://localhost:7860
```
This gives you an instant, secure public HTTPS URL like `https://xxxx.trycloudflare.com` that connects your Vercel website directly to your model for $0.

---

## 3. Web Application: Free Hosting on Vercel

1. Push your `ROAD` repository to GitHub.
2. Sign in to [vercel.com](https://vercel.com) using your GitHub account.
3. Click **Add New** → **Project** and select your `ROAD` repository.
4. Set **Root Directory** to `road`.
5. Under **Environment Variables**, add:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_NAME` | `ROAD` | Application title |
| `NEXT_PUBLIC_APP_URL` | `https://your-road-app.vercel.app` | Production URL |
| `NEXT_PUBLIC_APP_MODE` | `production` | Production mode |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://brrpfuzoctcwwjuszpzb.supabase.co` | Your Supabase project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Server-only Supabase key |
| `AI_PROVIDER` | `custom_yolo` | Enables your custom YOLO engine |
| `YOLO_API_URL` | `https://road-ai-xxxx.onrender.com` | Your live Render/Koyeb/Tunnel URL |
| `NEXT_PUBLIC_DEFAULT_MAP_LAT` | `13.7563` | Bangkok default latitude |
| `NEXT_PUBLIC_DEFAULT_MAP_LNG` | `100.5018` | Bangkok default longitude |
| `NEXT_PUBLIC_DEFAULT_MAP_ZOOM` | `12` | Default zoom level |

Click **Deploy**. Vercel will build and assign you a free production domain.

---

## 4. Database & Storage: Supabase Free Tier

Your database is hosted on the Supabase Free Tier:
- **Database**: 500 MB PostgreSQL with PostGIS extension.
- **File Storage**: 1 GB free bucket for road damage photos.
- **Authentication**: Free for up to 50,000 monthly active users.
- **Cost**: $0.00 / month.

---

## 5. Vector Maps: OpenFreeMap & OpenStreetMap

ROAD uses **OpenFreeMap** and **OpenStreetMap Nominatim**:
- **Vector Tiles**: Completely free, open-source vector tiles (`https://tiles.openfreemap.org/styles/liberty`).
- **No API Key**: No credit card or rate limits.
- **Geocoding**: OpenStreetMap Nominatim for search and address lookup in Thai and English.
- **Cost**: $0.00 / month.

---

## Summary of Monthly Costs

| Service | Provider | Tier | Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Frontend & API** | Vercel | Hobby Plan | **$0.00** |
| **YOLO AI Service** | Render.com / Koyeb | Free Web Service | **$0.00** |
| **Database & Auth** | Supabase | Free Tier | **$0.00** |
| **Photo Storage** | Supabase Storage | 1 GB Free | **$0.00** |
| **Map Vector Tiles** | OpenFreeMap | Open-source | **$0.00** |
| **Total** | | | **$0.00 / month** |
