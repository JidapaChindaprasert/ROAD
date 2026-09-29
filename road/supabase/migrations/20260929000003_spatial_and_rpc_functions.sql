-- ROAD Spatial Queries & RPC Functions
-- Milestone 3: Production Data & Auth

-- 1. Bounded Viewport Spatial Query Function (Public Safe)
CREATE OR REPLACE FUNCTION public.rpc_reports_in_bounds(
  min_lon DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lon DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  filter_status TEXT[] DEFAULT NULL,
  filter_category TEXT[] DEFAULT NULL,
  page_limit INT DEFAULT 100
)
RETURNS TABLE (
  report_id UUID,
  public_id TEXT,
  category TEXT,
  public_status TEXT,
  detailed_status TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  locality_label TEXT,
  approved_public_summary TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_envelope extensions.geometry;
BEGIN
  -- Construct bounding box envelope in WGS84 (SRID 4326)
  v_envelope := extensions.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326);

  RETURN QUERY
  SELECT 
    f.report_id,
    f.public_id,
    f.category,
    f.public_status,
    f.detailed_status,
    f.approx_longitude AS longitude,
    f.approx_latitude AS latitude,
    f.locality_label,
    f.approved_public_summary,
    f.thumbnail_url,
    f.created_at,
    f.updated_at
  FROM public.public_report_features f
  WHERE 
    extensions.ST_Intersects(f.approximate_location::geometry, v_envelope)
    AND (filter_status IS NULL OR f.public_status = ANY(filter_status))
    AND (filter_category IS NULL OR f.category = ANY(filter_category))
  ORDER BY f.created_at DESC
  LIMIT LEAST(page_limit, 250);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.rpc_reports_in_bounds TO anon, authenticated;

-- 2. Public-Safe Report Detail Query (Excludes private owner ID, exact coordinates, and internal notes)
CREATE OR REPLACE FUNCTION public.rpc_get_public_report_detail(p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
  v_report_row RECORD;
  v_timeline JSONB;
  v_ai_summary JSONB;
  v_result JSONB;
BEGIN
  -- Look up report by UUID or public_id
  SELECT 
    r.id,
    r.public_id,
    r.category,
    r.status,
    r.operational_priority,
    extensions.ST_X(r.public_location::geometry) AS lon,
    extensions.ST_Y(r.public_location::geometry) AS lat,
    r.locality_label,
    r.location_context,
    r.description,
    r.scheduled_for,
    r.resolved_at,
    r.version,
    r.created_at,
    r.updated_at
  INTO v_report_row
  FROM public.reports r
  WHERE (r.id::text = p_identifier OR r.public_id = p_identifier)
    AND r.visibility = 'public';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Collect public timeline events (Internal notes omitted)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'fromStatus', e.from_status,
      'toStatus', e.to_status,
      'note', e.public_note,
      'createdAt', e.created_at
    ) ORDER BY e.created_at ASC
  )
  INTO v_timeline
  FROM public.report_status_events e
  WHERE e.report_id = v_report_row.id;

  -- Collect approved AI summary if available
  SELECT jsonb_build_object(
    'primaryCategory', a.primary_category,
    'suggestedSeverity', a.suggested_severity,
    'confidence', a.confidence,
    'needsHumanReview', a.needs_human_review,
    'qualityIssues', a.quality_issues
  )
  INTO v_ai_summary
  FROM public.ai_analyses a
  WHERE a.report_id = v_report_row.id
  ORDER BY a.created_at DESC
  LIMIT 1;

  -- Assemble sanitized public detail response
  v_result := jsonb_build_object(
    'id', v_report_row.id,
    'publicId', v_report_row.public_id,
    'category', v_report_row.category,
    'status', v_report_row.status,
    'operationalPriority', v_report_row.operational_priority,
    'location', jsonb_build_object(
      'longitude', v_report_row.lon,
      'latitude', v_report_row.lat,
      'localityLabel', v_report_row.locality_label,
      'locationContext', v_report_row.location_context
    ),
    'description', v_report_row.description,
    'scheduledFor', v_report_row.scheduled_for,
    'resolvedAt', v_report_row.resolved_at,
    'version', v_report_row.version,
    'createdAt', v_report_row.created_at,
    'updatedAt', v_report_row.updated_at,
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'aiAnalysis', v_ai_summary
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_get_public_report_detail TO anon, authenticated;

-- 3. Transactional Status Transition RPC Function
CREATE OR REPLACE FUNCTION public.rpc_transition_report_status(
  p_report_id UUID,
  p_target_status TEXT,
  p_public_note TEXT,
  p_internal_note TEXT DEFAULT NULL,
  p_expected_version INT DEFAULT 1,
  p_assigned_team_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current RECORD;
  v_actor_id UUID;
  v_new_version INT;
BEGIN
  v_actor_id := auth.uid();

  -- Verify caller has staff or admin role
  IF NOT public.is_staff(v_actor_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Only authorized municipal staff can transition report status'
      USING ERRCODE = '42501';
  END IF;

  -- Lock row FOR UPDATE to prevent race conditions
  SELECT id, status, version, owner_id INTO v_current
  FROM public.reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;

  -- Optimistic concurrency check
  IF v_current.version != p_expected_version THEN
    RAISE EXCEPTION 'CONCURRENCY_CONFLICT: Report was modified by another operator (expected version %, found %)',
      p_expected_version, v_current.version
      USING ERRCODE = '23505';
  END IF;

  -- Validate transition rules
  -- allowed:
  -- reported -> acknowledged, assessing, rejected, duplicate
  -- acknowledged -> assessing, scheduled, rejected
  -- assessing -> scheduled, repairing, rejected
  -- scheduled -> repairing, assessing
  -- repairing -> resolved, assessing
  -- resolved -> assessing (reopening)
  IF NOT (
    (v_current.status = 'reported' AND p_target_status IN ('acknowledged', 'assessing', 'rejected', 'duplicate')) OR
    (v_current.status = 'acknowledged' AND p_target_status IN ('assessing', 'scheduled', 'rejected')) OR
    (v_current.status = 'assessing' AND p_target_status IN ('scheduled', 'repairing', 'rejected')) OR
    (v_current.status = 'scheduled' AND p_target_status IN ('repairing', 'assessing')) OR
    (v_current.status = 'repairing' AND p_target_status IN ('resolved', 'assessing')) OR
    (v_current.status = 'resolved' AND p_target_status = 'assessing') OR
    (v_current.status = p_target_status)
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot transition from % to %', v_current.status, p_target_status
      USING ERRCODE = '22000';
  END IF;

  v_new_version := v_current.version + 1;

  -- Update report
  UPDATE public.reports SET
    status = p_target_status,
    version = v_new_version,
    assigned_team_id = COALESCE(p_assigned_team_id, assigned_team_id),
    resolved_at = CASE WHEN p_target_status = 'resolved' THEN now() ELSE resolved_at END,
    updated_at = now()
  WHERE id = p_report_id;

  -- Append audit event
  INSERT INTO public.report_status_events (
    report_id,
    from_status,
    to_status,
    public_note,
    internal_note,
    actor_id,
    created_at
  ) VALUES (
    p_report_id,
    v_current.status,
    p_target_status,
    p_public_note,
    p_internal_note,
    v_actor_id,
    now()
  );

  RETURN jsonb_build_object(
    'reportId', p_report_id,
    'previousStatus', v_current.status,
    'newStatus', p_target_status,
    'version', v_new_version,
    'updatedAt', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_transition_report_status TO authenticated;
