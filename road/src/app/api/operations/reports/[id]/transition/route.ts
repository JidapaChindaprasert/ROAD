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

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to execute staff operations.",
          },
        },
        { status: 401 }
      );
    }

    // Call atomic transactional RPC function
    const { data: transitionResult, error: transitionError } = await supabase.rpc(
      "rpc_transition_report_status",
      {
        p_report_id: reportId,
        p_target_status: targetStatus,
        p_public_note: publicNote,
        p_internal_note: internalNote || null,
        p_expected_version: expectedVersion,
        p_assigned_team_id: assignedTeamId || null,
      }
    );

    if (transitionError) {
      const isConcurrency = transitionError.code === "23505";
      const isForbidden = transitionError.code === "42501";

      return NextResponse.json(
        {
          error: {
            code: isConcurrency
              ? "CONCURRENCY_CONFLICT"
              : isForbidden
              ? "FORBIDDEN"
              : "TRANSITION_FAILED",
            message: transitionError.message,
          },
        },
        { status: isConcurrency ? 409 : isForbidden ? 403 : 400 }
      );
    }

    return NextResponse.json({ data: transitionResult });
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
