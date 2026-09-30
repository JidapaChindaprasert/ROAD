-- ROAD Migration: Allow Cascading Deletion of Auth Users
-- Ensures that when a user is deleted from auth.users (either via Supabase Dashboard, SQL, or Admin API),
-- their related records in reports, media, and roles are safely cascaded or set to null without foreign key constraint errors.

-- 1. Update reports.owner_id foreign key to ON DELETE CASCADE
ALTER TABLE public.reports 
  DROP CONSTRAINT IF EXISTS reports_owner_id_fkey;

ALTER TABLE public.reports 
  ADD CONSTRAINT reports_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Update report_media.owner_id foreign key to ON DELETE CASCADE
ALTER TABLE public.report_media 
  DROP CONSTRAINT IF EXISTS report_media_owner_id_fkey;

ALTER TABLE public.report_media 
  ADD CONSTRAINT report_media_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Update report_status_events.actor_id foreign key to ON DELETE SET NULL
-- (Keeps audit history intact while removing user reference)
ALTER TABLE public.report_status_events 
  DROP CONSTRAINT IF EXISTS report_status_events_actor_id_fkey;

ALTER TABLE public.report_status_events 
  ADD CONSTRAINT report_status_events_actor_id_fkey 
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Update user_roles.assigned_by foreign key to ON DELETE SET NULL
ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;

ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Update reports.canonical_report_id foreign key to ON DELETE SET NULL
ALTER TABLE public.reports 
  DROP CONSTRAINT IF EXISTS reports_canonical_report_id_fkey;

ALTER TABLE public.reports 
  ADD CONSTRAINT reports_canonical_report_id_fkey 
  FOREIGN KEY (canonical_report_id) REFERENCES public.reports(id) ON DELETE SET NULL;

