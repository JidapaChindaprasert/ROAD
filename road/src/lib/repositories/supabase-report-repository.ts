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

    // Fetch report row safely (checking whether id is UUID or public_id)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from("reports").select(`
        *,
        assigned_team:teams(id, name, public_display_name)
      `);
    if (isUuid) {
      query = query.or(`id.eq.${id},public_id.eq.${id}`);
    } else {
      query = query.eq("public_id", id);
    }
    const { data: report, error } = await query.maybeSingle();

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
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: reports } = await supabase
          .from("reports")
          .select(
            `
            *,
            assigned_team:teams(id, name, public_display_name)
          `
          )
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (reports && reports.length > 0) {
          return reports.map((r) => {
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
      }
    } catch {
      // Continue to public reports fallback
    }

    // Fallback for operations triage queue: load available public reports
    const publicSummaries = await this.listPublicReports({ limit: 50 });
    return publicSummaries.map((s) => ({
      ...s,
      exactLocation: {
        latitude: s.publicLatitude,
        longitude: s.publicLongitude,
        source: "manual",
        capturedAt: s.createdAt,
        localityLabel: s.localityLabel,
      },
      publicLocation: {
        latitude: s.publicLatitude,
        longitude: s.publicLongitude,
        localityLabel: s.localityLabel,
        isGeneralized: false,
      },
      media: [],
      events: [],
      version: 1,
    }));
  }

  async submitReport(input: SubmitReportInput): Promise<ReportDetail> {
    const supabase = this.getClient();
    let authToken = "";

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        authToken = session.access_token;
      } else {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        if (anonData.session?.access_token) {
          authToken = anonData.session.access_token;
        }
      }
    } catch {
      // Continue to /api/reports which auto-creates anonymous session if needed
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch("/api/reports", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || "Failed to submit report. Please try again.");
    }

    const json = await response.json();
    return json.data as ReportDetail;
  }

  async transitionReport(input: TransitionStatusInput): Promise<ReportDetail> {
    const supabase = this.getClient();
    let authToken = "";
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        authToken = session.access_token;
      }
    } catch {
      // Continue
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const res = await fetch(`/api/operations/reports/${input.reportId}/transition`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || "Failed to update report status.");
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
