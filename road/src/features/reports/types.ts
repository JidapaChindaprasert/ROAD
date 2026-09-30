export type DamageCategory =
  | "pothole"
  | "crack"
  | "surface_wear"
  | "subsidence"
  | "obstruction"
  | "standing_water"
  | "other"
  | "uncertain";

export type ReportStatus =
  | "reported"
  | "acknowledged"
  | "assessing"
  | "scheduled"
  | "repairing"
  | "resolved"
  | "rejected"
  | "duplicate";

export type PublicStatus = "reported" | "repairing" | "fixed";

export type SuggestedSeverity = "low" | "medium" | "high" | "unknown";

export type OperationalPriority = "p1" | "p2" | "p3" | "p4";

export type LocationSource = "gps" | "manual";

export type ClassificationState =
  | "none"
  | "uploading"
  | "queued"
  | "analyzing"
  | "completed"
  | "low_certainty"
  | "unavailable"
  | "failed";

export type UserRole = "reporter" | "staff" | "admin";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClassificationLabel {
  category: DamageCategory;
  score?: number;
  boundingBox?: BoundingBox;
}

export interface AIAnalysisResult {
  provider: "roboflow" | "openai" | "demo";
  model: string;
  labels: ClassificationLabel[];
  primaryCategory: DamageCategory;
  suggestedSeverity: SuggestedSeverity;
  summary: string;
  needsHumanReview: boolean;
  imageQualityIssues: string[];
  confidenceScore?: number;
  isDemo?: boolean;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: LocationSource;
  capturedAt: string;
  localityLabel?: string;
}

export interface PublicLocation {
  latitude: number;
  longitude: number;
  localityLabel?: string;
  isGeneralized: boolean;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
  isSanitized: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  reportId: string;
  fromStatus?: ReportStatus;
  toStatus: ReportStatus;
  publicNote: string;
  internalNote?: string;
  actorName: string;
  actorRole: UserRole;
  scheduledFor?: string;
  resolutionEvidenceUrl?: string;
  createdAt: string;
}

export interface ReportSummary {
  id: string;
  publicId: string;
  title: string;
  category: DamageCategory;
  publicStatus: PublicStatus;
  detailedStatus: ReportStatus;
  publicLatitude: number;
  publicLongitude: number;
  localityLabel?: string;
  thumbnailUrl?: string;
  operationalPriority?: OperationalPriority;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDetail extends ReportSummary {
  ownerId?: string;
  description?: string;
  locationContext?: string;
  exactLocation?: ReportLocation;
  publicLocation: PublicLocation;
  media: MediaItem[];
  aiAnalysis?: AIAnalysisResult;
  events: TimelineEvent[];
  assignedTeam?: {
    id: string;
    name: string;
    publicDisplayName: string;
  };
  scheduledFor?: string;
  resolvedAt?: string;
  canonicalReportId?: string;
  version: number;
}

export interface CreateReportDraftInput {
  description?: string;
  locationContext?: string;
  location?: ReportLocation;
  mediaIds?: string[];
}

export interface SubmitReportInput {
  draftId: string;
  idempotencyKey: string;
  ownerId?: string;
  category?: DamageCategory;
  description?: string;
  locationContext?: string;
  location: ReportLocation;
  media: MediaItem[];
  aiAnalysis?: AIAnalysisResult;
}

export interface TransitionStatusInput {
  reportId: string;
  targetStatus: ReportStatus;
  publicNote: string;
  internalNote?: string;
  expectedVersion: number;
  scheduledFor?: string;
  resolutionEvidenceUrl?: string;
  operationalPriority?: OperationalPriority;
  assignedTeam?: {
    id: string;
    name: string;
    publicDisplayName: string;
  };
  canonicalReportId?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapFilterState {
  publicStatus?: PublicStatus | "all";
  category?: DamageCategory | "all";
  timeRange?: "all" | "7d" | "30d" | "90d";
  searchQuery?: string;
}
