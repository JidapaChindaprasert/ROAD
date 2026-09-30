"use client";

import * as React from "react";
import { useAuth } from "../use-auth";
import { UserRole } from "../types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Shield, ShieldAlert, KeyRound, Check, LogIn, UserPlus, RefreshCw, MailCheck, ArrowLeft } from "lucide-react";
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
    switchDemoRole,
    isLoading,
  } = useAuth();

  const [tabOverride, setTabOverride] = React.useState<"signin" | "signup" | "switch_role" | "email_confirmation" | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const defaultTab = isDemoMode && authModalMode === "switch_role" ? "switch_role" : authModalMode === "signup" ? "signup" : "signin";
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
    if (!email || isResending || resendCooldown > 0) return;
    setIsResending(true);
    try {
      const ok = await resendConfirmation(email);
      if (ok) {
        setResendCooldown(60);
      }
    } finally {
      setIsResending(false);
    }
  };

  const demoUsers = getAllDemoUsers();

  return (
    <Dialog
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title="User Authentication & Access"
      description="Sign in to verify your citizen profile or manage road damage reports."
      className="max-w-md"
    >
      <div className="space-y-5 pt-2">
        {/* Tab switcher */}
        {tab === "email_confirmation" ? (
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-surface-muted border border-border-subtle">
            <button
              type="button"
              onClick={() => setTabOverride("signin")}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-xs font-bold text-brand pr-2">Email Verification</span>
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
              Sign In
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
              Create Account
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
              <label className="text-xs font-semibold text-text-primary">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="somchai@road.bkk"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted">
                {isDemoMode ? "Demo Mode: any password accepted." : "Sign in with your verified Supabase credentials."}
              </span>
              <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2 shrink-0">
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: SIGN UP */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">Full Name / Display Name</label>
              <Input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Somsak Jaidee"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.gov.th"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">Password (minimum 6 chars)</label>
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

            <div className="p-3 rounded-xl bg-surface-muted border border-border text-xs text-text-secondary flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary block">บัญชีประชาชน (Citizen Account)</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  สำหรับการแจ้งเหตุและติดตามสถานะงานซ่อมถนน เจ้าหน้าที่และผู้ดูแลระบบจะได้รับการแต่งตั้งจากระบบหลังบ้าน
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Create Account</span>
              </Button>
            </div>
          </form>
        )}

        {/* TAB: EMAIL CONFIRMATION */}
        {tab === "email_confirmation" && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <MailCheck className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-text-primary">
                กรุณายืนยันที่อยู่อีเมลของคุณ
              </h3>
              <p className="text-xs text-text-muted">
                Please verify your email address to activate your account
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-muted border border-border text-left space-y-2.5">
              <div className="text-xs text-text-secondary">
                เราได้ส่งลิงก์ยืนยันตัวตนไปยัง:
              </div>
              <div className="font-semibold text-sm text-text-primary bg-surface px-3 py-2 rounded-lg border border-border-subtle break-all">
                {email || "your-email@example.com"}
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                กรุณาตรวจสอบกล่องข้อความในอีเมลของคุณ (รวมถึงโฟลเดอร์ <strong>Junk / Spam</strong>) และคลิกลิงก์ยืนยัน เพื่อเปิดใช้งานบัญชีและเข้าสู่ระบบ
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                variant="primary"
                className="w-full gap-2 justify-center"
                onClick={handleResend}
                isLoading={isResending}
                disabled={resendCooldown > 0}
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                <span>
                  {resendCooldown > 0
                    ? `ส่งอีกครั้งได้ใน ${resendCooldown} วินาที`
                    : "ส่งอีเมลยืนยันอีกครั้ง (Resend Email)"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 justify-center"
                onClick={() => setTabOverride("signin")}
              >
                <LogIn className="h-4 w-4" />
                <span>ไปที่หน้าเข้าสู่ระบบ (Sign In)</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: ROLE SWITCHER (For Testing & Verification) */}
        {tab === "switch_role" && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              Select an identity to test verified permissions and data isolation between citizen reporting and staff operations:
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
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          du.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : du.role === "staff"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {du.role === "admin" ? (
                          <ShieldAlert className="h-5 w-5" />
                        ) : du.role === "staff" ? (
                          <Shield className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text-primary truncate">
                            {du.displayName}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              du.role === "admin"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : du.role === "staff"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {du.role}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted truncate">{du.email}</p>
                        <p className="text-[11px] text-text-secondary">
                          {du.role === "admin"
                            ? "Full authority: Manage teams, modify roles, dispatch operations."
                            : du.role === "staff"
                            ? "Municipal crew: Can update status, view private GPS, assign crews."
                            : "Citizen: Can submit reports and view own report timeline."}
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
