-- ROAD Migration: Allow Public Viewing of Reports and Repair Timeline
-- Allows all users (authenticated and anonymous visitors) to view public reports, media, and status

-- 1. Reports Policy: Allow public viewing of reports
DROP POLICY IF EXISTS "Owners can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Anyone can view public reports" ON public.reports;

CREATE POLICY "Anyone can view public reports"
ON public.reports FOR SELECT
TO anon, authenticated
USING (visibility = 'public');

-- 2. Report Media Policy: Allow public viewing of evidence photos attached to public reports
DROP POLICY IF EXISTS "Owners can view own media" ON public.report_media;
DROP POLICY IF EXISTS "Anyone can view media for public reports" ON public.report_media;

CREATE POLICY "Anyone can view media for public reports"
ON public.report_media FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM public.reports 
    WHERE reports.id = report_media.report_id AND reports.visibility = 'public'
  )
);

-- 3. AI Analyses Policy: Allow public viewing of AI classification for public reports
DROP POLICY IF EXISTS "Owners can view AI analysis for own reports" ON public.ai_analyses;
DROP POLICY IF EXISTS "Anyone can view AI analysis for public reports" ON public.ai_analyses;

CREATE POLICY "Anyone can view AI analysis for public reports"
ON public.ai_analyses FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reports 
    WHERE reports.id = ai_analyses.report_id AND reports.visibility = 'public'
  ) OR
  EXISTS (
    SELECT 1 FROM public.report_drafts 
    WHERE report_drafts.id = ai_analyses.draft_id AND report_drafts.owner_id = auth.uid()
  )
);
