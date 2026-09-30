"use client";

import * as React from "react";
import Link from "next/link";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { ReportDetail } from "@/features/reports/types";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusCircle, MapPin, Calendar, ArrowRight, FileText } from "lucide-react";
import { STATUS_DISPLAY_CONFIG, DAMAGE_CATEGORY_CONFIG } from "@/features/reports/status-machine";
import { formatRelativeTime } from "@/lib/utils";
import {
  getSafeImageUrl,
  CATEGORY_FALLBACK_IMAGES,
  DEFAULT_ROAD_DAMAGE_IMAGE,
} from "@/lib/constants/fallback-images";

import { useAuth } from "@/features/auth/use-auth";

export default function MyReportsPage() {
  const repository = useReportRepository();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [reports, setReports] = React.useState<ReportDetail[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    repository
      .listMyReports()
      .then((data) => {
        if (isMounted) {
          // If authenticated as citizen, scope data or display user reports
          setReports(data);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repository, user?.id]);

  return (
    <PageContainer size="lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              My Submitted Reports
            </h1>
            {user && (
              <Badge variant="outline" size="sm" className="font-mono text-xs">
                {user.displayName}
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {isAuthenticated && user
              ? `Verified reports filed under ${user.email}. Follow repair progress in real-time.`
              : "Track road hazard reports and follow repair progress in real-time."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAuthModal("signin")}
              className="text-xs font-semibold"
            >
              Sign In to Sync
            </Button>
          )}

          <Link href="/report/new">
            <Button variant="primary" className="gap-2 font-bold shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Report Road Damage</span>
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="You haven't reported any road damage yet"
          description="Notice a pothole, crack, or flooded drain? Submit a report in under a minute."
          actionLabel="Report Damage Now"
          onAction={() => (window.location.href = "/report/new")}
          className="my-8"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const categoryMeta =
              DAMAGE_CATEGORY_CONFIG[report.category] || DAMAGE_CATEGORY_CONFIG.other;
            const statusMeta =
              STATUS_DISPLAY_CONFIG[report.detailedStatus] || STATUS_DISPLAY_CONFIG.reported;

            return (
              <div
                key={report.id}
                className="group rounded-2xl border border-border bg-surface p-5 hover:shadow-lg hover:border-brand/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-md truncate">
                      {report.publicId}
                    </span>
                    <Badge variant={statusMeta.badgeVariant} size="sm" className="shrink-0 whitespace-nowrap">
                      {statusMeta.publicLabel}
                    </Badge>
                  </div>

                  {(() => {
                    const fallbackImg = CATEGORY_FALLBACK_IMAGES[report.category] || DEFAULT_ROAD_DAMAGE_IMAGE;
                    const safeThumb = getSafeImageUrl(report.thumbnailUrl, report.category);

                    return (
                      <div className="relative rounded-xl overflow-hidden aspect-16/9 bg-surface-muted border border-border-subtle">
                        <img
                          src={safeThumb}
                          alt={report.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

                  <div>
                    <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors line-clamp-2">
                      {report.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" size="sm" className="text-[11px]">
                        {categoryMeta.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-text-secondary pt-1 border-t border-border-subtle">
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

                <div className="pt-4 mt-3 border-t border-border-subtle">
                  <Link href={`/reports/${report.id}`} className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold justify-between bg-surface-muted/60 text-text-primary hover:bg-brand hover:text-white hover:border-brand shadow-2xs group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-colors"
                    >
                      <span>Track Fix Progress</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
