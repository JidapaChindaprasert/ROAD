import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/auth/get-app-url";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "กรุณาระบุที่อยู่อีเมลที่ถูกต้อง" } },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Demo Mode
    if (isDemoMode) {
      return NextResponse.json({
        data: { message: `จำลองการส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${email} เรียบร้อยแล้ว (Demo Mode)` },
      });
    }

    // Production Mode with Supabase
    const supabase = await createServerSupabaseClient();
    const appUrl = getAppUrl(req);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      const errMsg = error.message || "";
      let userFriendlyMessage = errMsg;

      if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("60 seconds")) {
        userFriendlyMessage = "ส่งคำขอถี่เกินไป กรุณารอ 60 วินาทีก่อนกดขอใหม่อีกครั้ง";
      }

      return NextResponse.json(
        {
          error: {
            code: "RESET_REQUEST_FAILED",
            message: userFriendlyMessage || "ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        message: `ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยัง ${email} แล้ว กรุณาตรวจสอบกล่องข้อความของคุณ`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error processing forgot password request";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
