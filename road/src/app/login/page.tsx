"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { UserRole } from "@/features/auth/types";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  ShieldAlert,
  LogIn,
  UserPlus,
  Check,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { getAllDemoUsers } from "@/features/auth/demo-users";
import { isDemoMode } from "@/lib/env";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const {
    user,
    role,
    isStaff,
    isAdmin,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    switchDemoRole,
    isLoading,
  } = useAuth();

  const [tab, setTab] = React.useState<"signin" | "signup" | "switch_role">(
    isDemoMode ? "switch_role" : "signin"
  );
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signIn(email, password);
    if (success) {
      router.push(returnTo);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signUp(email, password, displayName);
    if (success) {
      router.push(returnTo);
    }
  };

  const demoUsers = getAllDemoUsers();

  return (
    <PageContainer size="md" className="py-8 sm:py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand/20 text-brand text-xs font-bold uppercase tracking-wider">
            <span>Identity & Access Control</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            User Authentication
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Sign in to verify your role, manage reports, or access staff maintenance dispatch.
          </p>
        </div>

        {/* If already authenticated, show current identity summary */}
        {isAuthenticated && user && (
          <Card className="border-brand/40 bg-brand-soft/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    isAdmin
                      ? "bg-purple-600"
                      : isStaff
                      ? "bg-amber-600"
                      : "bg-brand"
                  }`}
                >
                  {isAdmin ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : isStaff ? (
                    <Shield className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-sm truncate">
                      {user.displayName}
                    </span>
                    <Badge
                      variant={isAdmin ? "danger" : isStaff ? "brand" : "neutral"}
                      size="sm"
                      className="uppercase text-[10px]"
                    >
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="text-xs gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </Button>
                <Link href={returnTo}>
                  <Button variant="primary" size="sm" className="text-xs gap-1">
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Card with Tabs */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-muted border border-border-subtle">
              <button
                type="button"
                onClick={() => setTab("signin")}
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
                onClick={() => setTab("signup")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  tab === "signup"
                    ? "bg-surface text-text-primary shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Register
              </button>
              {isDemoMode && (
                <button
                  type="button"
                  onClick={() => setTab("switch_role")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    tab === "switch_role"
                      ? "bg-brand text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span>Roles</span>
                  <Badge variant="outline" size="sm" className="text-[10px] border-white/30 text-current py-0 px-1">
                    Demo
                  </Badge>
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
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

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">
                    {isDemoMode
                      ? "Demo Mode: any password accepted."
                      : "Sign in with your registered account."}
                  </span>
                  <Button type="submit" variant="primary" isLoading={isLoading} className="w-full sm:w-auto gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER */}
            {tab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-primary">Full Name</label>
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
                  <label className="text-xs font-semibold text-text-primary">Password (minimum 6 characters)</label>
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

                <div className="p-3.5 rounded-xl bg-surface-muted border border-border text-xs text-text-secondary flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-text-primary block">บัญชีประชาชน (Citizen Account)</span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      ลงทะเบียนสำหรับแจ้งปัญหาถนนและติดตามผลงานซ่อม สำหรับสิทธิ์เจ้าหน้าที่และผู้ดูแลระบบจะได้รับการจัดการจากระบบหลังบ้าน
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account</span>
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 3: ROLE SWITCHER (For Testing & Verification) */}
            {tab === "switch_role" && (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Choose a verified role to test application access and data isolation:
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
                              onClick={async () => {
                                await switchDemoRole(du.role);
                                router.push(returnTo);
                              }}
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
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
