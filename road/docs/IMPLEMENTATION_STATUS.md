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
  - Multi-provider AI architecture supporting `custom_yolo` (`yolo11s-road-v1` with `best_v3.pt`), `roboflow`, and transparent simulated demo fallback.
  - Server-side proxy ensuring credentials (`YOLO_API_TOKEN`, `ROBOFLOW_API_KEY`) never leak to client browser bundles.
  - Seamless multipart forwarding of image buffers and data URLs to the local/self-hosted FastAPI vision microservice.
  - Strict structured schema output with categories (`pothole`, `crack`, `subsidence`, `surface_wear`, `obstruction`, etc.), bounding boxes, severity, confidence score, and review flags.
  - Dedicated adapter `src/features/ai/custom-yolo-adapter.ts` with comprehensive unit test coverage (`tests/unit/custom-yolo-adapter.test.ts`).
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
  - **Simplified Zero-Friction Step 1 (Photo Only)**:
    - Removed manual damage category cards as requested. Citizens now simply upload/drop the photo; the system automatically detects and sets the damage category via AI analysis without burdening the user with multiple choices.
  - **Public ID & UUID Lookup Compatibility**:
    - Enhanced `getPublicReport` and `/api/operations/reports/[id]/transition` to resolve reports by either UUID or human-readable tracking ID (`REP-...`), eliminating PostgreSQL `22P02 invalid input syntax for type uuid` errors.

### Milestone 7 — User Authentication, Role Verification & Back-office Staff Management ✅
- **Public Registration Role Isolation**:
  - Public registration (`POST /api/auth/sign-up`) is strictly locked to citizen `reporter` role; self-elevation to staff or admin is prevented at both schema validation and database trigger levels.
  - Removed role pickers from citizen registration forms; clearly marked as citizen account for incident submission and tracking.
- **Back-office Staff & Admin Management ("หลังบ้าน")**:
  - **Admin API (`GET /api/admin/users`, `POST /api/admin/users`)**: Enforces `requireRole(['admin'])` server boundary. Allows verified district administrators to view user directories, promote citizens to maintenance staff (`staff`) or administrators (`admin`), and revoke operational permissions.
  - **Admin Back-office Console (`/admin`)**: Executive Thai & English dashboard for user and staff access control with user search, role filtering, and 1-click role mutation controls.
  - Navigation links to Admin Console and Operations Console are conditionally displayed only to users with verified `admin` or `staff` permissions.
- **Privacy & Exact Coordinate Scoping (SKILL.md §13.1)**:
  - Exact GPS coordinates (`report.exactLocation`) are strictly restricted on both server API (`/api/reports/[id]`) and UI views to the report owner (`user.id === report.ownerId`) and authorized municipal staff (`isStaff`).
  - General public visitors receive snapped/generalized coordinates (~40m grid) with transparent privacy disclosure indicators.
  - Reports in detail view display verified badges: "รายงานของคุณ (Author)" for the creator and "เจ้าหน้าที่ปฏิบัติการ (Staff View)" for crew members.
- **Database Triggers & Migration**:
  - `20260930000002_user_auth_and_roles_triggers.sql`: Automatically creates `public.profiles` and assigns default `reporter` role on `auth.users` insert. Includes secure PostgreSQL function `public.assign_user_role(...)`.
- **Mode Boundary Preservation**:
  - Interactive role switcher is strictly gated to demo mode (`isDemoMode`). In production mode, role switching is forbidden and disabled, with direct database verification via `public.user_roles`.

### Milestone 8 — Email Verification & Report Submission Alignment ✅
- **Email Confirmation Screen & Flow**:
  - Dedicated `email_confirmation` view in both `AuthModal` and `/login` page.
  - Explains in Thai and English that a verification link was sent to the user's email, highlights the email address, and advises checking Spam/Junk folders.
  - Includes a "Resend Email" button calling `POST /api/auth/resend-confirmation` with a 60-second cooldown timer.
- **Unconfirmed Sign-In Interception**:
  - `POST /api/auth/sign-in` checks for unconfirmed email errors from Supabase and returns an explicit `EMAIL_NOT_CONFIRMED` code.
  - Client automatically navigates to the email confirmation screen with the email pre-populated.
- **Report Submission Auth Gate & Guidance**:
  - `/report/new` displays citizen authentication status at the top of the wizard.
  - If unauthenticated in production mode, displays an informative banner and guides the user to sign in before submission so reports appear in their "My Reports" history.
  - Submission button displays "เข้าสู่ระบบเพื่อส่งรายงาน (Sign In to Submit)" when not logged in.
- **Database Schema & Insert Alignment**:
  - `supabase/migrations/20260930000003_align_report_constraints.sql`: Aligns PostgreSQL constraints for `location_source` (accepting `'gps'`, `'device'`, `'manual'`, `'exif'`) and `category` (accepting all 9 damage categories).
  - Aligned `POST /api/reports` to ensure resilient mapping of categories, location source (`gps` -> `device`), and columns inserted into `ai_analyses`.

### Milestone 9 — Forgot Password, OTP Email Verification & Operations Role Scoping ✅
- **Dynamic Origin URL Resolution**:
  - Implemented `getAppUrl` in `src/lib/auth/get-app-url.ts` to dynamically resolve the client origin and host headers. Eliminates `localhost` connection refused errors when confirming emails or resetting passwords from remote devices or LAN IPs.
- **Direct OTP/Token Verification for Email Confirmation**:
  - Added `POST /api/auth/verify-email`: Users can directly input their 6-8 digit verification token into the UI, bypassing broken external localhost link redirection on mobile phones.
  - Enhanced email confirmation screen with inline status alerts and editable email input.
- **Forgot Password System**:
  - Created `POST /api/auth/forgot-password` and `POST /api/auth/update-password`.
  - Added "ลืมรหัสผ่าน?" tab in `AuthModal` and `/login` page with automated email dispatch.
  - Created dedicated `/reset-password` page with password validation, strength checks, and recovery flow.
- **Strict Operations Console Role Protection**:
  - Hid `/operations` link from mobile navigation (`MobileNavigation`) for non-staff citizens (`reporter`).
  - Added strict authorization boundary in `ReportQueue`: non-staff visitors see a polite, human Thai access denied screen redirecting them to "My Reports".
### Milestone 10 — Responsive Navigation & Community Map Layout Polish ✅
- **Community Damage Map Filter Bar & View Mode Toggle Responsiveness**:
  - Refactored `MapFilters` (`src/features/map/components/map-filters.tsx`) layout from rigid `sm:` breakpoints to fluid `md:` and `lg:` adaptive flex rows.
  - Category dropdown now scales with `flex-1 min-w-0 truncate` on mobile devices, ensuring it never collides or forces sibling controls off-screen.
  - Map / List toggle button group now features explicit `shrink-0`, matching `h-10` control height, centered icons and labels, and standard `role="tablist"` / `role="tab"` ARIA accessibility.
  - Status filter pill list now smoothly scrolls horizontally (`overflow-x-auto no-scrollbar`) on narrow phone screens (320px - 390px) without line breaking or wrapping into the report counter.
- **Tablet & Mobile Navbar Overlap Resolution**:
  - Fixed tablet navigation collision in `AppHeader` (`src/components/layout/app-header.tsx`) where user profile pills previously collided with desktop navigation links (`Overview`, `Community Map`, `My Reports`).
  - Set horizontal navigation links to `hidden lg:flex` (1024px+), reserving clean navbar space on tablet screens (768px - 1023px).
  - Added a responsive mobile & tablet Hamburger menu button (`lg:hidden`) next to the brand logo, with an accessible slide-down drawer containing all navigation links, mode indicators, and quick-report actions.
  - Optimized the user profile widget: constrained pill width (`shrink-0`), hidden redundant inline email on tablet (`hidden xl:inline`), and retained 1-click email copying in the user dropdown.
  - Eliminated syntax anomalies and cascading render warnings, achieving a 100% clean `npm run lint`, `npm run typecheck`, and `npm run test` pass rate.

### Milestone 11 — My Reports User Isolation & Privacy Scoping ✅
- **User-Scoped Report Fetching**:
  - **Root Cause**: In `SupabaseReportRepository`, `listMyReports()` previously had a fallback querying up to 50 public reports whenever a user had 0 submitted reports or lacked an active session. In addition, `DemoReportRepository` returned all 20 mock reports indiscriminately.
  - **Strict Ownership Filtering**:
    - Updated `IReportRepository.listMyReports(userId?: string)` interface across demo and production repositories.
    - In `SupabaseReportRepository`: Scoped queries strictly to `owner_id = targetUserId`. Removed the public reports fallback completely, guaranteeing that reports belonging to other citizens are never leaked into `/my-reports`.
    - In `DemoReportRepository`: Scoped demo reports strictly to matching `r.ownerId === userId`.
  - **Contextual Empty States in `/my-reports`**:
    - **Guest / Unauthenticated Visitors**: Displays a clean empty state with a "Sign In to View Reports" button triggering `openAuthModal("signin")`.
    - **New Citizen Users (0 Reports)**: Displays "You haven't reported any road damage yet" with a primary action button guiding the user directly to `/report/new`.
    - Fixed React 19 / ESLint cascading render warnings (`react-hooks/set-state-in-effect`) by deriving empty guest states and avoiding synchronous state setting inside `useEffect`.

### Milestone 12 — Password Recovery & Resend Sandbox Resilience ✅
- **Root Cause of "Error sending recovery email"**:
  - In Supabase Production, Custom SMTP was configured with Resend (Free Tier). Resend's free tier policy requires a verified custom domain to send emails to external recipients. Without domain verification, Resend strictly allows sending only to the email of the Resend account owner (`jidapa.fw@gmail.com`).
  - When any other citizen or tester (e.g. `earn05869@gmail.com`) requested a password reset, Resend rejected SMTP dispatch with a 403 error, causing Supabase GoTrue to return `HTTP 500: "Error sending recovery email"`.
- **Resilient Server-Side Admin Fallback**:
  - Updated `POST /api/auth/forgot-password`: When Supabase's mailer fails with `"Error sending recovery email"` (or any SMTP delivery failure), the server automatically falls back to the Supabase Admin Service Role API (`/auth/v1/admin/generate_link`).
  - Generates the cryptographically signed `action_link` and 8-digit OTP recovery code (`email_otp`) without relying on external SMTP delivery.
- **Direct 1-Click UI Reset & OTP Support**:
  - Enhanced `LoginPage` and `AuthModal`: When email delivery is restricted by the sandbox, the UI immediately presents an instant 1-click **"คลิกเพื่อตั้งรหัสผ่านใหม่ทันที (Reset Password Now)"** button, the recovery OTP code, and an informative status badge explaining the sandbox restriction.
  - Enhanced `POST /api/auth/update-password` and `/reset-password`: Added support for OTP recovery verification via `supabase.auth.verifyOtp({ type: 'recovery' })` and automatic hash fragment session synchronization.

## Demo Mode
- Run with `NEXT_PUBLIC_APP_MODE=demo` (default in `.env.local`).
- Requires **no external credentials**.
- Seeded with 20 realistic Bangkok road reports.
- All AI results labeled `[Simulated AI]`.

## Production Mode
- Set `NEXT_PUBLIC_APP_MODE=production` and configure Supabase + custom YOLO (`AI_PROVIDER=custom_yolo`).
- Uses PostgreSQL PostGIS and RLS policies.
- **Zero-Cost Production Setup**: Documented in `docs/FREE_PRODUCTION_GUIDE.md` (Vercel Hobby + Hugging Face Spaces / Render + Supabase Free + OpenFreeMap = $0.00/month).

- Fails clearly when configuration is missing without silent mock fallback.
