-- ROAD Migration: Automated Profile and Role Creation on User Sign-Up
-- Enforces that all public user sign-ups strictly receive the 'reporter' role.
-- Staff and Admin roles can only be granted in the backend by administrators.

-- 1. Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_display_name TEXT;
BEGIN
  -- Extract display name from metadata or fallback to email prefix
  extracted_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Citizen Reporter'
  );

  -- 1. Create Profile row
  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    extracted_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = now();

  -- 2. Create User Role (Strictly 'reporter' for all public registrations)
  INSERT INTO public.user_roles (
    user_id,
    role,
    assigned_at
  ) VALUES (
    NEW.id,
    'reporter',
    now()
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Secure backend role assignment function (Callable by Admins / Service Role)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id UUID,
  target_role TEXT,
  action_type TEXT DEFAULT 'assign'
)
RETURNS JSONB AS $$
DECLARE
  calling_user_id UUID;
  caller_is_admin BOOLEAN;
BEGIN
  calling_user_id := auth.uid();

  -- Check if caller is admin or service_role
  IF calling_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = calling_user_id AND role = 'admin'
    ) INTO caller_is_admin;

    IF NOT caller_is_admin THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can grant or revoke roles.';
    END IF;
  END IF;

  -- Validate role parameter
  IF target_role NOT IN ('reporter', 'staff', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', target_role;
  END IF;

  IF action_type = 'assign' THEN
    INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
    VALUES (target_user_id, target_role, now(), calling_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN jsonb_build_object(
      'success', true,
      'message', format('Role %s assigned to user %s', target_role, target_user_id)
    );
  ELSIF action_type = 'remove' THEN
    IF target_role = 'reporter' THEN
      RAISE EXCEPTION 'Cannot revoke basic citizen reporter status.';
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = target_role;

    RETURN jsonb_build_object(
      'success', true,
      'message', format('Role %s revoked from user %s', target_role, target_user_id)
    );
  ELSE
    RAISE EXCEPTION 'Invalid action_type: %', action_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
