import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { DEMO_AUTH_COOKIE } from "@/lib/auth/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    if (!isDemoMode) {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    }

    const res = NextResponse.json({ data: { success: true } });
    res.cookies.delete(DEMO_AUTH_COOKIE);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sign out";
    return NextResponse.json(
      { error: { code: "SIGN_OUT_FAILED", message } },
      { status: 500 }
    );
  }
}
