import {
  ReportSummary,
  ReportDetail,
  DamageCategory,
  ReportStatus,
  PublicStatus,
  OperationalPriority,
  TimelineEvent,
  MediaItem,
  AIAnalysisResult,
  ClassificationLabel,
  SuggestedSeverity,
} from "@/features/reports/types";

export interface DbPublicFeatureRow {
  report_id: string;
  public_id: string;
  category: string;
  public_status: string;
  detailed_status: string;
  approx_longitude?: number;
  approx_latitude?: number;
  longitude?: number;
  latitude?: number;
  locality_label?: string | null;
  approved_public_summary?: string | null;
  thumbnail_url?: string | null;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface DbReportRow {
  id: string;
  public_id: string;
  owner_id: string;
  category: string;
  status: string;
  operational_priority: string;
  gps_accuracy_m?: number | null;
  location_source?: string | null;
  location_captured_at?: string | null;
  locality_label?: string | null;
  location_context?: string | null;
  description?: string | null;
  scheduled_for?: string | null;
  resolved_at?: string | null;
  canonical_report_id?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  assigned_team_id?: string | null;
  assigned_team?: {
    id: string;
    name: string;
    public_display_name: string;
  } | null;
  // Extracted coordinates
  public_longitude: number;
  public_latitude: number;
  exact_longitude?: number | null;
  exact_latitude?: number | null;
}

export interface DbTimelineEventRow {
  id: string;
  report_id: string;
  from_status?: string | null;
  to_status: string;
  public_note: string;
  internal_note?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  scheduled_for?: string | null;
  resolution_evidence_url?: string | null;
  created_at: string;
}

export interface DbMediaRow {
  id: string;
  private_original_path: string;
  sanitized_path?: string | null;
  approved_public_derivative_path?: string | null;
  mime_type: string;
  byte_size: number;
  created_at: string;
}

export interface DbAiAnalysisRow {
  provider: string;
  model: string;
  labels: unknown;
  primary_category: string;
  suggested_severity: string;
  confidence?: number | null;
  needs_human_review: boolean;
  quality_issues?: unknown;
  summary?: string | null;
}

/** Map Public Feature row into Public ReportSummary */
export function mapDbFeatureToSummary(row: DbPublicFeatureRow): ReportSummary {
  const lon = row.longitude ?? row.approx_longitude ?? 100.5018;
  const lat = row.latitude ?? row.approx_latitude ?? 13.7563;
  const category = (row.category || "other") as DamageCategory;

  return {
    id: row.report_id,
    publicId: row.public_id,
    title: row.approved_public_summary || `${category.toUpperCase()} at ${row.locality_label || "Bangkok"}`,
    category,
    publicStatus: (row.public_status || "reported") as PublicStatus,
    detailedStatus: (row.detailed_status || "reported") as ReportStatus,
    publicLongitude: lon,
    publicLatitude: lat,
    localityLabel: row.locality_label || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    operationalPriority: "p3",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map Detailed Report row into ReportDetail, strictly enforcing privacy rules */
export function mapDbReportToDetail(
  reportRow: DbReportRow,
  options: {
    currentUserId?: string | null;
    isStaff?: boolean;
    events?: DbTimelineEventRow[];
    media?: DbMediaRow[];
    aiAnalysis?: DbAiAnalysisRow | null;
    publicUrlResolver?: (path: string) => string;
  } = {}
): ReportDetail {
  const { currentUserId, isStaff = false, events = [], media = [], aiAnalysis, publicUrlResolver } = options;
  const isOwner = Boolean(currentUserId && currentUserId === reportRow.owner_id);
  const isPrivileged = isOwner || isStaff;

  const category = (reportRow.category || "other") as DamageCategory;
  const status = (reportRow.status || "reported") as ReportStatus;

  let publicStatus: PublicStatus = "reported";
  if (status === "repairing") publicStatus = "repairing";
  else if (status === "resolved") publicStatus = "fixed";

  // Map Timeline Events (Strips internal notes unless privileged staff)
  const mappedEvents: TimelineEvent[] = events.map((ev) => ({
    id: ev.id,
    reportId: ev.report_id,
    fromStatus: ev.from_status ? (ev.from_status as ReportStatus) : undefined,
    toStatus: ev.to_status as ReportStatus,
    publicNote: ev.public_note,
    internalNote: isStaff ? (ev.internal_note || undefined) : undefined,
    actorName: ev.actor_name || (isStaff ? "Municipal Operations Staff" : "Operations Crew"),
    actorRole: (ev.actor_role as "staff" | "admin" | "reporter") || "staff",
    scheduledFor: ev.scheduled_for || undefined,
    resolutionEvidenceUrl: ev.resolution_evidence_url || undefined,
    createdAt: ev.created_at,
  }));

  // Map Media Items
  const mappedMedia: MediaItem[] = media.map((m) => {
    const rawPath = isPrivileged
      ? m.sanitized_path || m.private_original_path
      : m.approved_public_derivative_path || m.sanitized_path || m.private_original_path;
    const url = publicUrlResolver ? publicUrlResolver(rawPath) : rawPath;

    return {
      id: m.id,
      url,
      thumbnailUrl: url,
      mimeType: m.mime_type,
      fileName: `evidence-${m.id.substring(0, 8)}`,
      byteSize: Number(m.byte_size),
      isSanitized: Boolean(m.sanitized_path),
      createdAt: m.created_at,
    };
  });

  // Map AI Analysis
  let mappedAi: AIAnalysisResult | undefined = undefined;
  if (aiAnalysis) {
    mappedAi = {
      provider: (aiAnalysis.provider as "roboflow" | "custom_yolo" | "openai" | "demo") || "custom_yolo",
      model: aiAnalysis.model,
      labels: Array.isArray(aiAnalysis.labels) ? (aiAnalysis.labels as ClassificationLabel[]) : [],
      primaryCategory: (aiAnalysis.primary_category || category) as DamageCategory,
      suggestedSeverity: (aiAnalysis.suggested_severity || "medium") as SuggestedSeverity,
      summary: aiAnalysis.summary || "AI Analysis Complete",
      needsHumanReview: Boolean(aiAnalysis.needs_human_review),
      imageQualityIssues: Array.isArray(aiAnalysis.quality_issues) ? (aiAnalysis.quality_issues as string[]) : [],
      confidenceScore: aiAnalysis.confidence ? Number(aiAnalysis.confidence) : undefined,
      isDemo: false,
    };
  }

  const priority = (reportRow.operational_priority || "p3") as OperationalPriority;

  return {
    id: reportRow.id,
    publicId: reportRow.public_id,
    title: `${category.toUpperCase()} at ${reportRow.locality_label || "Bangkok"}`,
    category,
    publicStatus,
    detailedStatus: status,
    publicLongitude: reportRow.public_longitude,
    publicLatitude: reportRow.public_latitude,
    localityLabel: reportRow.locality_label || undefined,
    thumbnailUrl: mappedMedia[0]?.thumbnailUrl,
    operationalPriority: priority,
    createdAt: reportRow.created_at,
    updatedAt: reportRow.updated_at,
    description: reportRow.description || undefined,
    locationContext: reportRow.location_context || undefined,
    ownerId: isPrivileged ? reportRow.owner_id : undefined,
    exactLocation:
      isPrivileged && reportRow.exact_longitude != null && reportRow.exact_latitude != null
        ? {
            longitude: reportRow.exact_longitude,
            latitude: reportRow.exact_latitude,
            accuracyMeters: reportRow.gps_accuracy_m ? Number(reportRow.gps_accuracy_m) : undefined,
            source: (reportRow.location_source as "gps" | "manual") || "gps",
            capturedAt: reportRow.location_captured_at || reportRow.created_at,
            localityLabel: reportRow.locality_label || undefined,
          }
        : undefined,
    publicLocation: {
      longitude: reportRow.public_longitude,
      latitude: reportRow.public_latitude,
      localityLabel: reportRow.locality_label || undefined,
      isGeneralized: true,
    },
    media: mappedMedia,
    aiAnalysis: mappedAi,
    events: mappedEvents,
    assignedTeam: reportRow.assigned_team
      ? {
          id: reportRow.assigned_team.id,
          name: reportRow.assigned_team.name,
          publicDisplayName: reportRow.assigned_team.public_display_name,
        }
      : undefined,
    scheduledFor: reportRow.scheduled_for || undefined,
    resolvedAt: reportRow.resolved_at || undefined,
    canonicalReportId: reportRow.canonical_report_id || undefined,
    version: reportRow.version,
  };
}
