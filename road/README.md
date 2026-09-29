# ROAD — Civic Road Damage Reporting & Tracking

**ROAD** is a responsive, accessible, real-time civic application for reporting, classifying, and tracking road hazards (such as potholes, road surface cracks, subsidence, and blocked drainage).

Designed for citizens and municipal public works departments (such as the Bangkok Metropolitan Administration / BMA and local District Engineering divisions), ROAD streamlines community triage with AI-assisted vision classification, verified incident progression, and an official printable Thai government repair petition generator.

---

## Key Highlights

- **Dual-Mode Architecture**:
  - **Demo Mode (`NEXT_PUBLIC_APP_MODE=demo`)**: 100% functional out of the box with zero external credentials. Includes 20 seeded Bangkok reports, local storage persistence, multi-tab `BroadcastChannel` synchronization, and transparent simulated AI.
  - **Production Mode (`NEXT_PUBLIC_APP_MODE=production`)**: Powered by Supabase PostGIS, Row Level Security (RLS), Supabase SSR authentication, Roboflow computer vision models, and PostgreSQL Realtime channels.
- **AI-Assisted Damage Classification**:
  - Automatically identifies damage categories (`pothole`, `crack`, `subsidence`, `surface_wear`, `standing_water`), suggests severity, and extracts bounding boxes.
  - Media sanitizer validates magic bytes and strips EXIF GPS/device metadata before storage.
  - Decoupled reporting ensures citizens can always submit even if AI vision services are temporarily unavailable.
- **Interactive Bangkok Community Map**:
  - Schematic vector city map with smooth drag-to-pan, pinch-to-zoom, status and category filtering, and instant search.
  - Static, high-visibility pin selection indicators without jarring animations.
- **Official Thai Government Repair Petition Generator ("หนังสือขอความอนุเคราะห์ซ่อมแซมถนน")**:
  - Generates authentic Thai official letterhead documents with Garuda emblem (`ตราครุฑ`), administrative metadata, incident coordinates, and photographic evidence.
  - Features an interactive pre-print configuration modal and standard A4 `@media print` formatting for immediate export to PDF or physical submission to local authorities (อบต./เทศบาล/สำนักงานเขต).
- **Municipal Staff Operations Console**:
  - Real-time incident triage queue with priority tagging (`P1` to `P4`), engineering crew assignments, duplicate linking, and optimistic concurrency locks.
  - Live status indicator badge showing multi-session sync health.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Server & Client Components)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide Icons, Sonner toasts
- **Database & Spatial**: Supabase (PostgreSQL with PostGIS extensions)
- **Computer Vision**: Roboflow Inference API (Server-side proxy gateway)
- **Type Safety & Validation**: Strict TypeScript, Zod schemas
- **Testing**: Vitest, React Testing Library, Playwright E2E, Axe-core accessibility

---

## Quick Start

### 1. Installation

```bash
git clone <repo-url>
cd road
npm install
```

### 2. Run in Demo Mode (Zero Credentials Required)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Demo mode runs with deterministic fixtures and client-side broadcast sync.

### 3. Verification Commands

```bash
# Run ESLint validation
npm run lint

# Run TypeScript typecheck
npm run typecheck

# Run Vitest unit & integration test suites
npm run test

# Run Next.js production build
npm run build

# Run Playwright E2E tests
npm run test:e2e
```

---

## Production Configuration

To switch to production mode, create `.env.local` with the following variables:

```env
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Roboflow Vision API
ROBOFLOW_API_KEY=your-roboflow-api-key
ROBOFLOW_MODEL_ID=road-damage-detection
ROBOFLOW_VERSION=4
```

### Supabase Migrations

The migrations under `supabase/migrations/` establish the full relational and spatial schema:
1. `20260929000001_initial_schema.sql`: PostGIS extension, 11 core tables, spatial GIST indexes, and automatic projection triggers.
2. `20260929000002_rls_policies.sql`: Row Level Security policies enforcing anonymous read, reporter ownership, and staff/admin boundaries.
3. `20260929000003_spatial_and_rpc_functions.sql`: PostGIS spatial bounds queries (`rpc_reports_in_bounds`) and transactional status transition procedures (`rpc_transition_report_status`).

---

## Security & Privacy

1. **Location Privacy**: Public map queries access generalized coordinates (`public_report_features`) rather than raw GPS coordinates to protect citizen reporter privacy.
2. **Server-Side API Keys**: Third-party API keys (Roboflow, Supabase Service Role) are executed exclusively on server route handlers and never leaked to client bundles.
3. **Optimistic Concurrency**: Status updates enforce an `expectedVersion` check to prevent race conditions when multiple operators triage incidents simultaneously.
