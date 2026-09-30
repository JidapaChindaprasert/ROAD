import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || (type === "recovery" ? "/reset-password" : "/");

  try {
    const supabase = await createServerSupabaseClient();

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
    }
  } catch (err) {
    console.error("Auth callback error during verification:", err);
  }

  // URL to redirect to after sign in or password reset process completes
  return NextResponse.redirect(new URL(next, req.url));
}
