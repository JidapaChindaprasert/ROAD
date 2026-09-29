"use client";

import * as React from "react";
import Link from "next/link";
import { ReportDetail } from "../types";
import { ReportTimeline } from "./report-timeline";
import { ClassificationPanel } from "@/features/ai/classification-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Sparkles,
  ArrowLeft,
  Share2,
  Play,
  RotateCcw,
  CheckCircle2,
  Shield,
  Layers,
  FileText,
} from "lucide-react";
import { DAMAGE_CATEGORY_CONFIG, STATUS_DISPLAY_CONFIG } from "../status-machine";
import { formatDate, formatCoordinates } from "@/lib/utils";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { toast } from "sonner";
import { ThaiRepairRequestModal } from "./thai-repair-request-modal";
import { useRealtimeSubscription, broadcastDemoRealtimeEvent } from "@/features/realtime/use-realtime";
import { LiveStatusBadge } from "@/components/layout/live-status-badge";
import { getSafeImageUrl, CATEGORY_FALLBACK_IMAGES, DEFAULT_ROAD_DAMAGE_IMAGE } from "@/lib/constants/fallback-images";

export interface ReportDetailViewProps {
  initialReport: ReportDetail;
}

export function ReportDetailView({ initialReport }: ReportDetailViewProps) {
  const repository = useReportRepository();
  const [report, setReport] = React.useState<ReportDetail>(initialReport);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const [isGovFormOpen, setIsGovFormOpen] = React.useState(false);

  const categoryMeta =
    DAMAGE_CATEGORY_CONFIG[report.category] || DAMAGE_CATEGORY_CONFIG.other;
  const statusMeta =
    STATUS_DISPLAY_CONFIG[report.detailedStatus] || STATUS_DISPLAY_CONFIG.reported;

  // Realtime subscription for instant multi-session sync
  const { connectionStatus } = useRealtimeSubscription({
    channelName: `report:${report.id}`,
    onEvent: (event) => {
      if (event.reportId === report.id || event.publicId === report.publicId) {
        repository.getPublicReport(report.id).then((fresh) => {
          if (fresh) {
            setReport(fresh);
            toast.info(`Live Update: Incident status changed to ${STATUS_DISPLAY_CONFIG[fresh.detailedStatus]?.publicLabel || fresh.detailedStatus}`);
          }
        });
      }
    },
  });

  const handleSimulateUpdate = async () => {
    if (!repository.simulateNextUpdate) {
      toast.info("Status simulation is available in demo mode.");
      return;
    }

    setIsSimulating(true);
    try {
      const updated = await repository.simulateNextUpdate(report.id);
      setReport(updated);

      // Broadcast live event to all other tabs/windows
      broadcastDemoRealtimeEvent({
        type: "STATUS_TRANSITIONED",
        reportId: updated.id,
        publicId: updated.publicId,
        status: updated.detailedStatus,
        timestamp: new Date().toISOString(),
      });

      toast.success(
        `Report updated to: ${STATUS_DISPLAY_CONFIG[updated.detailedStatus]?.publicLabel || updated.detailedStatus}`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to simulate lifecycle transition.";
      toast.error(message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link & actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Community Map</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Official Thai Repair Request Petition Form (PDF) */}
          <Button
            type="button"
            onClick={() => setIsGovFormOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 border-brand/40 text-brand hover:bg-brand-soft bg-surface"
            title="สร้างหนังสือขอความอนุเคราะห์ซ่อมแซมถนน (แบบฟอร์มราชการ PDF)"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>หนังสือราชการ (PDF)</span>
          </Button>

          {/* Simulate next update button (Demo Mode) */}
          <Button
            type="button"
            onClick={handleSimulateUpdate}
            variant="soft-brand"
            size="sm"
            isLoading={isSimulating}
            className="text-xs font-bold gap-1.5"
            title="Advance this report to the next operational lifecycle status"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Simulate Next Update</span>
          </Button>

          <Button
            type="button"
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-brand bg-brand-soft px-2.5 py-0.5 rounded-lg">
                {report.publicId}
              </span>
              <LiveStatusBadge status={connectionStatus} />
              <span className="text-xs text-text-muted">
                Created {formatDate(report.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {report.operationalPriority && (
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Priority {report.operationalPriority.toUpperCase()}
                </span>
              )}
              <Badge variant={statusMeta.badgeVariant} size="md">
                {statusMeta.publicLabel}
              </Badge>
            </div>
          </div>

          {/* Canonical duplicate banner if marked duplicate */}
          {report.detailedStatus === "duplicate" && (
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between gap-3">
              <div>
                <strong className="block font-semibold">Incident Marked as Duplicate</strong>
                <span>This hazard report has been merged with a master incident ticket.</span>
              </div>
              {report.canonicalReportId && (
                <Link
                  href={`/reports/${report.canonicalReportId}`}
                  className="px-3 py-1 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-hover transition-colors whitespace-nowrap"
                >
                  View Canonical: {report.canonicalReportId}
                </Link>
              )}
            </div>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-text-secondary">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand" />
                <span className="font-medium text-text-primary">
                  {report.localityLabel || "Bangkok Metro Area"}
                </span>
                <span className="text-text-muted">
                  ({formatCoordinates(report.publicLocation.latitude, report.publicLocation.longitude)})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" size="sm">
                  {categoryMeta.label}
                </Badge>
              </div>
            </div>
          </div>

          {report.description && (
            <p className="text-sm text-text-secondary leading-relaxed pt-2">
              {report.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Grid: Media Gallery (Left) & AI Intel / Team Assignment (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Evidence Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Attached Evidence</span>
              <span className="text-xs font-normal text-text-muted">
                {report.media.length} {report.media.length === 1 ? "file" : "files"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const fallbackImg = CATEGORY_FALLBACK_IMAGES[report.category] || DEFAULT_ROAD_DAMAGE_IMAGE;
              const rawActive = report.media[activeMediaIndex]?.url || report.media[0]?.url || report.thumbnailUrl;
              const safeActive = getSafeImageUrl(rawActive, report.category);

              return (
                <>
                  <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-surface-muted border border-border">
                    <img
                      src={safeActive}
                      alt={report.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== fallbackImg) {
                          target.src = fallbackImg;
                        }
                      }}
                    />
                    {report.aiAnalysis?.labels && report.aiAnalysis.labels.length > 0 && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="brand" size="sm" className="bg-surface/90 backdrop-blur-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Roboflow Vision Detected
                        </Badge>
                      </div>
                    )}
                  </div>

                  {report.media.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {report.media.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setActiveMediaIndex(idx)}
                          className={`relative rounded-xl overflow-hidden w-16 h-16 shrink-0 border-2 transition-all ${
                            activeMediaIndex === idx ? "border-brand scale-105" : "border-border opacity-70"
                          }`}
                        >
                          <img
                            src={getSafeImageUrl(m.thumbnailUrl || m.url, report.category)}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== fallbackImg) {
                                target.src = fallbackImg;
                              }
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* AI Analysis & Maintenance Info */}
        <div className="space-y-6">
          {report.aiAnalysis && (
            <ClassificationPanel
              analysis={report.aiAnalysis}
            />
          )}

          {/* Assigned Operations Team if any */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand" />
                <span>Assigned Maintenance Team</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-text-secondary">
              <div className="font-semibold text-text-primary text-sm">
                {report.assignedTeam?.publicDisplayName || "Central Highway District Dispatch"}
              </div>
              <p>
                Responsible for road safety assessments, asphalt milling, and structural repairs.
              </p>
              {report.scheduledFor && (
                <div className="pt-2 border-t border-border-subtle text-brand font-medium">
                  Scheduled work window: {formatDate(report.scheduledFor)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chronological Lifecycle Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Repair Progress & Event History</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportTimeline events={report.events} />
        </CardContent>
      </Card>

      {/* Thai Government Official Repair Petition Form Modal (Printable/PDF) */}
      <ThaiRepairRequestModal
        report={report}
        isOpen={isGovFormOpen}
        onClose={() => setIsGovFormOpen(false)}
      />
    </div>
  );
}
