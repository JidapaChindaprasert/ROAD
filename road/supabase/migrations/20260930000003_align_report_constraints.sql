-- ROAD Migration: Align Report Constraints and AI Analyses Columns
-- Allows all frontend DamageCategory types and location sources (including 'gps')

-- 1. Update category check constraint on public.reports
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_category_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_category_check CHECK (
  category IN (
    'pothole',
    'crack',
    'subsidence',
    'debris',
    'surface_wear',
    'obstruction',
    'standing_water',
    'other',
    'uncertain'
  )
);

-- 2. Update category check constraint on public.report_drafts
ALTER TABLE public.report_drafts DROP CONSTRAINT IF EXISTS report_drafts_category_check;
ALTER TABLE public.report_drafts ADD CONSTRAINT report_drafts_category_check CHECK (
  category IS NULL OR category IN (
    'pothole',
    'crack',
    'subsidence',
    'debris',
    'surface_wear',
    'obstruction',
    'standing_water',
    'other',
    'uncertain'
  )
);

-- 3. Update location_source check constraint on public.reports
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_location_source_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_location_source_check CHECK (
  location_source IN ('gps', 'device', 'manual', 'exif')
);

-- 4. Add summary and features columns to public.ai_analyses if not exist
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
