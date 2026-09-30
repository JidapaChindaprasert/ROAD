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
      console.warn("resetPasswordForEmail failed, attempting service role link fallback:", errMsg);

      // Attempt fallback via admin API if service role key is available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (serviceRoleKey && supabaseUrl) {
        try {
          const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              type: "recovery",
              email,
              options: {
                redirectTo: `${appUrl}/reset-password`,
              },
            }),
          });

          if (linkRes.ok) {
            const linkJson = await linkRes.json();
            const actionLink = linkJson.action_link || linkJson.properties?.action_link;
            const emailOtp = linkJson.email_otp || linkJson.properties?.email_otp;

            if (actionLink) {
              return NextResponse.json({
                data: {
                  message: "ระบบได้สร้างลิงก์สำหรับตั้งรหัสผ่านใหม่เรียบร้อยแล้ว",
                  recoveryUrl: actionLink,
                  recoveryOtp: emailOtp,
                  notice:
                    "เนื่องจากบริการอีเมลจำกัดการส่ง (Resend Sandbox) จึงแสดงลิงก์และรหัส OTP ให้คุณใช้ตั้งรหัสผ่านใหม่ได้ทันที",
                },
              });
            }
          }
        } catch (adminErr) {
          console.error("Admin recovery link fallback error:", adminErr);
        }
      }

      let userFriendlyMessage = errMsg;

      if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("60 seconds")) {
        userFriendlyMessage = "ส่งคำขอถี่เกินไป กรุณารอ 60 วินาทีก่อนกดขอใหม่อีกครั้ง";
      } else if (errMsg.toLowerCase().includes("recovery email")) {
        userFriendlyMessage =
          "บริการอีเมลไม่สามารถส่งข้อความได้ (Resend Sandbox จำกัดเฉพาะเจ้าของบัญชี) กรุณาตรวจสอบการตั้งค่า SMTP ใน Supabase Dashboard หรือติดต่อผู้ดูแลระบบ";
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
