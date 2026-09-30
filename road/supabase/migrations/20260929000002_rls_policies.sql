-- ROAD Row-Level Security (RLS) Policies
-- Milestone 3: Production Data & Auth

-- 1. Helper security functions
CREATE OR REPLACE FUNCTION public.is_staff(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role IN ('staff', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_report_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. User Roles Policies
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Only admins can insert or modify roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5. Teams Policies
CREATE POLICY "Anyone can view active teams"
ON public.teams FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Only admins can modify teams"
ON public.teams FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 6. Report Drafts Policies
CREATE POLICY "Owners can view own drafts"
ON public.report_drafts FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own drafts"
ON public.report_drafts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own drafts"
ON public.report_drafts FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own drafts"
ON public.report_drafts FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- 7. Reports Policies
CREATE POLICY "Anyone can view public reports"
ON public.reports FOR SELECT
TO anon, authenticated
USING (visibility = 'public');

CREATE POLICY "Staff can view all reports"
ON public.reports FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Authenticated users can submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only staff can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8. Public Report Features Policies
-- Anyone (anon and authenticated) can view public map features
CREATE POLICY "Public can view all public report features"
ON public.public_report_features FOR SELECT
TO anon, authenticated
USING (true);

-- 9. Report Media Policies
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

CREATE POLICY "Staff can view all report media"
ON public.report_media FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Owners can upload report media"
ON public.report_media FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- 10. AI Analyses Policies
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

CREATE POLICY "Staff can view all AI analyses"
ON public.ai_analyses FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 11. Report Status Events Policies
CREATE POLICY "Public can view public status events"
ON public.report_status_events FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reports 
    WHERE reports.id = report_status_events.report_id AND reports.visibility = 'public'
  )
);

CREATE POLICY "Staff can insert status events"
ON public.report_status_events FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- 12. Idempotency Records Policies
CREATE POLICY "Users can manage own idempotency records"
ON public.idempotency_records FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 13. Report Jobs Policies (No direct client access; backend worker uses service role)
-- By default with RLS enabled and no policies, client access is completely denied.
