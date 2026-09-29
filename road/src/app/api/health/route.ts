import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    appName: env.NEXT_PUBLIC_APP_NAME,
    appMode: env.NEXT_PUBLIC_APP_MODE,
    aiProvider: env.AI_PROVIDER,
    timestamp: new Date().toISOString(),
  });
}
