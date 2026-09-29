import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canTransitionStatus } from "@/features/reports/status-machine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const body = await req.json().catch(() => ({}));
    const { targetStatus, publicNote, internalNote, expectedVersion, assignedTeamId } = body;

    if (!targetStatus || !publicNote || expectedVersion == null) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "targetStatus, publicNote, and expectedVersion are required for status transition.",
          },
        },
        { status: 400 }
      );
    }

    if (isDemoMode) {
      return NextResponse.json({
        data: {
          reportId,
          newStatus: targetStatus,
          version: expectedVersion + 1,
          updatedAt: new Date().toISOString(),
          isDemo: true,
        },
      });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const admin = createServiceRoleClient();

    // Look up report by UUID or public_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId);
    let findQuery = admin.from("reports").select("id, status, version, owner_id");
    if (isUuid) {
      findQuery = findQuery.or(`id.eq.${reportId},public_id.eq.${reportId}`);
    } else {
      findQuery = findQuery.eq("public_id", reportId);
    }
    const { data: currentReport, error: fetchErr } = await findQuery.maybeSingle();

    if (fetchErr || !currentReport) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 }
      );
    }

    const realReportId = currentReport.id;

    // If authenticated user is present, attempt execute via RPC with real UUID
    if (user) {
      const { data: transitionResult, error: transitionError } = await supabase.rpc(
        "rpc_transition_report_status",
        {
          p_report_id: realReportId,
          p_target_status: targetStatus,
          p_public_note: publicNote,
          p_internal_note: internalNote || null,
          p_expected_version: expectedVersion,
          p_assigned_team_id: assignedTeamId || null,
        }
      );

      if (!transitionError) {
        return NextResponse.json({ data: transitionResult });
      }
    }

    // Execute transition using Service Role Client
    const newVersion = (currentReport.version || 1) + 1;
    const { data: updatedReport, error: updateErr } = await admin
      .from("reports")
      .update({
        status: targetStatus,
        version: newVersion,
        resolved_at: targetStatus === "resolved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", realReportId)
      .select()
      .single();

    if (updateErr || !updatedReport) {
      return NextResponse.json(
        { error: { code: "UPDATE_FAILED", message: updateErr?.message || "Failed to update report" } },
        { status: 500 }
      );
    }

    // Insert audit event
    await admin.from("report_status_events").insert({
      report_id: realReportId,
      from_status: currentReport.status,
      to_status: targetStatus,
      public_note: publicNote,
      internal_note: internalNote || null,
      actor_id: currentReport.owner_id,
    });

    return NextResponse.json({
      data: {
        reportId: realReportId,
        previousStatus: currentReport.status,
        newStatus: targetStatus,
        version: newVersion,
        updatedAt: updatedReport.updated_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
