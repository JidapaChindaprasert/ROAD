import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { MediaItem } from "@/features/reports/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "video/mp4",
  "video/webm",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No file provided in form data." } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "File exceeds 25MB limit." } },
        { status: 413 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_TYPE",
            message: `Unsupported file type ${file.type}. Allowed: JPG, PNG, WebP, MP4.`,
          },
        },
        { status: 415 }
      );
    }

    const supabase = createServiceRoleClient();
    const fileExt = file.name.split(".").pop() || "jpg";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `uploads/${uniqueId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("report-evidence")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: { code: "STORAGE_ERROR", message: uploadError.message } },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("report-evidence")
      .getPublicUrl(filePath);

    const mediaItem: MediaItem = {
      id: uniqueId,
      url: publicUrlData.publicUrl,
      thumbnailUrl: publicUrlData.publicUrl,
      mimeType: file.type,
      fileName: file.name,
      byteSize: file.size,
      isSanitized: true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ data: mediaItem });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Media upload failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
