"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";
import { UserRole } from "@/features/auth/types";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Search,
  ArrowLeft,
  RefreshCw,
  Lock,
  PlusCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roles: UserRole[];
  primaryRole: UserRole;
  isStaff: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { user, isAdmin, isLoading: isAuthLoading, openAuthModal } = useAuth();
  const [users, setUsers] = React.useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | "staff" | "reporter" | "admin">("all");
  const [mutatingUserId, setMutatingUserId] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (res.ok && json.data?.users) {
        setUsers(json.data.users);
      } else {
        toast.error(json.error?.message || "Failed to load user directory");
      }
    } catch {
      toast.error("Network error while loading users");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json?.data?.users) {
          setUsers(json.data.users);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const handleRoleAction = async (
    targetUserId: string,
    role: UserRole,
    action: "assign" | "remove"
  ) => {
    setMutatingUserId(targetUserId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId, role, action }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message || "Role change failed");
        return;
      }

      toast.success(json.data?.message || "Role updated successfully");
      await fetchUsers();
    } catch {
      toast.error("Failed to execute role mutation");
    } finally {
      setMutatingUserId(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี ${targetEmail}? ข้อมูลรายงานและรูปภาพทั้งหมดจะถูกลบตามไปด้วย`)) {
      return;
    }
    setMutatingUserId(targetUserId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message || "Failed to delete user");
        return;
      }

      toast.success(json.data?.message || "User deleted successfully");
      await fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setMutatingUserId(null);
    }
  };

  // 1. Loading auth state
  if (isAuthLoading) {
    return (
      <PageContainer size="lg" className="py-12">
        <div className="space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  // 2. Permission Barrier: Not an Admin
  if (!isAdmin) {
    return (
      <PageContainer size="md" className="py-16">
        <Card className="border-red-200 bg-red-50/20 max-w-lg mx-auto shadow-sm text-center">
          <CardContent className="p-8 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-text-primary">
                Administrator Access Required
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                ระบบจัดการเจ้าหน้าที่หลังบ้าน (Back-office User & Staff Management) สงวนสิทธิ์เฉพาะผู้ดูแลระบบที่มีสิทธิ์ Admin เท่านั้น
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAuthModal("signin")}
                className="w-full sm:w-auto text-xs"
              >
                Sign In as Admin
              </Button>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (roleFilter === "all") return true;
    if (roleFilter === "admin") return u.isAdmin;
    if (roleFilter === "staff") return u.isStaff && !u.isAdmin;
    if (roleFilter === "reporter") return !u.isStaff;

    return true;
  });

  const staffCount = users.filter((u) => u.isStaff).length;
  const citizenCount = users.filter((u) => !u.isStaff).length;

  return (
    <PageContainer size="lg" className="py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-brand transition-colors mr-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <Badge variant="danger" size="sm" className="font-mono text-[10px] uppercase">
              Admin Portal
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            User & Staff Management (ระบบจัดการเจ้าหน้าที่หลังบ้าน)
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            แต่งตั้งสิทธิ์เจ้าหน้าที่ปฏิบัติการภาคสนามและผู้ดูแลระบบ ตรวจสอบความถูกต้องของการเข้าถึงข้อมูล
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/operations">
            <Button variant="primary" size="sm" className="text-xs gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Operations Queue</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-text-muted">Total Registered Users</div>
              <div className="text-xl font-bold text-text-primary">{users.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-text-muted">Operations Staff Crew</div>
              <div className="text-xl font-bold text-amber-700">{staffCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-text-muted">Citizen Reporters</div>
              <div className="text-xl font-bold text-blue-700">{citizenCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                type="text"
                placeholder="Search user by display name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "all", label: "All Users" },
                  { id: "staff", label: "Staff Only" },
                  { id: "reporter", label: "Citizens" },
                  { id: "admin", label: "Admins" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    roleFilter === tab.id
                      ? "bg-brand text-white shadow-xs"
                      : "bg-surface-muted text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Directory Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base flex items-center justify-between">
            <span>User Directory ({filteredUsers.length})</span>
            <span className="text-xs font-normal text-text-muted">
              Logged in as Admin: <strong className="font-semibold text-text-primary">{user?.displayName}</strong>
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            คลิกปุ่มปฏิบัติการเพื่อแต่งตั้งสิทธิ์เจ้าหน้าที่ (Staff) หรือคืนสิทธิ์เป็นประชาชนทั่วไป (Citizen)
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-muted border-b border-border-subtle text-text-secondary font-medium text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4 hidden md:table-cell">Registered</th>
                <th className="py-3 px-4 text-right">Role Actions (การจัดการสิทธิ์)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-brand" />
                    <span>Loading verified user list...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === user?.id;
                  const isUserMutating = mutatingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-surface-muted/50 transition-colors">
                      {/* Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              u.isAdmin
                                ? "bg-purple-600"
                                : u.isStaff
                                ? "bg-amber-600"
                                : "bg-brand"
                            }`}
                          >
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary truncate flex items-center gap-1.5">
                              <span>{u.displayName}</span>
                              {isCurrentAdmin && (
                                <span className="text-[10px] text-brand font-normal">(You)</span>
                              )}
                            </div>
                            <div className="text-xs text-text-muted truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={
                                r === "admin"
                                  ? "danger"
                                  : r === "staff"
                                  ? "brand"
                                  : "neutral"
                              }
                              size="sm"
                              className="uppercase text-[10px]"
                            >
                              {r === "admin"
                                ? "District Admin"
                                : r === "staff"
                                ? "Operations Staff"
                                : "Citizen"}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-xs text-text-muted">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Staff toggle button */}
                          {u.isStaff ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isCurrentAdmin || isUserMutating}
                              onClick={() => handleRoleAction(u.id, "staff", "remove")}
                              className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              title="ปลดสิทธิ์เจ้าหน้าที่ปฏิบัติการ"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Revoke Staff</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUserMutating}
                              onClick={() => handleRoleAction(u.id, "staff", "assign")}
                              className="text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                              title="แต่งตั้งเป็นเจ้าหน้าที่ปฏิบัติการ (Staff)"
                            >
                              <Shield className="h-3.5 w-3.5" />
                              <span>Promote to Staff</span>
                            </Button>
                          )}

                          {/* Admin toggle if not self */}
                          {!u.isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isUserMutating}
                              onClick={() => handleRoleAction(u.id, "admin", "assign")}
                              className="text-xs text-purple-700 hover:bg-purple-50 hidden lg:inline-flex"
                              title="แต่งตั้งเป็นผู้ดูแลระบบ (Admin)"
                            >
                              <span>Grant Admin</span>
                            </Button>
                          )}

                          {/* Delete user button (if not self) */}
                          {!isCurrentAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isUserMutating}
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              title="ลบบัญชีผู้ใช้"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
