import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    return NextResponse.json({
      data: {
        user,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve session";
    return NextResponse.json(
      { error: { code: "AUTH_CHECK_FAILED", message } },
      { status: 500 }
    );
  }
}
