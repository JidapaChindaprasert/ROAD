"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || undefined;

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setErrorMsg(json.error?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาขอลิงก์ใหม่อีกครั้ง");
        toast.error(json.error?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
        return;
      }

      setIsSuccess(true);
      toast.success("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว!");
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer size="sm" className="py-12 sm:py-16">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Reset your account password
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            {isSuccess ? (
              <div className="space-y-5 text-center py-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-text-primary">
                    เปลี่ยนรหัสผ่านสำเร็จแล้ว
                  </h3>
                  <p className="text-xs text-text-muted">
                    คุณสามารถใช้รหัสผ่านใหม่ในการเข้าสู่ระบบได้ทันที
                  </p>
                </div>
                <div className="pt-3">
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push("/login")}
                  >
                    ไปที่หน้าเข้าสู่ระบบ (Sign In)
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-primary">
                    รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-primary">
                    ยืนยันรหัสผ่านใหม่อีกครั้ง
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className="pt-2 space-y-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full gap-2 justify-center"
                    isLoading={isLoading}
                  >
                    <Lock className="h-4 w-4" />
                    <span>บันทึกรหัสผ่านใหม่ (Update Password)</span>
                  </Button>

                  <Link href="/login" className="block text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5 text-text-muted hover:text-text-primary"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>กลับไปหน้าเข้าสู่ระบบ</span>
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
