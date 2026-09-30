"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlusCircle,
  Map,
  LayoutDashboard,
  FileText,
  ShieldAlert,
  User,
  Shield,
  Users,
  LogIn,
  LogOut,
  ChevronDown,
  RefreshCw,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeIndicator } from "./mode-indicator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/use-auth";
import { isDemoMode } from "@/lib/env";

export function AppHeader() {
  const pathname = usePathname();
  const { user, role, isStaff, isAdmin, isAuthenticated, openAuthModal, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleCopyEmail = (emailText: string) => {
    if (!emailText) return;
    navigator.clipboard.writeText(emailText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/map", label: "Community Map", icon: Map },
    { href: "/my-reports", label: "My Reports", icon: FileText },
    ...(isStaff ? [{ href: "/operations", label: "Operations", icon: ShieldAlert }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin Console", icon: Users }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-border/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link
            href="/about"
            className="flex items-center gap-2 sm:gap-2.5 group shrink-0"
            title="Meet the Engineering Team"
          >
            <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center text-white font-black tracking-wider shadow-sm group-hover:bg-brand-hover transition-colors shrink-0">
              <span className="text-lg">R</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg tracking-tight text-text-primary leading-none group-hover:text-brand transition-colors whitespace-nowrap">
                ROAD
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-brand whitespace-nowrap hidden sm:block">
                Civic Damage Intel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-brand-soft text-brand"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ModeIndicator className="hidden lg:inline-flex" />

          {/* User Auth & Role Widget */}
          <div className="relative" ref={menuRef}>
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted transition-all text-left shadow-2xs group max-w-[200px] xs:max-w-[240px] sm:max-w-xs"
                aria-expanded={isMenuOpen}
                aria-label="User account menu"
              >
                <div
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs ${
                    isAdmin
                      ? "bg-purple-600 ring-2 ring-purple-400/20"
                      : isStaff
                      ? "bg-amber-600 ring-2 ring-amber-400/20"
                      : "bg-brand ring-2 ring-brand/20"
                  }`}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 max-w-[95px] xs:max-w-[130px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px]">
                  <span className="text-xs font-bold text-text-primary truncate leading-tight group-hover:text-brand transition-colors">
                    {user.displayName || user.email}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        isAdmin
                          ? "text-purple-600"
                          : isStaff
                          ? "text-amber-600"
                          : "text-brand"
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.email && (
                      <span className="text-[10px] text-text-muted truncate hidden sm:inline">
                        • {user.email}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform shrink-0 hidden xs:block", isMenuOpen && "rotate-180")} />
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openAuthModal("signin")}
                className="text-xs font-semibold gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Button>
            )}

            {/* Dropdown Menu */}
            {isMenuOpen && user && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm rounded-2xl bg-surface border border-border shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5">
                <div className="p-3 rounded-xl bg-surface-muted/70 border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          isAdmin
                            ? "bg-purple-600"
                            : isStaff
                            ? "bg-amber-600"
                            : "bg-brand"
                        }`}
                      >
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {user.displayName}
                        </p>
                        <span
                          className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            isAdmin
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : isStaff
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Responsive Email Bar with Copy Button */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-text-muted">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <span className="text-[11px] truncate select-all" title={user.email}>
                        {user.email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(user.email)}
                      className="p-1 rounded-md hover:bg-surface text-text-muted hover:text-text-primary transition-colors shrink-0"
                      title={isCopied ? "คัดลอกแล้ว" : "คัดลอกอีเมล"}
                      aria-label="Copy email"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <Link
                    href="/my-reports"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-brand" />
                    <span>My Reports</span>
                  </Link>

                  {isStaff && (
                    <Link
                      href="/operations"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                      <span>Operations Console</span>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span>Staff Management (หลังบ้าน)</span>
                    </Link>
                  )}

                  {isDemoMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        openAuthModal("switch_role");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-brand" />
                        <span>Switch Role (Test)</span>
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">demo</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-xs font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link href="/report/new">
            <Button size="sm" className="shadow-sm font-semibold gap-1.5 px-3 py-1.5 whitespace-nowrap">
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Report Damage</span>
              <span className="sm:hidden text-xs">Report</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
