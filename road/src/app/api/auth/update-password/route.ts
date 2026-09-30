import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const updatePasswordSchema = z.object({
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
  code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updatePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "รหัสผ่านไม่ถูกต้อง" } },
        { status: 400 }
      );
    }

    const { password, code } = parsed.data;

    // Demo Mode
    if (isDemoMode) {
      return NextResponse.json({
        data: { message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว (Demo Mode)" },
      });
    }

    // Production Mode with Supabase
    const supabase = await createServerSupabaseClient();

    // If a code was passed, exchange it first
    if (code) {
      try {
        await supabase.auth.exchangeCodeForSession(code);
      } catch (exchangeErr) {
        console.warn("Failed to exchange code for recovery session:", exchangeErr);
      }
    }

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          error: {
            code: "UPDATE_PASSWORD_FAILED",
            message: error?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้ ลิงก์อาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating password";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
