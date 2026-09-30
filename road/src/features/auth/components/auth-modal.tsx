"use client";

import * as React from "react";
import { useAuth } from "../use-auth";
import { UserRole } from "../types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  ShieldAlert,
  KeyRound,
  Check,
  LogIn,
  UserPlus,
  RefreshCw,
  MailCheck,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Send,
} from "lucide-react";
import { getAllDemoUsers } from "../demo-users";
import { isDemoMode } from "@/lib/env";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    user,
    signIn,
    signUp,
    resendConfirmation,
    verifyEmailOtp,
    forgotPassword,
    switchDemoRole,
    isLoading,
  } = useAuth();

  const [tabOverride, setTabOverride] = React.useState<
    "signin" | "signup" | "switch_role" | "forgot_password" | "email_confirmation" | null
  >(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [resendStatusMsg, setResendStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // OTP Verification state
  const [otpToken, setOtpToken] = React.useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [resetSentMessage, setResetSentMessage] = React.useState<string | null>(null);

  const defaultTab =
    isDemoMode && authModalMode === "switch_role"
      ? "switch_role"
      : authModalMode === "signup"
      ? "signup"
      : authModalMode === "forgot_password"
      ? "forgot_password"
      : authModalMode === "email_confirmation"
      ? "email_confirmation"
      : "signin";
  const tab = tabOverride ?? defaultTab;

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleClose = () => {
    setTabOverride(null);
    setResendStatusMsg(null);
    setOtpError(null);
    setResetSentMessage(null);
    closeAuthModal();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const res = await signIn(email, password);
    if (!res.success && res.requiresEmailConfirmation) {
      setTabOverride("email_confirmation");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;
    const res = await signUp(email, password, displayName);
    if (res.success && res.requiresEmailConfirmation) {
      setTabOverride("email_confirmation");
    }
  };

  const handleResend = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || isResending || resendCooldown > 0) return;
    setIsResending(true);
    setResendStatusMsg(null);
    try {
      const ok = await resendConfirmation(targetEmail);
      if (ok) {
        setResendCooldown(60);
        setResendStatusMsg({
          type: "success",
          text: `ระบบได้ส่งอีเมลยืนยันไปยัง ${targetEmail} แล้ว กรุณาตรวจสอบกล่องข้อความ`,
        });
      } else {
        setResendStatusMsg({
          type: "error",
          text: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือรอ 60 วินาที",
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim();
    const token = otpToken.trim();
    if (!targetEmail || !token) return;
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await verifyEmailOtp(targetEmail, token);
      if (!res.success) {
        setOtpError(res.message);
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (forgotEmail || email).trim();
    if (!targetEmail) return;
    setIsSendingReset(true);
    setResetSentMessage(null);
    try {
      const res = await forgotPassword(targetEmail);
      if (res.success) {
        setResetSentMessage(res.message);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const demoUsers = getAllDemoUsers();

  return (
    <Dialog
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title="เข้าสู่ระบบและจัดการบัญชี"
      description="เข้าสู่ระบบเพื่อติดตามสถานะการรายงานความเสียหายของถนน"
      className="max-w-md"
    >
      <div className="space-y-5 pt-2">
        {/* Tab switcher */}
        {tab === "email_confirmation" ? (
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-surface-muted border border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setTabOverride("signin");
                setResendStatusMsg(null);
                setOtpError(null);
              }}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปหน้าเข้าสู่ระบบ</span>
            </button>
            <span className="text-xs font-bold text-brand pr-2">ยืนยันอีเมล</span>
          </div>
        ) : tab === "forgot_password" ? (
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-surface-muted border border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setTabOverride("signin");
                setResetSentMessage(null);
              }}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปหน้าเข้าสู่ระบบ</span>
            </button>
            <span className="text-xs font-bold text-brand pr-2">ลืมรหัสผ่าน</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-muted border border-border-subtle">
            <button
              type="button"
              onClick={() => setTabOverride("signin")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === "signin"
                  ? "bg-surface text-text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => setTabOverride("signup")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === "signup"
                  ? "bg-surface text-text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              สมัครสมาชิก
            </button>
            {isDemoMode && (
              <button
                type="button"
                onClick={() => setTabOverride("switch_role")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  tab === "switch_role"
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>Demo Roles</span>
                <Badge variant="outline" size="sm" className="text-[10px] border-white/30 text-current py-0 px-1">
                  Test
                </Badge>
              </button>
            )}
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {tab === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">อีเมล</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary">รหัสผ่าน</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setTabOverride("forgot_password");
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2 w-full sm:w-auto">
                <LogIn className="h-4 w-4" />
                <span>เข้าสู่ระบบ</span>
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: SIGN UP */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">ชื่อ - นามสกุล หรือชื่อแสดง</label>
              <Input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">อีเมล</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
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

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
                <span>สร้างบัญชีผู้ใช้</span>
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {tab === "forgot_password" && (
          <div className="space-y-4">
            {resetSentMessage ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-text-primary text-base">ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว</h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {resetSentMessage}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setTabOverride("signin");
                    setResetSentMessage(null);
                  }}
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  ระบุที่อยู่อีเมลที่คุณใช้ลงทะเบียน เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังกล่องข้อความของคุณ
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-primary">อีเมล</label>
                  <Input
                    type="email"
                    required
                    value={forgotEmail || email}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full gap-2 justify-center"
                    isLoading={isSendingReset}
                  >
                    <Send className="h-4 w-4" />
                    <span>ส่งลิงก์รีเซ็ตรหัสผ่าน</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs text-text-muted hover:text-text-primary"
                    onClick={() => setTabOverride("signin")}
                  >
                    ยกเลิก / กลับไปเข้าสู่ระบบ
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: EMAIL CONFIRMATION */}
        {tab === "email_confirmation" && (
          <div className="space-y-4 py-1 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <MailCheck className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">
                กรุณายืนยันที่อยู่อีเมลของคุณ
              </h3>
              <p className="text-xs text-text-muted">
                ตรวจสอบกล่องข้อความเพื่อเปิดใช้งานบัญชี
              </p>
            </div>

            {resendStatusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs text-left flex items-start gap-2 ${
                  resendStatusMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                }`}
              >
                {resendStatusMsg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{resendStatusMsg.text}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-surface-muted border border-border text-left space-y-2">
              <div className="text-xs text-text-secondary">
                ส่งลิงก์ยืนยันตัวตนไปยัง:
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="text-xs h-8 bg-surface"
                />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                กรุณาตรวจสอบกล่องข้อความในอีเมล (รวมถึงโฟลเดอร์ <strong>Junk / Spam</strong>) และคลิกลิงก์ยืนยัน
              </p>
            </div>

            {/* Direct OTP / Token Verification (Fix for mobile / localhost connection issue) */}
            <form onSubmit={handleVerifyOtp} className="p-3.5 rounded-xl bg-surface border border-border text-left space-y-2.5">
              <div>
                <label className="text-xs font-semibold text-text-primary block">
                  หรือกรอกรหัสยืนยัน (Token 6-8 หลัก)
                </label>
                <span className="text-[11px] text-text-muted">
                  (กรณีคลิกลิงก์บนมือถือแล้วติดข้อความ localhost ปฏิเสธการเชื่อมต่อ)
                </span>
              </div>

              {otpError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  type="text"
                  required
                  placeholder="เช่น 123456"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="text-xs h-8 font-mono"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={isVerifyingOtp}
                  className="text-xs h-8 shrink-0 px-3"
                >
                  ยืนยันรหัส
                </Button>
              </div>
            </form>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 justify-center text-xs h-9"
                onClick={handleResend}
                isLoading={isResending}
                disabled={resendCooldown > 0 || !email.trim()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                <span>
                  {resendCooldown > 0
                    ? `ส่งอีกครั้งได้ใน ${resendCooldown} วินาที`
                    : "ส่งอีเมลยืนยันอีกครั้ง (Resend Email)"}
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-text-muted hover:text-text-primary h-8"
                onClick={() => setTabOverride("signin")}
              >
                กลับไปหน้าเข้าสู่ระบบ (Sign In)
              </Button>
            </div>
          </div>
        )}

        {/* TAB 5: ROLE SWITCHER (For Testing & Verification) */}
        {tab === "switch_role" && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              เลือกบทบาทเพื่อทดสอบสิทธิ์การใช้งานใน Demo Mode:
            </p>

            <div className="space-y-2.5">
              {demoUsers.map((du) => {
                const isCurrent = user?.id === du.id || user?.role === du.role;
                return (
                  <div
                    key={du.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "border-brand bg-brand-soft/30 ring-1 ring-brand/40"
                        : "border-border hover:border-brand/30 bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0 ${
                          du.role === "admin"
                            ? "bg-purple-600"
                            : du.role === "staff"
                            ? "bg-amber-600"
                            : "bg-brand"
                        }`}
                      >
                        {du.role === "admin" ? (
                          <ShieldAlert className="h-4 w-4" />
                        ) : du.role === "staff" ? (
                          <Shield className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-text-primary truncate">
                            {du.displayName}
                          </span>
                          <Badge
                            variant={du.role === "admin" ? "danger" : du.role === "staff" ? "brand" : "neutral"}
                            size="sm"
                            className="uppercase text-[9px]"
                          >
                            {du.role}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary truncate mt-0.5">
                          {du.role === "admin"
                            ? "ผู้ดูแลระบบ: จัดการสิทธิ์เจ้าหน้าที่และระบบ"
                            : du.role === "staff"
                            ? "เจ้าหน้าที่ฝ่ายปฏิบัติการ: อัปเดตสถานะงานซ่อม ดูพิกัดแม่นยำ"
                            : "ประชาชนทั่วไป: แจ้งเหตุและติดตามรายงานของตนเอง"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCurrent ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-brand px-3 py-1.5 rounded-xl bg-brand-soft border border-brand/20">
                          <Check className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => switchDemoRole(du.role)}
                          isLoading={isLoading}
                          className="text-xs font-semibold"
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
