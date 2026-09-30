import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { demoReportRepository } from "@/lib/repositories/demo-report-repository";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { mapDbReportToDetail, DbReportRow } from "@/lib/supabase/dto-mappers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Missing incident identifier" } },
        { status: 404 }
      );
    }

    // Demo Mode Handler
    if (isDemoMode) {
      const demoReport = await demoReportRepository.getPublicReport(id);
      if (!demoReport) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: `Incident ${id} not found.` } },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: demoReport });
    }

    // Production Mode with Supabase
    const admin = createServiceRoleClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = admin.from("reports").select(`
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
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Incident ${id} not found.` } },
        { status: 404 }
      );
    }

    // Fetch related timeline events
    const { data: events } = await admin
      .from("report_status_events")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: true });

    // Fetch related media
    const { data: media } = await admin
      .from("report_media")
      .select("*")
      .eq("report_id", report.id);

    // Fetch AI analysis
    const { data: aiList } = await admin
      .from("ai_analyses")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: false })
      .limit(1);

    // Extract coordinates safely
    let publicLng = 100.5018;
    let publicLat = 13.7563;
    if (report.public_location && typeof report.public_location === "object" && Array.isArray(report.public_location.coordinates)) {
      publicLng = report.public_location.coordinates[0];
      publicLat = report.public_location.coordinates[1];
    }

    const reportRow: DbReportRow = {
      ...report,
      public_longitude: publicLng,
      public_latitude: publicLat,
      exact_longitude: report.exact_location?.coordinates?.[0] ?? publicLng,
      exact_latitude: report.exact_location?.coordinates?.[1] ?? publicLat,
    };

    const detail = mapDbReportToDetail(reportRow, {
      events: events || [],
      media: media || [],
      aiAnalysis: aiList?.[0] || null,
      publicUrlResolver: (path) => {
        if (!path) return "";
        if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
        const { data } = admin.storage.from("report-evidence").getPublicUrl(path);
        return data.publicUrl;
      },
    });

    return NextResponse.json({ data: detail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
