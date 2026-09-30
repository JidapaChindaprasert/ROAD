import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const verifySchema = z.object({
  email: z.string().email("Invalid email format"),
  token: z.string().min(1, "Verification code or token is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "กรุณาระบุอีเมลและรหัสยืนยัน (Token)" } },
        { status: 400 }
      );
    }

    const { email, token } = parsed.data;

    // Demo Mode
    if (isDemoMode) {
      return NextResponse.json({
        data: {
          message: "ยืนยันอีเมลสำเร็จเรียบร้อยแล้ว (Demo Mode)",
          user: { id: "demo-user", email, displayName: "Citizen Reporter", role: "reporter" },
        },
      });
    }

    // Production Mode with Supabase verifyOtp
    const supabase = await createServerSupabaseClient();

    // 1. Try verifyOtp with type: 'signup'
    let { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    // 2. If 'signup' fails, try type: 'email'
    if (error) {
      const fallback = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error || !data?.user) {
      return NextResponse.json(
        {
          error: {
            code: "VERIFICATION_FAILED",
            message: "รหัสยืนยันไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจสอบรหัสในอีเมลของคุณอีกครั้ง",
          },
        },
        { status: 400 }
      );
    }

    const verifiedUser = await getAuthenticatedUser();
    return NextResponse.json({
      data: {
        message: "ยืนยันอีเมลสำเร็จเรียบร้อยแล้ว บัญชีของคุณพร้อมใช้งาน",
        user: verifiedUser || {
          id: data.user.id,
          email: data.user.email || email,
          displayName: data.user.user_metadata?.display_name || email.split("@")[0],
          role: "reporter",
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error verifying email";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
