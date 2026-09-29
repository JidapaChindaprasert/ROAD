"use client";

import * as React from "react";
import Link from "next/link";
import { ReportSummary } from "@/features/reports/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin, ArrowRight, Calendar, Layers } from "lucide-react";
import { STATUS_DISPLAY_CONFIG, DAMAGE_CATEGORY_CONFIG } from "@/features/reports/status-machine";
import { formatRelativeTime } from "@/lib/utils";

export interface ReportListViewProps {
  reports: ReportSummary[];
  onSelectReport: (report: ReportSummary) => void;
  className?: string;
}

export function ReportListView({
  reports,
  onSelectReport,
  className = "",
}: ReportListViewProps) {
  if (reports.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No road reports match your filter"
        description="Try adjusting your status or category filters, or search query to see other incidents."
        className="my-8"
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {reports.map((report) => {
        const categoryMeta =
          DAMAGE_CATEGORY_CONFIG[report.category] || DAMAGE_CATEGORY_CONFIG.other;
        const statusMeta =
          STATUS_DISPLAY_CONFIG[report.detailedStatus] || STATUS_DISPLAY_CONFIG.reported;

        return (
          <article
            key={report.id}
            className="Card group rounded-2xl border border-border bg-surface p-5 hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Header: ID + Status */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-brand truncate">
                  {report.publicId}
                </span>
                <Badge variant={statusMeta.badgeVariant} size="sm" className="shrink-0 whitespace-nowrap">
                  {statusMeta.publicLabel}
                </Badge>
              </div>

              {/* Title & Category */}
              <div>
                <h4 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors line-clamp-2">
                  {report.title}
                </h4>
                <div className="mt-1">
                  <Badge variant="outline" size="sm" className="text-[11px]">
                    {categoryMeta.label}
                  </Badge>
                </div>
              </div>

              {/* Location & Timestamp */}
              <div className="space-y-1 text-xs text-text-secondary pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span className="truncate">
                    {report.localityLabel || "Bangkok Metro Area"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Reported {formatRelativeTime(report.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-4 mt-3 border-t border-border-subtle flex items-center justify-between">
              <Link href={`/reports/${report.id}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between bg-surface-muted/60 text-text-primary hover:bg-brand hover:text-white hover:border-brand shadow-2xs group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-colors">
                  <span>Track Fix Timeline</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
