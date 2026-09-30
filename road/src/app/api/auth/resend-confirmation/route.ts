import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode, env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid email address." } },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Demo Mode
    if (isDemoMode) {
      return NextResponse.json({
        data: { message: `Demo Mode: Verification email simulated for ${email}` },
      });
    }

    // Production Mode with Supabase
    const supabase = await createServerSupabaseClient();
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json(
        {
          error: {
            code: "RESEND_FAILED",
            message: error.message || "Failed to resend confirmation email.",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: { message: `Confirmation email has been resent to ${email}` },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error resending email";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
