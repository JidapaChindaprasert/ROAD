import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (isDemoMode) {
      const demoDraftId = `draft-${Date.now().toString(36)}`;
      return NextResponse.json({
        data: {
          id: demoDraftId,
          classificationState: "idle",
          createdAt: new Date().toISOString(),
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
            message: "Authentication is required to create a report draft.",
          },
        },
        { status: 401 }
      );
    }

    const { data: draft, error } = await supabase
      .from("report_drafts")
      .insert({
        owner_id: user.id,
        notes: body.notes || null,
        classification_state: "idle",
      })
      .select()
      .single();

    if (error || !draft) {
      return NextResponse.json(
        {
          error: {
            code: "DRAFT_CREATION_FAILED",
            message: error?.message || "Failed to create draft.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: draft }, { status: 201 });
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
