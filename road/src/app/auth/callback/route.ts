import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || (type === "recovery" ? "/reset-password" : "/");

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error("Auth callback error exchanging code:", err);
    }
  }

  // URL to redirect to after sign in or password reset process completes
  return NextResponse.redirect(new URL(next, req.url));
}
