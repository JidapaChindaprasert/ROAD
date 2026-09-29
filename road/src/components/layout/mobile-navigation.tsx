"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, PlusCircle, FileText, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/map", label: "Map", icon: Map },
    { href: "/report/new", label: "Report", icon: PlusCircle, isPrimary: true },
    { href: "/my-reports", label: "My Reports", icon: FileText },
    { href: "/operations", label: "Ops", icon: ShieldAlert },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-border/90 px-3 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
                aria-label="Report damage"
              >
                <div className="h-13 w-13 rounded-full bg-brand text-white shadow-lg flex items-center justify-center border-4 border-surface group-active:scale-95 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold text-brand mt-1">
                  Report
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-full py-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-brand font-bold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-0.5", isActive && "stroke-[2.5px]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
