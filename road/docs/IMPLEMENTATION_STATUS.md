# ROAD — Implementation Status

## Completed

### Milestone 1 — Foundation ✅
- **Next.js 16 Project Scaffold**: Configured with React 19, TypeScript strict mode, Tailwind CSS v4, and Lucide icons.
- **Project Naming**: Fully standardized to **ROAD**.
- **Roboflow Integration Config**: `ROBOFLOW_API_KEY`, `ROBOFLOW_MODEL_ID`, `ROBOFLOW_VERSION` configurable via `.env.local`.
- **Design System**: Off-white canvas (`#F6F8FB`), deep navy typography, teal brand palette (`#087F78`/`#37D5BC`), glassmorphic panels, status badges, `globals.css`.
- **Core UI Components**: `Button`, `Badge`, `Card`, `Input`, `Textarea`, `Skeleton`, `Dialog`, `Sheet`, `EmptyState`, `ErrorState`.
- **App Shell**: Accessible `AppHeader`, `MobileNavigation` (safe-area), `PageContainer`, `ModeIndicator`, `Providers` (TanStack Query + Sonner).
- **Domain Modeling**: `ReportDetail`, `ReportSummary`, `DamageCategory`, `ReportStatus`, `PublicStatus`, `AIAnalysisResult`, Zod schemas.
- **Status Machine**: Canonical lifecycle transitions, status display config.

### Milestone 2 — Complete Demo Product ✅
- **Seed Data**: 20 realistic Bangkok road damage reports with full timeline events, AI analysis, GPS coordinates.
- **Demo Repository**: `DemoReportRepository` with localStorage persistence, filtering, submission, and simulated lifecycle updates.
- **Dashboard** (`/`): Hero section, community metrics, map preview, recent reports feed, quick report CTA.
- **Community Map** (`/map`): Interactive `CityMap` powered by MapLibre GL & OpenFreeMap vector tiles. Supports:
  1. Area search (Geocoding via OpenStreetMap Nominatim with Thai language localization and auto-fly).
  2. Click-to-select report location with reverse geocoding and 1-click transition to report wizard (`/report/new?lat=...&lng=...&label=...`).
  3. Direct coordinate search (regex autodetection in search bar + dedicated Lat/Lng modal with popular Bangkok presets).
  4. Real-time incident pins, status colors, category hover badges, GPS locate-me button, zoom/reset controls.
- **Report Wizard** (`/report/new`): Evidence upload → Roboflow/demo AI classification → GPS location with mini-map and manual fallback → submission.
- **Report Detail** (`/reports/[id]`): Full timeline, AI analysis panel, location, simulated lifecycle transitions, share link.
- **My Reports** (`/my-reports`): Card grid with status badges, thumbnails, and navigation.
- **Operations Dashboard** (`/operations`): Report queue with status transition management.
- **AI Integration**: `roboflow-adapter.ts` (production) + `demo-classifier.ts` (labeled as simulated).
- **Error/Loading/Empty States**: All routes handle all states.

### Milestone 3 — Production Data & Auth ✅
- **Supabase Database Migrations**:
  - `20260929000001_initial_schema.sql`: PostGIS extensions, 11 core tables (`profiles`, `user_roles`, `teams`, `report_drafts`, `reports`, `public_report_features`, `report_media`, `ai_analyses`, `report_status_events`, `report_jobs`, `idempotency_records`), spatial GIST indexes, and automatic projection synchronization triggers.
  - `20260929000002_rls_policies.sql`: Comprehensive Row Level Security (RLS) policies for all tables with helper functions (`is_staff`, `is_admin`). Enforces strict boundary access for anonymous users, report owners, and municipal staff.
  - `20260929000003_spatial_and_rpc_functions.sql`:
    - `rpc_reports_in_bounds`: PostGIS bounding box query with spatial index for viewport map fetching.
    - `rpc_get_public_report_detail`: Sanitized public detail extraction.
    - `rpc_transition_report_status`: Transactional status transition with optimistic concurrency lock (`version`), staff authorization checks, and audit timeline appending.
- **Data Privacy & DTO Separation** (`dto-mappers.ts`):
  - Strict separation between raw internal database rows and public DTOs (`ReportSummary`, `ReportDetail`).
  - Generalized/snapped public location prevents exposing private home GPS coordinates to the public.
  - Internal staff notes and owner identifiers are omitted from public responses.
- **Supabase SSR Client Integration**:
  - `client.ts`: Browser client via `@supabase/ssr`.
  - `server.ts`: Server client with Next.js cookie management.
  - `service-role.ts`: Admin/worker client for trusted operations.
- **Production Repository** (`SupabaseReportRepository`):
  - Fully implements `IReportRepository` against live Supabase database and RPC endpoints.
  - `RepositoryProvider` seamlessly toggles between demo and production repositories, failing clearly with actionable errors if required credentials are not supplied.

### Milestone 4 — Evidence and AI ✅
- **Server-Side AI Classification Gateway** (`/api/ai/classify`):
  - Server-side proxy for Roboflow inference ensuring `ROBOFLOW_API_KEY` never leaks to client browser bundles.
  - Automatically toggles between production Roboflow vision model and transparent deterministic simulated AI (`[Simulated AI]`).
  - Strict structured schema output with categories, bounding boxes, severity, and review flags.
- **Evidence Upload Intent & Finalization**:
  - `POST /api/drafts`: Creates authenticated report drafts.
  - `POST /api/drafts/[id]/upload-intent`: Validates file size (max 10MB) and MIME types, issuing signed upload destination URLs.
  - `POST /api/drafts/[id]/finalize-upload`: Confirms upload ownership and enqueues durable processing jobs.
- **Trusted Media Sanitization** (`src/lib/media/sanitizer.ts`):
  - Magic byte validation for JPEG, PNG, WebP, and MP4 containers.
  - Automatic EXIF metadata stripping from JPEG images to prevent leaking user GPS and camera serials.
  - Unit tests verifying magic byte verification and EXIF removal.
- **Durable Database Job Queue & Worker Service** (`src/lib/jobs/queue.ts`, `src/lib/jobs/worker.ts`):
  - Job claiming with transactional lease locking and bounded retries (max 5).
  - Exponential backoff retry logic and dead-letter queue transition.
  - `POST /api/workers/process-jobs`: Protected background worker endpoint.
- **Browser Video Frame Extractor** (`video-frame-extractor.ts`):
  - Samples up to 3 representative frames across video duration for road hazard classification without heavy server transcoding.
- **Optional AI Submission**:
  - Submitting reports is fully decoupled from AI classification status, ensuring citizens can report road hazards even if AI is offline, pending, or failing.

### Milestone 5 — Realtime & Operations Console ✅
- **Dual-Mode Multi-Session Realtime Architecture** (`use-realtime.ts`):
  - **Demo Mode**: Leverages `BroadcastChannel` (`road_realtime_broadcast`) and storage event listeners to broadcast status transitions and new report notifications across separate browser tabs and windows in real time without external WebSockets.
  - **Production Mode**: Integrates Supabase Realtime channel subscriptions with graceful fallback and connection state monitoring.
- **Operational Priority & Triage Matrix**:
  - Priority levels (`p1` to `p4`) with clear municipal urgency definitions:
    - P1: Critical (Immediate Safety Hazard / Arterial Road)
    - P2: High (Heavy Traffic Disruption / Major Collector)
    - P3: Normal (Standard Secondary / Neighborhood Road)
    - P4: Low (Cosmetic Wear / Preventative Maintenance)
- **Municipal Maintenance Crew Assignment**:
  - Assign specific engineering teams (สำนักการโยธา, หน่วยเคลื่อนที่เร็ว กทม., กองช่างทางหลวงชนบท, ผู้รับเหมาซ่อมแซมฉุกเฉิน) to incidents.
- **Duplicate Report Handling & Canonical Linking**:
  - Incidents can be flagged as duplicate, linking to a master canonical incident ticket for transparent citizen tracking.
- **Reopening Safeguards**:
  - Enforces mandatory internal staff justification notes whenever an already resolved incident is reopened for reassessment.
- **Live Sync Status Badge** (`live-status-badge.tsx`):
  - Real-time indicator widget displaying `Live Sync` (green pulse), `Reconnecting...` (amber), or `Offline` (gray) in operations and tracking interfaces.
- **Operations Transition Route & Optimistic Concurrency**:
  - `/api/operations/reports/[id]/transition`: Validates `expectedVersion` to prevent race conditions during simultaneous multi-operator triage.
  - `/api/operations/reports/[id]/assignment`: Staff-only team assignment and priority modification endpoint.

### Milestone 6 — Hardening, Polish, and Production Readiness ✅
- **End-to-End Test Automation (Playwright)**:
  - `tests/e2e/community-map.spec.ts`: Tests landing page navigation, status filtering, category filters, and map/list view toggle.
  - `tests/e2e/report-submission.spec.ts`: Tests complete 2-step citizen submission flow from photo upload and AI classification to location confirmation and success audit screen.
  - `tests/e2e/operations-queue.spec.ts`: Tests operations triage, status transition modal, crew assignment, and Thai government repair petition PDF generation.
  - `tests/e2e/accessibility.spec.ts`: Automated axe-core accessibility auditing on key public flows.
- **Comprehensive Integration Testing (Vitest & RTL)**:
  - `tests/integration/report-lifecycle.test.ts`: Tests full lifecycle progression from citizen submission, simulated Roboflow AI categorization, public projection retrieval, operational triage, through resolution and concurrency conflict rejection.
- **Sample Evidence Generator for Rapid Demo Testing**:
  - Added "Use Demo Photo" one-click sample loader in `EvidenceUploader`, eliminating file picker friction during demonstrations and automated testing.
- **Accessibility & Contrast Audit**:
  - High-contrast badge tokens, focus ring states, descriptive aria-labels, and semantic HTML landmarks across all routes.
- **Documentation & Operational Runbooks**:
  - Updated `README.md` with complete architecture guide, quick start, production Supabase PostGIS setup, and security protocols.

## Verification
- `npm run lint`: **0 errors** (54 warnings for optional img tags)
- `npm run typecheck`: **PASSED (0 errors)**
- `npm run test`: **PASSED (21/21 tests across 7 test suites)**
- `npm run build`: **PASSED (Compiled 16/16 routes cleanly)**
- `npm run test:e2e`: **PASSED (18/18 tests passed across Desktop Chrome & Mobile Chrome)**

### Recent Improvements & Bug Fixes
- **Demo Evidence Image Display & Persistence (Fix for "หน้าติดตาม ภาพเดโมไม่แสดง")**:
  - Replaced ephemeral `URL.createObjectURL` in `DemoReportRepository.uploadMedia` and `report-wizard.tsx` with base64 Data URLs via `FileReader.readAsDataURL`, ensuring uploaded and demo images persist permanently in `localStorage` across page reloads and navigations.
  - Implemented crisp inline Base64 SVG vector fallbacks in `src/lib/constants/fallback-images.ts` for all damage categories (`pothole`, `crack`, `subsidence`, `surface_wear`, `standing_water`).
  - Added robust `onError` image handling and `getSafeImageUrl` wrappers across all views (`report-detail-view.tsx`, `my-reports/page.tsx`, `recent-reports.tsx`, `report-timeline.tsx`, `selected-report-panel.tsx`, and `thai-repair-request-modal.tsx`), so if external image URLs (e.g., Unsplash) fail to load or are offline, clean vector graphics display immediately.
- **Thai Government Official Repair Petition Form Generator ("หนังสือขอความอนุเคราะห์ซ่อมแซมถนน")**:
  - Replicated exact official Thai government document template based on user-provided letterhead.
  - Auto-informs location (village/subdistrict), road name, damage category, dimensions, GPS coordinates, reference ID, and attached photographic evidence.
  - Includes interactive pre-print editing panel and print-to-PDF formatting (`@media print`, standard Thai document typography, A4 page bounds).
  - Accessible via "พิมพ์หนังสือราชการ (PDF)" in both Report Detail view (`/reports/[id]`) and Operations Management (`/operations`).
- **Map Pin Selection Fix**:
  - Removed annoying expanding/moving circle animation (`animate-ping`) on clicked damage map pins; replaced with a crisp, high-visibility static target ring.
- **Interactive Drag-to-Pan Map**:
  - Added continuous mouse drag and mobile touch drag-to-pan to the map, allowing users to scroll around freely at any zoom level.
- **Responsive Layout Polish**:
  - Report Wizard (`/report/new`): Fixed "Next: Confirm Location" and "Submit Road Report" button overflow on mobile viewports by converting card footers to responsive `flex-col-reverse sm:flex-row gap-3` with full-width mobile tap targets and flexible step headers.
  - Navbar: Fixed title and brand wrapping on mobile (`whitespace-nowrap`, responsive `hidden sm:block` subtitles).
  - Map Badge: Made demo map badge responsive (`max-w-[calc(100%-110px)]`), eliminating overlap with zoom controls on small phone viewports.
  - Card Status Badges: Fixed right-side status badges and text overflowing cards on mobile by applying `min-w-0 flex-1` and clean truncation.
  - Mode Indicator: Enabled proper `cn()` class merging so demo badge hides cleanly on mobile and stays in desktop view without crowding.
- **Migration to High-Performance Leaflet Engine**:
  - Replaced MapLibre GL with lightweight Leaflet 1.9.4 engine (~42KB gzipped vs ~1MB MapLibre bundle + Web Worker).
  - Eliminated WebGL context initialization delay and Web Worker URL bundling issues in Next.js Turbopack.
  - Native integration with CARTO Voyager raster tiles with official CARTO API key (`cb1_43kf_1_52bd28b4e3ec99b3a194e59f`), with automatic OpenStreetMap fallback.
  - Maintained 100% of interactive features:
    1. Real-time area search (Nominatim with Thai/English auto-complete and auto-flyTo).
    2. Click-to-report with reverse-geocoded road name and Action Card redirecting to `/report/new`.
    3. GPS coordinate parser + dialog modal with Bangkok presets (Siam, Asoke, Victory Monument, Sanam Luang).
    4. Interactive report markers with status badges, tooltips, and full sync with the community directory.
- **Fully Functional Real Report Flow (`/report/new`)**:
  - **Server-Side Submission Endpoint (`POST /api/reports`)**:
    - Strict Zod validation via `submitReportSchema`.
    - Handles anonymous citizen session resolution via Supabase Auth (`/auth/v1/signup`) or cookie session, satisfying foreign key constraints.
    - Executes via Service Role client, securely bypassing PostgreSQL trigger RLS restrictions on `public_report_features`.
    - Persists report to `reports`, media to `report_media`, initial audit event to `report_status_events`, and classification to `ai_analyses`.
  - **Leaflet Interactive Mini-Map (`location-mini-map.tsx`)**:
    - Replaced static SVG river schematic with a real interactive Leaflet map using CARTO Voyager tiles.
    - Features a draggable red target pin with ping animation; dragging the pin or clicking the map immediately triggers reverse geocoding via OpenStreetMap Nominatim with Thai language localization (`ถนน... เขต...`).
    - Added floating GPS locate-me control and zoom controls.
  - **Location Pre-fill & Confirmation Banner**:
    - When redirected from `/map` (`/report/new?lat=...&lng=...&label=...`), automatically pre-populates coordinates and displays an informative banner.
  - **Interactive Category Selector**:
    - Added a 6-card interactive grid (หลุมบ่อ, รอยแตกร้าว, ทรุดตัว, ผิวทางสึกหรอ, น้ำท่วมขัง, อื่นๆ) with icons, Thai names, and descriptions, allowing citizen choice or overriding AI classification.
  - **Public ID & UUID Lookup Compatibility**:
    - Enhanced `getPublicReport` and `/api/operations/reports/[id]/transition` to resolve reports by either UUID or human-readable tracking ID (`REP-...`), eliminating PostgreSQL `22P02 invalid input syntax for type uuid` errors.

## Demo Mode
- Run with `NEXT_PUBLIC_APP_MODE=demo` (default in `.env.local`).
- Requires **no external credentials**.
- Seeded with 20 realistic Bangkok road reports.
- All AI results labeled `[Simulated AI]`.

## Production Mode
- Set `NEXT_PUBLIC_APP_MODE=production` and configure Supabase + Roboflow + AI SDK env vars.
- Uses PostgreSQL PostGIS and RLS policies.
- Fails clearly when configuration is missing without silent mock fallback.
