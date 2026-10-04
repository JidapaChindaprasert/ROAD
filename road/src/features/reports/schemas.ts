import { z } from "zod";

export const DamageCategorySchema = z.enum([
  "pothole",
  "crack",
  "surface_wear",
  "subsidence",
  "obstruction",
  "standing_water",
  "other",
  "uncertain",
]);

export const ReportStatusSchema = z.enum([
  "reported",
  "acknowledged",
  "assessing",
  "scheduled",
  "repairing",
  "resolved",
  "rejected",
  "duplicate",
]);

export const PublicStatusSchema = z.enum(["reported", "repairing", "fixed"]);

export const SuggestedSeveritySchema = z.enum(["low", "medium", "high", "unknown"]);

export const OperationalPrioritySchema = z.enum(["p1", "p2", "p3", "p4"]);

export const LocationSourceSchema = z.enum(["gps", "manual"]);

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const ClassificationLabelSchema = z.object({
  category: DamageCategorySchema,
  score: z.number().min(0).max(1).optional(),
  boundingBox: BoundingBoxSchema.optional(),
});

export const AIAnalysisResultSchema = z.object({
  provider: z.enum(["roboflow", "custom_yolo", "openai", "demo"]),
  model: z.string(),
  labels: z.array(ClassificationLabelSchema),
  primaryCategory: DamageCategorySchema,
  suggestedSeverity: SuggestedSeveritySchema,
  summary: z.string(),
  needsHumanReview: z.boolean(),
  imageQualityIssues: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1).optional(),
  isDemo: z.boolean().optional(),
});

export const ReportLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().optional(),
  source: LocationSourceSchema,
  capturedAt: z.string(),
  localityLabel: z.string().optional(),
});

export const MediaItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string(),
  fileName: z.string(),
  byteSize: z.number().positive(),
  isSanitized: z.boolean(),
  createdAt: z.string(),
});

export const SubmitReportSchema = z.object({
  draftId: z.string().uuid().or(z.string()),
  idempotencyKey: z.string().min(1),
  category: DamageCategorySchema.optional(),
  description: z.string().max(1000).optional(),
  locationContext: z.string().max(200).optional(),
  location: ReportLocationSchema,
  media: z.array(MediaItemSchema).min(1, "Please provide at least one photo or video."),
  aiAnalysis: AIAnalysisResultSchema.optional(),
});

export const TransitionStatusSchema = z.object({
  reportId: z.string(),
  targetStatus: ReportStatusSchema,
  publicNote: z.string().min(1, "Public note is required."),
  internalNote: z.string().optional(),
  expectedVersion: z.number().int().nonnegative(),
  scheduledFor: z.string().optional(),
  resolutionEvidenceUrl: z.string().url().optional().or(z.literal("")),
});
