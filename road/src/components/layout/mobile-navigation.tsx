"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, PlusCircle, FileText, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/use-auth";

export function MobileNavigation() {
  const pathname = usePathname();
  const { isStaff, isAdmin } = useAuth();

  // Always maintain exactly 5 items so the primary "Report" action is in the dead center (50%)
  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/map", label: "Map", icon: Map },
    { href: "/report/new", label: "Report", icon: PlusCircle, isPrimary: true },
    { href: "/my-reports", label: "Reports", icon: FileText },
    ...(isStaff || isAdmin
      ? [{ href: "/operations", label: "Ops", icon: ShieldAlert }]
      : [{ href: "/about", label: "About", icon: Info }]),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-border/90 px-2 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full -mt-5 group select-none"
                aria-label="Report damage"
              >
                <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-brand text-white shadow-lg flex items-center justify-center border-4 border-surface group-active:scale-95 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold text-brand mt-1 leading-none">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium transition-colors select-none",
                isActive
                  ? "text-brand font-bold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5px]")} />
              <span className="truncate max-w-[56px] text-center leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
