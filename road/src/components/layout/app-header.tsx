"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Map, LayoutDashboard, FileText, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeIndicator } from "./mode-indicator";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/map", label: "Community Map", icon: Map },
    { href: "/my-reports", label: "My Reports", icon: FileText },
    { href: "/operations", label: "Operations", icon: ShieldAlert },
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
          <ModeIndicator className="hidden md:inline-flex" />

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
