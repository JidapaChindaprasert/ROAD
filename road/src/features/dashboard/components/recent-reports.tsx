import * as React from "react";
import Link from "next/link";
import { ReportSummary } from "@/features/reports/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Sparkles, Clock } from "lucide-react";
import { STATUS_DISPLAY_CONFIG, DAMAGE_CATEGORY_CONFIG } from "@/features/reports/status-machine";
import { formatRelativeTime } from "@/lib/utils";
import {
  getSafeImageUrl,
  CATEGORY_FALLBACK_IMAGES,
  DEFAULT_ROAD_DAMAGE_IMAGE,
} from "@/lib/constants/fallback-images";

export interface RecentReportsProps {
  reports: ReportSummary[];
  className?: string;
}

export function RecentReports({ reports, className = "" }: RecentReportsProps) {
  const recent = reports.slice(0, 5);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Recent Community Activity
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Latest road hazard signals verified across the city
          </p>
        </div>

        <Link href="/map">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-brand gap-1">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {recent.map((report) => {
          const categoryMeta =
            DAMAGE_CATEGORY_CONFIG[report.category] || DAMAGE_CATEGORY_CONFIG.other;
          const statusMeta =
            STATUS_DISPLAY_CONFIG[report.detailedStatus] || STATUS_DISPLAY_CONFIG.reported;

          return (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="group block rounded-2xl border border-border bg-surface p-4 hover:shadow-md hover:border-brand/40 transition-all"
            >
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {(() => {
                    const fallbackImg = CATEGORY_FALLBACK_IMAGES[report.category] || DEFAULT_ROAD_DAMAGE_IMAGE;
                    const safeThumb = getSafeImageUrl(report.thumbnailUrl, report.category);

                    return (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-surface-muted shrink-0 border border-border-subtle">
                        <img
                          src={safeThumb}
                          alt={report.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== fallbackImg) {
                              target.src = fallbackImg;
                            }
                          }}
                        />
                      </div>
                    );
                  })()}

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand">
                        {report.publicId}
                      </span>
                      <Badge variant="outline" size="sm" className="text-[10px] shrink-0">
                        {categoryMeta.shortLabel}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-text-primary group-hover:text-brand transition-colors truncate">
                      {report.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0">
                      <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-[200px]">
                        <MapPin className="h-3 w-3 text-brand shrink-0" />
                        <span className="truncate">{report.localityLabel || "Bangkok"}</span>
                      </span>
                      <span>•</span>
                      <span className="text-text-muted shrink-0">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5 pl-1">
                  <Badge variant={statusMeta.badgeVariant} size="sm" className="shrink-0 whitespace-nowrap">
                    {statusMeta.publicLabel}
                  </Badge>
                  <span className="text-xs text-brand group-hover:translate-x-0.5 transition-transform hidden sm:inline-flex">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
