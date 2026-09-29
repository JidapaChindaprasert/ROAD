import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runWorkerCycle } from "@/lib/jobs/worker";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("x-worker-secret");
    const configuredSecret = env.WORKER_SECRET || process.env.WORKER_SECRET;

    // Enforce server-side secret authentication if configured
    if (configuredSecret) {
      const token = authHeader?.replace(/^Bearer\s+/i, "");
      if (token !== configuredSecret) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Invalid or missing worker secret.",
            },
          },
          { status: 403 }
        );
      }
    }

    const summary = await runWorkerCycle();
    return NextResponse.json({
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Worker processing error";
    return NextResponse.json(
      {
        error: {
          code: "WORKER_CYCLE_FAILED",
          message,
        },
      },
      { status: 500 }
    );
  }
}
