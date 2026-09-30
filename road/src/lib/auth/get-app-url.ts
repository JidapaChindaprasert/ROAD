import { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Returns the resolved public application URL.
 * Prioritizes the incoming request origin/host headers so that if the user
 * is accessing through a remote tunnel, LAN IP, or alternative port,
 * redirect links generated for Supabase Auth point to the user's actual host.
 */
export function getAppUrl(req?: NextRequest): string {
  if (req) {
    const origin = req.headers.get("origin");
    if (origin && origin !== "null") return origin;

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;

    try {
      if (req.nextUrl?.origin && req.nextUrl.origin !== "null") {
        return req.nextUrl.origin;
      }
    } catch {
      // ignore
    }
  }

  return env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
