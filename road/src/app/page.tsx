"use client";

import * as React from "react";
import Link from "next/link";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { ReportSummary } from "@/features/reports/types";
import { PageContainer } from "@/components/layout/page-container";
import { DashboardHero } from "@/features/dashboard/components/dashboard-hero";
import { CommunityMetrics } from "@/features/dashboard/components/community-metrics";
import { RecentReports } from "@/features/dashboard/components/recent-reports";
import { DemoCityMap } from "@/features/map/components/demo-city-map";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Map,
  Camera,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const repository = useReportRepository();
  const [reports, setReports] = React.useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    repository
      .listPublicReports()
      .then((data) => {
        if (isMounted) setReports(data);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repository]);

  return (
    <PageContainer size="lg" className="space-y-8">
      {/* 1. Hero Section */}
      <DashboardHero />

      {/* 2. Key Metrics Derived from Data */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : (
        <CommunityMetrics reports={reports} />
      )}

      {/* 3. Main Dashboard Grid (8 cols map & activity / 4 cols quick report) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Map Preview Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Map className="h-5 w-5 text-brand shrink-0" />
                  <span className="truncate">Bangkok Community Damage Map</span>
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Click any pin to inspect the damage category, AI detection, and repair status.
                </p>
              </div>

              <Link href="/map" className="shrink-0 self-start sm:self-auto">
                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                  <span>Full Map</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="w-full h-[380px] rounded-2xl" />
              ) : (
                <DemoCityMap
                  reports={reports}
                  onSelectReport={(rep) => {
                    window.location.href = `/reports/${rep.id}`;
                  }}
                  className="h-[380px]"
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : (
            <RecentReports reports={reports} />
          )}
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Report Action Card */}
          <Card className="border-brand/30 bg-gradient-to-br from-brand-soft/40 to-surface overflow-hidden shadow-sm">
            <CardHeader>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Quick Action
              </span>
              <CardTitle className="text-xl mt-1">
                Report a Hazard Now
              </CardTitle>
              <p className="text-xs text-text-secondary mt-1">
                Take a quick photo while on your commute. Takes less than 60 seconds.
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  <span>Automatic Roboflow vision damage detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  <span>One-click GPS location lock</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  <span>Live tracking until road is fixed</span>
                </div>
              </div>

              <Link href="/report/new" className="block pt-2">
                <Button size="lg" variant="primary" className="w-full font-bold shadow-sm gap-2">
                  <Camera className="h-4 w-4" />
                  <span>Start New Report</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Road Safety & Responsibility Note */}
          <Card className="bg-surface-muted/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-text-secondary">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Civic Safety Reminder</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-text-secondary leading-relaxed space-y-2">
              <p>
                Only capture photos when it is completely safe to do so. <strong>Do not use this app while driving.</strong>
              </p>
              <p className="text-[11px] text-text-muted">
                For immediate life-threatening structural road collapses or emergency dispatch, contact local municipal emergency services directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
