import * as React from "react";
import { ReportSummary } from "@/features/reports/types";
import { Clock, Wrench, CheckCircle2, TrendingUp } from "lucide-react";

export interface CommunityMetricsProps {
  reports: ReportSummary[];
  className?: string;
}

export function CommunityMetrics({ reports, className = "" }: CommunityMetricsProps) {
  const openCount = reports.filter((r) => r.publicStatus === "reported").length;
  const repairingCount = reports.filter((r) => r.publicStatus === "repairing").length;
  const fixedCount = reports.filter((r) => r.publicStatus === "fixed").length;

  const metrics = [
    {
      label: "Open Reports",
      value: openCount,
      description: "Awaiting or under assessment",
      icon: Clock,
      color: "text-reported",
      bg: "bg-reported-soft",
      border: "border-reported-border",
    },
    {
      label: "In Progress",
      value: repairingCount,
      description: "Active work crew on site",
      icon: Wrench,
      color: "text-repairing",
      bg: "bg-repairing-soft",
      border: "border-repairing-border",
    },
    {
      label: "Fixed This Month",
      value: fixedCount,
      description: "Verified restored roads",
      icon: CheckCircle2,
      color: "text-fixed",
      bg: "bg-fixed-soft",
      border: "border-fixed-border",
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 md:p-6 shadow-xs flex items-center justify-between gap-3 sm:gap-4 min-w-0"
          >
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider truncate block">
                {m.label}
              </span>
              <div className="text-3xl sm:text-4xl font-black text-text-primary mt-1 tabular-nums">
                {m.value}
              </div>
              <p className="text-xs text-text-muted mt-1 truncate">{m.description}</p>
            </div>

            <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl ${m.bg} ${m.color} flex items-center justify-center shrink-0 border ${m.border}`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
