import { IReportRepository } from "./report-repository";
import {
  ReportSummary,
  ReportDetail,
  SubmitReportInput,
  TransitionStatusInput,
  MapBounds,
  MapFilterState,
  MediaItem,
} from "@/features/reports/types";
import { createClient } from "@/lib/supabase/client";
import {
  mapDbFeatureToSummary,
  mapDbReportToDetail,
  DbPublicFeatureRow,
  DbReportRow,
} from "@/lib/supabase/dto-mappers";

export class SupabaseReportRepository implements IReportRepository {
  private getClient() {
    return createClient();
  }

  async listPublicReports(params?: {
    bounds?: MapBounds;
    filters?: MapFilterState;
    limit?: number;
  }): Promise<ReportSummary[]> {
    const supabase = this.getClient();
    const limit = params?.limit || 100;

    if (params?.bounds) {
      const { west, south, east, north } = params.bounds;
      const statusFilter =
        params.filters?.publicStatus && params.filters.publicStatus !== "all"
          ? [params.filters.publicStatus]
          : null;
      const categoryFilter =
        params.filters?.category && params.filters.category !== "all"
          ? [params.filters.category]
          : null;

      const { data, error } = await supabase.rpc("rpc_reports_in_bounds", {
        min_lon: west,
        min_lat: south,
        max_lon: east,
        max_lat: north,
        filter_status: statusFilter,
        filter_category: categoryFilter,
        page_limit: limit,
      });

      if (error) {
        throw new Error(`Failed to query bounded reports from Supabase: ${error.message}`);
      }

      return (data as DbPublicFeatureRow[] || []).map(mapDbFeatureToSummary);
    }

    // Default query on public_report_features
    let query = supabase
      .from("public_report_features")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params?.filters?.publicStatus && params.filters.publicStatus !== "all") {
      query = query.eq("public_status", params.filters.publicStatus);
    }
    if (params?.filters?.category && params.filters.category !== "all") {
      query = query.eq("category", params.filters.category);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to query public report features: ${error.message}`);
    }

    return (data as DbPublicFeatureRow[] || []).map(mapDbFeatureToSummary);
  }

  async getPublicReport(id: string): Promise<ReportDetail | null> {
    const supabase = this.getClient();

    // Check user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch report row
    const { data: report, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        assigned_team:teams(id, name, public_display_name)
      `
      )
      .or(`id.eq.${id},public_id.eq.${id}`)
      .single();

    if (error || !report) {
      // Fall back to public RPC if standard query fails (e.g. anon user)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "rpc_get_public_report_detail",
        { p_identifier: id }
      );
      if (rpcError || !rpcData) return null;
      return rpcData as ReportDetail;
    }

    // Fetch related timeline events
    const { data: events } = await supabase
      .from("report_status_events")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: true });

    // Fetch related media
    const { data: media } = await supabase
      .from("report_media")
      .select("*")
      .eq("report_id", report.id);

    // Fetch AI analysis
    const { data: aiList } = await supabase
      .from("ai_analyses")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const reportRow: DbReportRow = {
      ...report,
      public_longitude: report.public_location?.coordinates?.[0] ?? 100.5018,
      public_latitude: report.public_location?.coordinates?.[1] ?? 13.7563,
      exact_longitude: report.exact_location?.coordinates?.[0],
      exact_latitude: report.exact_location?.coordinates?.[1],
    };

    return mapDbReportToDetail(reportRow, {
      currentUserId: user?.id,
      events: events || [],
      media: media || [],
      aiAnalysis: aiList?.[0] || null,
      publicUrlResolver: (path) => {
        const { data } = supabase.storage.from("report-evidence").getPublicUrl(path);
        return data.publicUrl;
      },
    });
  }

  async listMyReports(): Promise<ReportDetail[]> {
    const supabase = this.getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: reports, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        assigned_team:teams(id, name, public_display_name)
      `
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    return (reports || []).map((r) => {
      const reportRow: DbReportRow = {
        ...r,
        public_longitude: r.public_location?.coordinates?.[0] ?? 100.5018,
        public_latitude: r.public_location?.coordinates?.[1] ?? 13.7563,
        exact_longitude: r.exact_location?.coordinates?.[0],
        exact_latitude: r.exact_location?.coordinates?.[1],
      };
      return mapDbReportToDetail(reportRow, {
        currentUserId: user.id,
      });
    });
  }

  async submitReport(input: SubmitReportInput): Promise<ReportDetail> {
    const supabase = this.getClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // If user is not authenticated, sign in anonymously or require auth
    if (!user) {
      const { data: anonAuth, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !anonAuth.user) {
        throw new Error("Authentication required to submit report: " + (authError?.message || ""));
      }
      user = anonAuth.user;
    }

    const publicId = `REP-${Date.now().toString(36).toUpperCase()}`;
    const pointWkt = `POINT(${input.location.longitude} ${input.location.latitude})`;

    // Insert Report
    const { data: insertedReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        public_id: publicId,
        owner_id: user.id,
        category: input.category || "pothole",
        status: "reported",
        exact_location: pointWkt,
        public_location: pointWkt,
        gps_accuracy_m: input.location.accuracyMeters,
        location_source: input.location.source,
        locality_label: input.location.localityLabel,
        location_context: input.locationContext,
        description: input.description,
        version: 1,
      })
      .select()
      .single();

    if (insertError || !insertedReport) {
      throw new Error(`Failed to insert report: ${insertError?.message || "Unknown error"}`);
    }

    // Insert Initial Timeline Event
    await supabase.from("report_status_events").insert({
      report_id: insertedReport.id,
      from_status: "reported",
      to_status: "reported",
      public_note: "Road hazard incident submitted by citizen reporter.",
      actor_id: user.id,
    });

    // Attach Media if provided
    for (const m of input.media) {
      await supabase.from("report_media").insert({
        owner_id: user.id,
        report_id: insertedReport.id,
        private_original_path: m.url,
        sanitized_path: m.url,
        mime_type: m.mimeType,
        byte_size: m.byteSize,
        processing_state: "completed",
      });
    }

    // Attach AI Analysis if provided
    if (input.aiAnalysis) {
      await supabase.from("ai_analyses").insert({
        report_id: insertedReport.id,
        provider: input.aiAnalysis.provider,
        model: input.aiAnalysis.model,
        labels: input.aiAnalysis.labels,
        primary_category: input.aiAnalysis.primaryCategory,
        suggested_severity: input.aiAnalysis.suggestedSeverity,
        confidence: input.aiAnalysis.confidenceScore,
        needs_human_review: input.aiAnalysis.needsHumanReview,
        quality_issues: input.aiAnalysis.imageQualityIssues,
        state: "completed",
      });
    }

    const detail = await this.getPublicReport(insertedReport.id);
    if (!detail) {
      throw new Error("Report created but could not retrieve details.");
    }
    return detail;
  }

  async transitionReport(input: TransitionStatusInput): Promise<ReportDetail> {
    const supabase = this.getClient();

    const { error } = await supabase.rpc("rpc_transition_report_status", {
      p_report_id: input.reportId,
      p_target_status: input.targetStatus,
      p_public_note: input.publicNote,
      p_internal_note: input.internalNote || null,
      p_expected_version: input.expectedVersion,
    });

    if (error) {
      throw new Error(`Status transition failed: ${error.message}`);
    }

    const updated = await this.getPublicReport(input.reportId);
    if (!updated) {
      throw new Error("Status updated but failed to reload report.");
    }
    return updated;
  }

  async uploadMedia(file: File): Promise<MediaItem> {
    const supabase = this.getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${user?.id || "anonymous"}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("report-evidence")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("report-evidence").getPublicUrl(filePath);

    return {
      id: fileName,
      url: data.publicUrl,
      thumbnailUrl: data.publicUrl,
      mimeType: file.type,
      fileName: file.name,
      byteSize: file.size,
      isSanitized: true,
      createdAt: new Date().toISOString(),
    };
  }
}
