import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params;
    const body = await req.json().catch(() => ({}));
    const { fileName, mimeType, byteSize } = body;

    if (!fileName || !mimeType || !byteSize) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "fileName, mimeType, and byteSize are required to generate an upload intent.",
          },
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: `Unsupported mime type: ${mimeType}. Allowed formats: JPG, PNG, WebP, MP4.`,
          },
        },
        { status: 415 }
      );
    }

    if (byteSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `File exceeds maximum 10MB limit.`,
          },
        },
        { status: 413 }
      );
    }

    if (isDemoMode) {
      const demoPath = `demo/drafts/${draftId}/${Date.now()}-${fileName}`;
      return NextResponse.json({
        data: {
          destinationPath: demoPath,
          uploadUrl: `/api/demo/upload-mock?path=${encodeURIComponent(demoPath)}`,
          expiresInSeconds: 900,
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
            message: "Authentication required to generate upload intent.",
          },
        },
        { status: 401 }
      );
    }

    // Verify draft ownership
    const { data: draft, error: draftError } = await supabase
      .from("report_drafts")
      .select("id, owner_id")
      .eq("id", draftId)
      .single();

    if (draftError || !draft || draft.owner_id !== user.id) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Draft not found or you are not authorized to upload to it.",
          },
        },
        { status: 403 }
      );
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destinationPath = `private/${user.id}/${draftId}/${Date.now()}-${safeFileName}`;

    // Create signed upload URL
    const { data: signedUpload, error: signError } = await supabase.storage
      .from("report-evidence")
      .createSignedUploadUrl(destinationPath);

    if (signError || !signedUpload) {
      return NextResponse.json(
        {
          error: {
            code: "STORAGE_ERROR",
            message: signError?.message || "Failed to create signed upload URL.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        destinationPath,
        signedUrl: signedUpload.signedUrl,
        token: signedUpload.token,
        expiresInSeconds: 900,
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
