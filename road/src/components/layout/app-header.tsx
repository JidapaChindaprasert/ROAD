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
  const menuRef = React.useRef<HTMLDivElement>(null);

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
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted transition-colors text-left"
                aria-expanded={isMenuOpen}
                aria-label="User account menu"
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    isAdmin
                      ? "bg-purple-600"
                      : isStaff
                      ? "bg-amber-600"
                      : "bg-brand"
                  }`}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col min-w-0 max-w-[120px]">
                  <span className="text-xs font-bold text-text-primary truncate leading-tight">
                    {user.displayName}
                  </span>
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
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-text-muted hidden sm:block" />
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
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border shadow-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                <div className="p-2 rounded-xl bg-surface-muted/60 border border-border-subtle">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-primary truncate">
                      {user.displayName}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
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
                  <p className="text-[11px] text-text-muted truncate mt-0.5">{user.email}</p>
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
