import { claimJobs, completeJob, failJob, enqueueJob, JobRecord } from "./queue";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { validateMediaBuffer, stripJpegExif } from "@/lib/media/sanitizer";
import { classifyWithRoboflow } from "@/features/ai/roboflow-adapter";

export interface WorkerRunSummary {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Runs a single worker processing cycle
 */
export async function runWorkerCycle(workerId = `worker-${Date.now()}`): Promise<WorkerRunSummary> {
  const jobs = await claimJobs(workerId, 5);
  const summary: WorkerRunSummary = {
    processed: jobs.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const job of jobs) {
    try {
      await processSingleJob(job);
      await completeJob(job.id);
      summary.succeeded++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown worker error";
      await failJob(job, message);
      summary.failed++;
      summary.errors.push(`Job ${job.id} (${job.kind}) failed: ${message}`);
    }
  }

  return summary;
}

async function processSingleJob(job: JobRecord): Promise<void> {
  const supabase = createServiceRoleClient();

  if (job.kind === "sanitize_media") {
    if (!job.media_id) throw new Error("Missing media_id in sanitize_media job");

    // Fetch media record
    const { data: media, error: mediaError } = await supabase
      .from("report_media")
      .select("*")
      .eq("id", job.media_id)
      .single();

    if (mediaError || !media) throw new Error("Media record not found");

    // Download original private file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("report-evidence")
      .download(media.private_original_path);

    if (downloadError || !fileBlob) throw new Error(`Download failed: ${downloadError?.message}`);

    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    // Validate signature & bounds
    const validation = validateMediaBuffer(buffer, media.mime_type);
    if (!validation.isValid) {
      throw new Error(`Sanitization validation failed: ${validation.error}`);
    }

    // Strip EXIF metadata for JPEGs
    const sanitizedBuffer = media.mime_type === "image/jpeg" ? stripJpegExif(buffer) : buffer;

    // Upload sanitized file
    const sanitizedPath = `sanitized/${media.private_original_path.replace(/^\w+\//, "")}`;
    const { error: uploadError } = await supabase.storage
      .from("report-evidence")
      .upload(sanitizedPath, sanitizedBuffer, {
        contentType: validation.mimeType || media.mime_type,
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload sanitized failed: ${uploadError.message}`);

    // Update media record
    await supabase
      .from("report_media")
      .update({
        sanitized_path: sanitizedPath,
        processing_state: "completed",
      })
      .eq("id", media.id);

    // Enqueue classification job for the sanitized media
    await enqueueJob({
      kind: "classify_damage",
      draftId: job.draft_id || undefined,
      reportId: job.report_id || undefined,
      mediaId: media.id,
    });
  } else if (job.kind === "classify_damage") {
    if (!job.media_id) throw new Error("Missing media_id in classify_damage job");

    // Fetch media record
    const { data: media, error: mediaError } = await supabase
      .from("report_media")
      .select("*")
      .eq("id", job.media_id)
      .single();

    if (mediaError || !media) throw new Error("Media record not found");

    // Get public/signed URL for model inference
    const targetPath = media.sanitized_path || media.private_original_path;
    const { data: signedData, error: signedError } = await supabase.storage
      .from("report-evidence")
      .createSignedUrl(targetPath, 300);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`Failed to generate signed URL for inference: ${signedError?.message}`);
    }

    // Run Roboflow classification
    const classification = await classifyWithRoboflow({
      imageUrl: signedData.signedUrl,
      confidenceThreshold: 0.4,
    });

    // Record AI Analysis
    await supabase.from("ai_analyses").insert({
      media_id: media.id,
      draft_id: job.draft_id,
      report_id: job.report_id,
      provider: "roboflow",
      model: classification.model,
      labels: classification.labels,
      primary_category: classification.primaryCategory,
      suggested_severity: classification.suggestedSeverity,
      confidence: classification.confidenceScore || null,
      needs_human_review: classification.needsHumanReview,
      state: "completed",
      completed_at: new Date().toISOString(),
    });
  } else {
    throw new Error(`Unknown job kind: ${job.kind}`);
  }
}
