import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface JobPayload {
  kind: "sanitize_media" | "classify_damage";
  draftId?: string;
  reportId?: string;
  mediaId?: string;
  deduplicationKey?: string;
}

export interface JobRecord {
  id: string;
  kind: string;
  draft_id?: string | null;
  report_id?: string | null;
  media_id?: string | null;
  status: "queued" | "running" | "completed" | "failed" | "dead_letter";
  attempts: number;
  max_attempts: number;
  available_at: string;
  locked_until?: string | null;
  locked_by?: string | null;
  last_error_code?: string | null;
  deduplication_key?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Enqueue a durable database job with deduplication
 */
export async function enqueueJob(payload: JobPayload): Promise<string> {
  const supabase = createServiceRoleClient();
  const dedupKey =
    payload.deduplicationKey ||
    `${payload.kind}:${payload.reportId || payload.draftId || ""}:${payload.mediaId || ""}`;

  const { data, error } = await supabase
    .from("report_jobs")
    .upsert(
      {
        kind: payload.kind,
        draft_id: payload.draftId || null,
        report_id: payload.reportId || null,
        media_id: payload.mediaId || null,
        status: "queued",
        deduplication_key: dedupKey,
        attempts: 0,
        available_at: new Date().toISOString(),
      },
      { onConflict: "deduplication_key" }
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to enqueue job: ${error?.message || "Unknown error"}`);
  }

  return data.id;
}

/**
 * Claims a batch of available jobs using lease locking and bounded retries
 */
export async function claimJobs(
  workerId: string,
  batchSize = 5,
  leaseDurationSeconds = 60
): Promise<JobRecord[]> {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const leaseExpiration = new Date(now.getTime() + leaseDurationSeconds * 1000).toISOString();
  const nowIso = now.toISOString();

  // Find candidate jobs: status = queued and available_at <= now, OR running with expired lease
  const { data: candidates, error: findError } = await supabase
    .from("report_jobs")
    .select("*")
    .or(`status.eq.queued,and(status.eq.running,locked_until.lt.${nowIso})`)
    .lte("available_at", nowIso)
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (findError || !candidates || candidates.length === 0) {
    return [];
  }

  const claimed: JobRecord[] = [];

  for (const job of candidates) {
    // Attempt lease lock on candidate job
    const { data: updated, error: lockError } = await supabase
      .from("report_jobs")
      .update({
        status: "running",
        locked_by: workerId,
        locked_until: leaseExpiration,
        attempts: job.attempts + 1,
        updated_at: nowIso,
      })
      .eq("id", job.id)
      .eq("status", job.status) // Concurrency check
      .select()
      .single();

    if (!lockError && updated) {
      claimed.push(updated as JobRecord);
    }
  }

  return claimed;
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("report_jobs")
    .update({
      status: "completed",
      locked_until: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

/**
 * Mark job as failed with exponential backoff, or transition to dead_letter if max attempts reached
 */
export async function failJob(job: JobRecord, errorCode: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const nextAttempts = job.attempts;
  const isDeadLetter = nextAttempts >= job.max_attempts;

  // Exponential backoff: 2^attempts * 10 seconds
  const backoffSeconds = Math.min(3600, Math.pow(2, nextAttempts) * 10);
  const nextAvailableAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

  await supabase
    .from("report_jobs")
    .update({
      status: isDeadLetter ? "dead_letter" : "queued",
      last_error_code: errorCode.substring(0, 100),
      locked_until: null,
      locked_by: null,
      available_at: isDeadLetter ? null : nextAvailableAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}
