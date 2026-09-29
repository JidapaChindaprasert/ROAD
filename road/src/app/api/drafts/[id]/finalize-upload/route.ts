import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/lib/jobs/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params;
    const body = await req.json().catch(() => ({}));
    const { storagePath, mimeType, byteSize } = body;

    if (!storagePath || !mimeType || !byteSize) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "storagePath, mimeType, and byteSize are required to finalize an upload.",
          },
        },
        { status: 400 }
      );
    }

    if (isDemoMode) {
      return NextResponse.json({
        data: {
          mediaId: `med-demo-${Date.now()}`,
          draftId,
          processingState: "completed",
          sanitized: true,
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
            message: "Authentication required to finalize upload.",
          },
        },
        { status: 401 }
      );
    }

    // Verify storage object path begins with user ID
    if (!storagePath.startsWith(`private/${user.id}/`)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Storage path does not match your authorized user namespace.",
          },
        },
        { status: 403 }
      );
    }

    // Insert media record
    const { data: media, error: mediaError } = await supabase
      .from("report_media")
      .insert({
        owner_id: user.id,
        draft_id: draftId,
        private_original_path: storagePath,
        mime_type: mimeType,
        byte_size: byteSize,
        processing_state: "pending",
      })
      .select("id")
      .single();

    if (mediaError || !media) {
      return NextResponse.json(
        {
          error: {
            code: "MEDIA_CREATION_FAILED",
            message: mediaError?.message || "Failed to record media object.",
          },
        },
        { status: 500 }
      );
    }

    // Enqueue durable sanitization job
    const jobId = await enqueueJob({
      kind: "sanitize_media",
      draftId,
      mediaId: media.id,
    });

    return NextResponse.json({
      data: {
        mediaId: media.id,
        draftId,
        jobId,
        processingState: "queued",
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
