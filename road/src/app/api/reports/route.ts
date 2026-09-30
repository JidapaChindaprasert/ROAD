import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode, env } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { demoReportRepository } from "@/lib/repositories/demo-report-repository";
import { ReportDetail, DamageCategory, LocationSource, MediaItem, AIAnalysisResult } from "@/features/reports/types";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";

const submitReportSchema = z.object({
  draftId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  category: z
    .enum(["pothole", "crack", "surface_wear", "subsidence", "obstruction", "standing_water", "other", "uncertain"])
    .default("pothole"),
  description: z.string().optional(),
  locationContext: z.string().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().optional(),
    source: z.enum(["gps", "manual"]).default("manual"),
    capturedAt: z.string().optional(),
    localityLabel: z.string().optional(),
  }),
  media: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        thumbnailUrl: z.string().optional(),
        mimeType: z.string(),
        fileName: z.string(),
        byteSize: z.number(),
        isSanitized: z.boolean().default(true),
        createdAt: z.string().optional(),
      })
    )
    .default([]),
  aiAnalysis: z
    .object({
      provider: z.enum(["roboflow", "openai", "demo"]).default("demo"),
      model: z.string().default("road-damage-v1"),
      primaryCategory: z.enum([
        "pothole",
        "crack",
        "surface_wear",
        "subsidence",
        "obstruction",
        "standing_water",
        "other",
        "uncertain",
      ]),
      suggestedSeverity: z.enum(["low", "medium", "high", "unknown"]).default("medium"),
      confidenceScore: z.number().optional(),
      summary: z.string().default(""),
      labels: z.array(z.any()).default([]),
      needsHumanReview: z.boolean().default(false),
      imageQualityIssues: z.array(z.string()).default([]),
      isDemo: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Request body is empty or invalid JSON" } },
        { status: 400 }
      );
    }

    const parseResult = submitReportSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Submitted report data failed validation",
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const nowIso = new Date().toISOString();

    const normalizedLocation = {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracyMeters: input.location.accuracyMeters,
      source: input.location.source as LocationSource,
      capturedAt: input.location.capturedAt || nowIso,
      localityLabel: input.location.localityLabel,
    };

    const normalizedMedia: MediaItem[] = input.media.map((m) => ({
      id: m.id,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || m.url,
      mimeType: m.mimeType,
      fileName: m.fileName,
      byteSize: m.byteSize,
      isSanitized: m.isSanitized,
      createdAt: m.createdAt || nowIso,
    }));

    const normalizedAiAnalysis: AIAnalysisResult | undefined = input.aiAnalysis
      ? {
          provider: input.aiAnalysis.provider,
          model: input.aiAnalysis.model,
          primaryCategory: input.aiAnalysis.primaryCategory as DamageCategory,
          suggestedSeverity: input.aiAnalysis.suggestedSeverity,
          confidenceScore: input.aiAnalysis.confidenceScore,
          summary: input.aiAnalysis.summary,
          labels: input.aiAnalysis.labels,
          needsHumanReview: input.aiAnalysis.needsHumanReview,
          imageQualityIssues: input.aiAnalysis.imageQualityIssues,
          isDemo: input.aiAnalysis.isDemo,
        }
      : undefined;

    // Handle Demo Mode
    if (isDemoMode) {
      const authUser = await getAuthenticatedUser(req);
      const demoResult = await demoReportRepository.submitReport({
        draftId: input.draftId || `draft-${Date.now()}`,
        idempotencyKey: input.idempotencyKey || `idemp-${Date.now()}`,
        ownerId: authUser?.id || "demo-user-reporter",
        category: input.category as DamageCategory,
        description: input.description,
        locationContext: input.locationContext,
        location: normalizedLocation,
        media: normalizedMedia,
        aiAnalysis: normalizedAiAnalysis,
      });
      return NextResponse.json({ data: demoResult }, { status: 201 });
    }

    // Production Mode with Supabase
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !serviceKey || !publishableKey) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "Production Supabase credentials are not fully configured.",
          },
        },
        { status: 500 }
      );
    }

    // 1. Identify or authenticate user
    const authUser = await getAuthenticatedUser(req);
    let userId: string | null = authUser?.id || null;

    if (!userId) {
      try {
        const serverSupabase = await createServerSupabaseClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch {
        // ignore
      }
    }

    if (!userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const authCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
          });
          if (authCheck.ok) {
            const userData = await authCheck.json();
            if (userData?.id) {
              userId = userData.id;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (!userId) {
      try {
        const anonRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (anonRes.ok) {
          const anonData = await anonRes.json();
          userId = anonData?.user?.id || null;
        }
      } catch (authErr) {
        console.warn("Failed to create anonymous user:", authErr);
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: {
            code: "AUTH_REQUIRED",
            message: "Unable to establish an anonymous or authenticated user session.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Insert Report with Service Role Client (bypasses RLS trigger limitations securely)
    const admin = createServiceRoleClient();
    const publicId = `REP-${Date.now().toString(36).toUpperCase()}`;
    const pointWkt = `POINT(${normalizedLocation.longitude} ${normalizedLocation.latitude})`;

    const { data: insertedReport, error: insertError } = await admin
      .from("reports")
      .insert({
        public_id: publicId,
        owner_id: userId,
        category: input.category,
        status: "reported",
        exact_location: pointWkt,
        public_location: pointWkt,
        gps_accuracy_m: normalizedLocation.accuracyMeters,
        location_source: normalizedLocation.source,
        locality_label: normalizedLocation.localityLabel,
        location_context: input.locationContext,
        description: input.description,
        version: 1,
      })
      .select()
      .single();

    if (insertError || !insertedReport) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        {
          error: {
            code: "REPORT_INSERT_FAILED",
            message: insertError?.message || "Failed to insert report into database.",
          },
        },
        { status: 500 }
      );
    }

    // 3. Insert Initial Status Event
    await admin.from("report_status_events").insert({
      report_id: insertedReport.id,
      from_status: "reported",
      to_status: "reported",
      public_note: "แจ้งเหตุความเสียหายบนท้องถนนโดยประชาชน",
      actor_id: userId,
    });

    // 4. Attach Media if provided
    for (const m of normalizedMedia) {
      await admin.from("report_media").insert({
        owner_id: userId,
        report_id: insertedReport.id,
        private_original_path: m.url,
        sanitized_path: m.url,
        mime_type: m.mimeType,
        byte_size: m.byteSize,
        processing_state: "completed",
      });
    }

    // 5. Attach AI Analysis if provided
    if (normalizedAiAnalysis) {
      await admin.from("ai_analyses").insert({
        report_id: insertedReport.id,
        provider: normalizedAiAnalysis.provider,
        model: normalizedAiAnalysis.model,
        primary_category: normalizedAiAnalysis.primaryCategory,
        suggested_severity: normalizedAiAnalysis.suggestedSeverity,
        confidence: normalizedAiAnalysis.confidenceScore || 0.85,
        summary: normalizedAiAnalysis.summary,
        features: normalizedAiAnalysis.labels || [],
        quality_issues: normalizedAiAnalysis.imageQualityIssues,
        needs_human_review: normalizedAiAnalysis.needsHumanReview,
      });
    }

    // 6. Build and return ReportDetail
    const detail: ReportDetail = {
      id: insertedReport.id,
      publicId: insertedReport.public_id,
      title: `${input.category.toUpperCase()} at ${normalizedLocation.localityLabel || "Bangkok"}`,
      category: insertedReport.category as DamageCategory,
      publicStatus: "reported",
      detailedStatus: "reported",
      publicLatitude: normalizedLocation.latitude,
      publicLongitude: normalizedLocation.longitude,
      localityLabel: insertedReport.locality_label,
      description: insertedReport.description,
      locationContext: insertedReport.location_context,
      media: normalizedMedia,
      aiAnalysis: normalizedAiAnalysis,
      events: [
        {
          id: `evt-${Date.now()}`,
          reportId: insertedReport.id,
          fromStatus: "reported",
          toStatus: "reported",
          publicNote: "แจ้งเหตุความเสียหายบนท้องถนนโดยประชาชน",
          actorName: "Citizen Reporter",
          actorRole: "reporter",
          createdAt: nowIso,
        },
      ],
      version: 1,
      createdAt: insertedReport.created_at,
      updatedAt: insertedReport.updated_at,
      exactLocation: normalizedLocation,
      publicLocation: {
        latitude: normalizedLocation.latitude,
        longitude: normalizedLocation.longitude,
        localityLabel: normalizedLocation.localityLabel,
        isGeneralized: false,
      },
    };

    return NextResponse.json({ data: detail }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("API /api/reports uncaught error:", err);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
