-- ROAD Initial Database Schema
-- Milestone 3: Production Data & Auth

-- 1. Enable PostGIS in extensions schema
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Privacy-preserving coordinate grid snap helper (approx 40 meters)
-- Latitude 1 deg ~ 111,320m. 40m ~ 0.00036 deg.
-- Longitude 1 deg ~ 111,320m * cos(lat). Around Bangkok (~13.7 deg), 40m ~ 0.00037 deg.
CREATE OR REPLACE FUNCTION snap_to_grid_40m(lon double precision, lat double precision)
RETURNS TABLE (snapped_lon double precision, snapped_lat double precision) AS $$
BEGIN
  RETURN QUERY SELECT 
    round(lon::numeric, 4)::double precision,
    round(lat::numeric, 4)::double precision;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User Roles table (Separate from profiles to prevent privilege self-escalation)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('reporter', 'staff', 'admin')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, role)
);

-- 5. Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  public_display_name TEXT NOT NULL,
  district TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Report Drafts table
CREATE TABLE IF NOT EXISTS public.report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('pothole', 'crack', 'subsidence', 'debris', 'other')),
  exact_location extensions.geography(POINT, 4326),
  gps_accuracy_m NUMERIC(6,2),
  locality_label TEXT,
  location_context TEXT,
  notes TEXT,
  classification_state TEXT NOT NULL DEFAULT 'idle' CHECK (classification_state IN ('idle', 'analyzing', 'completed', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Reports table (Core Canonical Incident Record)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('pothole', 'crack', 'subsidence', 'debris', 'other')),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (
    status IN ('reported', 'acknowledged', 'assessing', 'scheduled', 'repairing', 'resolved', 'rejected', 'duplicate')
  ),
  operational_priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    operational_priority IN ('low', 'medium', 'high', 'critical')
  ),
  -- Exact coordinates: Private, accessible only to owner and staff
  exact_location extensions.geography(POINT, 4326) NOT NULL,
  -- Public location: Snapped grid representation safe for public projection
  public_location extensions.geography(POINT, 4326) NOT NULL,
  gps_accuracy_m NUMERIC(6,2),
  location_source TEXT DEFAULT 'device' CHECK (location_source IN ('device', 'manual', 'exif')),
  location_captured_at TIMESTAMPTZ DEFAULT now(),
  locality_label TEXT,
  location_context TEXT,
  description TEXT,
  assigned_team_id UUID REFERENCES public.teams(id),
  canonical_report_id UUID REFERENCES public.reports(id),
  scheduled_for DATE,
  resolved_at TIMESTAMPTZ,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'hidden')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial indexes on reports
CREATE INDEX IF NOT EXISTS idx_reports_exact_location ON public.reports USING GIST (exact_location);
CREATE INDEX IF NOT EXISTS idx_reports_public_location ON public.reports USING GIST (public_location);
CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON public.reports (owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);

-- 8. Public Report Features (Sanitized Projection Table for Community Map)
-- Specifically separated from reports to prevent leaking owner IDs, exact GPS, or internal notes
CREATE TABLE IF NOT EXISTS public.public_report_features (
  report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  public_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  public_status TEXT NOT NULL CHECK (public_status IN ('reported', 'repairing', 'fixed', 'rejected', 'duplicate')),
  detailed_status TEXT NOT NULL,
  approximate_location extensions.geography(POINT, 4326) NOT NULL,
  approx_longitude DOUBLE PRECISION NOT NULL,
  approx_latitude DOUBLE PRECISION NOT NULL,
  locality_label TEXT,
  approved_public_summary TEXT,
  thumbnail_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Spatial index on public features
CREATE INDEX IF NOT EXISTS idx_public_features_location ON public.public_report_features USING GIST (approximate_location);
CREATE INDEX IF NOT EXISTS idx_public_features_status ON public.public_report_features (public_status);
CREATE INDEX IF NOT EXISTS idx_public_features_category ON public.public_report_features (category);

-- 9. Report Media table
CREATE TABLE IF NOT EXISTS public.report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  draft_id UUID REFERENCES public.report_drafts(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  private_original_path TEXT NOT NULL,
  sanitized_path TEXT,
  approved_public_derivative_path TEXT,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  checksum TEXT,
  processing_state TEXT NOT NULL DEFAULT 'pending' CHECK (
    processing_state IN ('pending', 'processing', 'completed', 'failed')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_media_parent CHECK (
    (draft_id IS NOT NULL AND report_id IS NULL) OR
    (draft_id IS NULL AND report_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_report_media_report_id ON public.report_media (report_id);
CREATE INDEX IF NOT EXISTS idx_report_media_draft_id ON public.report_media (draft_id);

-- 10. AI Analyses table
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES public.report_media(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.report_drafts(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'roboflow',
  model TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  prompt_version TEXT,
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_category TEXT NOT NULL,
  suggested_severity TEXT NOT NULL,
  confidence NUMERIC(4,3),
  needs_human_review BOOLEAN NOT NULL DEFAULT false,
  quality_issues JSONB DEFAULT '[]'::jsonb,
  state TEXT NOT NULL DEFAULT 'completed' CHECK (state IN ('queued', 'processing', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_report_id ON public.ai_analyses (report_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_draft_id ON public.ai_analyses (draft_id);

-- 11. Report Status Events (Append-only Audit Log & Public Timeline)
CREATE TABLE IF NOT EXISTS public.report_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  public_note TEXT NOT NULL,
  internal_note TEXT,
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_status_events_report_id ON public.report_status_events (report_id, created_at ASC);

-- 12. Report Jobs table (Durable DB-backed Background Worker Queue)
CREATE TABLE IF NOT EXISTS public.report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  draft_id UUID REFERENCES public.report_drafts(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.report_media(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  locked_by TEXT,
  last_error_code TEXT,
  deduplication_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_claim ON public.report_jobs (status, available_at) 
WHERE status = 'queued';

-- 13. Idempotency Records table
CREATE TABLE IF NOT EXISTS public.idempotency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT,
  response_reference JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_idempotency UNIQUE (user_id, operation, key)
);

-- 14. Trigger to synchronize reports with public_report_features
CREATE OR REPLACE FUNCTION sync_public_report_features()
RETURNS TRIGGER AS $$
DECLARE
  v_public_status TEXT;
  v_lon DOUBLE PRECISION;
  v_lat DOUBLE PRECISION;
BEGIN
  -- Map detailed status to 3 public groups (+ rejected/duplicate)
  IF NEW.status IN ('reported', 'acknowledged', 'assessing', 'scheduled') THEN
    v_public_status := 'reported';
  ELSIF NEW.status = 'repairing' THEN
    v_public_status := 'repairing';
  ELSIF NEW.status = 'resolved' THEN
    v_public_status := 'fixed';
  ELSIF NEW.status = 'rejected' THEN
    v_public_status := 'rejected';
  ELSIF NEW.status = 'duplicate' THEN
    v_public_status := 'duplicate';
  ELSE
    v_public_status := 'reported';
  END IF;

  v_lon := extensions.ST_X(NEW.public_location::geometry);
  v_lat := extensions.ST_Y(NEW.public_location::geometry);

  IF NEW.visibility = 'public' THEN
    INSERT INTO public.public_report_features (
      report_id,
      public_id,
      category,
      public_status,
      detailed_status,
      approximate_location,
      approx_longitude,
      approx_latitude,
      locality_label,
      approved_public_summary,
      version,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.public_id,
      NEW.category,
      v_public_status,
      NEW.status,
      NEW.public_location,
      v_lon,
      v_lat,
      NEW.locality_label,
      NEW.description,
      NEW.version,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (report_id) DO UPDATE SET
      category = EXCLUDED.category,
      public_status = EXCLUDED.public_status,
      detailed_status = EXCLUDED.detailed_status,
      approximate_location = EXCLUDED.approximate_location,
      approx_longitude = EXCLUDED.approx_longitude,
      approx_latitude = EXCLUDED.approx_latitude,
      locality_label = EXCLUDED.locality_label,
      approved_public_summary = EXCLUDED.approved_public_summary,
      version = EXCLUDED.version,
      updated_at = EXCLUDED.updated_at;
  ELSE
    -- If visibility is private or hidden, remove from public projection
    DELETE FROM public.public_report_features WHERE report_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_public_report_features ON public.reports;
CREATE TRIGGER trg_sync_public_report_features
AFTER INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION sync_public_report_features();
