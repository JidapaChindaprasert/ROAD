import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const body = await req.json().catch(() => ({}));
    const { assignedTeamId, operationalPriority, canonicalReportId } = body;

    if (isDemoMode) {
      return NextResponse.json({
        data: {
          reportId,
          assignedTeamId,
          operationalPriority,
          canonicalReportId,
          updatedAt: new Date().toISOString(),
          isDemo: true,
        },
      });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to assign team or priority.",
          },
        },
        { status: 401 }
      );
    }

    // Verify staff role
    const { data: isStaff } = await supabase.rpc("is_staff", { user_uuid: user.id });
    if (!isStaff) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only authorized municipal staff can perform assignments.",
          },
        },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (assignedTeamId !== undefined) updatePayload.assigned_team_id = assignedTeamId;
    if (operationalPriority !== undefined) updatePayload.operational_priority = operationalPriority;
    if (canonicalReportId !== undefined) updatePayload.canonical_report_id = canonicalReportId;

    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update(updatePayload)
      .eq("id", reportId)
      .select()
      .single();

    if (updateError || !updatedReport) {
      return NextResponse.json(
        {
          error: {
            code: "UPDATE_FAILED",
            message: updateError?.message || "Failed to update report assignment.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedReport });
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

export const PATCH = POST;
