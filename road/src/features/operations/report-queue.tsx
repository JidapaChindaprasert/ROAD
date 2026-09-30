"use client";

import * as React from "react";
import Link from "next/link";
import { ReportDetail, ReportStatus, OperationalPriority } from "@/features/reports/types";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { useAuth } from "@/features/auth/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import {
  ShieldAlert,
  MapPin,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  FileText,
  Lock,
  User,
  LogIn,
  RefreshCw,
} from "lucide-react";
import {
  STATUS_DISPLAY_CONFIG,
  DAMAGE_CATEGORY_CONFIG,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/features/reports/status-machine";
import { formatDate, formatRelativeTime, formatCoordinates } from "@/lib/utils";
import { toast } from "sonner";
import { ThaiRepairRequestModal } from "@/features/reports/components/thai-repair-request-modal";
import { useRealtimeSubscription, broadcastDemoRealtimeEvent } from "@/features/realtime/use-realtime";
import { getSafeImageUrl, CATEGORY_FALLBACK_IMAGES, DEFAULT_ROAD_DAMAGE_IMAGE } from "@/lib/constants/fallback-images";
import { isDemoMode } from "@/lib/env";

export function ReportQueue() {
  const repository = useReportRepository();
  const { user, isStaff, isAdmin, openAuthModal, switchDemoRole } = useAuth();
  const [reports, setReports] = React.useState<ReportDetail[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [activeReport, setActiveReport] = React.useState<ReportDetail | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<ReportStatus>("assessing");
  const [selectedPriority, setSelectedPriority] = React.useState<OperationalPriority>("p3");
  const [selectedTeam, setSelectedTeam] = React.useState<string>("หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)");
  const [canonicalId, setCanonicalId] = React.useState<string>("");
  const [publicNote, setPublicNote] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [govFormReport, setGovFormReport] = React.useState<ReportDetail | null>(null);

  const loadReports = React.useCallback(() => {
    repository.listMyReports().then(setReports);
  }, [repository]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Realtime subscription for multi-session live updates
  useRealtimeSubscription({
    channelName: "operations:reports",
    onEvent: (event) => {
      loadReports();
      toast.info(`Live Update: Incident ${event.publicId || event.reportId} changed status.`);
    },
  });

  const filteredReports = React.useMemo(() => {
    if (selectedStatus === "all") return reports;
    return reports.filter((r) => r.detailedStatus === selectedStatus);
  }, [reports, selectedStatus]);

  const handleOpenTransitionModal = (report: ReportDetail) => {
    setActiveReport(report);
    const possible = ALLOWED_STATUS_TRANSITIONS[report.detailedStatus] || ["assessing"];
    setTargetStatus(possible[0] || "assessing");
    setSelectedPriority(report.operationalPriority || "p3");
    setSelectedTeam(report.assignedTeam?.publicDisplayName || "หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)");
    setCanonicalId(report.canonicalReportId || "");
    setPublicNote("");
    setInternalNote("");
    setIsTransitionModalOpen(true);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;
    if (!publicNote.trim()) {
      toast.error("Public note is required for civic transparency.");
      return;
    }

    if (targetStatus === "assessing" && activeReport.detailedStatus === "resolved" && !internalNote.trim()) {
      toast.error("Reopening a resolved incident requires an internal staff justification note.");
      return;
    }

    if (targetStatus === "duplicate" && !canonicalId.trim()) {
      toast.error("Marking as duplicate requires specifying the canonical report ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      await repository.transitionReport({
        reportId: activeReport.id,
        targetStatus,
        publicNote: publicNote.trim(),
        internalNote: internalNote.trim() || undefined,
        expectedVersion: activeReport.version,
        operationalPriority: selectedPriority,
        assignedTeam: selectedTeam
          ? {
              id: `team-${selectedTeam.slice(0, 8)}`,
              name: selectedTeam,
              publicDisplayName: selectedTeam,
            }
          : undefined,
        canonicalReportId: targetStatus === "duplicate" ? canonicalId.trim() : undefined,
      });

      // Broadcast live event across active browser sessions
      broadcastDemoRealtimeEvent({
        type: "STATUS_TRANSITIONED",
        reportId: activeReport.id,
        publicId: activeReport.publicId,
        status: targetStatus,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Report status transitioned to: ${targetStatus}`);
      setIsTransitionModalOpen(false);
      loadReports();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update report status.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enforce staff/admin role verification
  if (!isStaff) {
    return (
      <div className="py-12 max-w-xl mx-auto space-y-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-text-primary tracking-tight">Staff Authorization Required</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            The municipal maintenance queue is restricted to authorized road maintenance crews and district engineers.
            {user ? (
              <span className="block mt-1">
                You are currently authenticated as <strong>{user.displayName}</strong> with role{" "}
                <span className="font-mono uppercase font-bold text-brand bg-brand-soft px-1.5 py-0.5 rounded">
                  {user.role}
                </span>.
              </span>
            ) : (
              <span className="block mt-1">
                Please sign in with your verified municipal staff credentials.
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isDemoMode ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => openAuthModal("switch_role")}
              className="gap-2 font-bold"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Switch Role to Staff (Demo)</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => openAuthModal("signin")}
              className="gap-2 font-bold"
            >
              <LogIn className="h-4 w-4" />
              <span>Staff Sign In</span>
            </Button>
          )}

          <Link href="/map">
            <Button variant="ghost">Back to Map</Button>
          </Link>
        </div>
        {!isDemoMode && (
          <p className="text-xs text-text-muted mt-2">
            * สิทธิ์เจ้าหน้าที่ปฏิบัติการต้องได้รับการแต่งตั้งโดยผู้ดูแลระบบผ่านระบบหลังบ้าน (Admin Console)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ops Header Banner */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Staff Operations Console</span>
            </div>
            {user && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs">
                <User className="h-3 w-3 text-amber-400" />
                <span>Operator: <strong>{user.displayName}</strong> ({user.role.toUpperCase()})</span>
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Municipal Road Maintenance Queue
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Inspect incident triage, review reported road hazards, assign engineering crews, and update repair timelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Total active incidents: <strong className="text-white">{reports.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-border">
        {["all", "reported", "acknowledged", "assessing", "scheduled", "repairing", "resolved"].map(
          (st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                selectedStatus === st
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
              }`}
            >
              {st}
            </button>
          )
        )}
      </div>

      {/* Incident Queue List */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const categoryMeta =
            DAMAGE_CATEGORY_CONFIG[report.category] || DAMAGE_CATEGORY_CONFIG.other;
          const statusMeta =
            STATUS_DISPLAY_CONFIG[report.detailedStatus] || STATUS_DISPLAY_CONFIG.reported;
          const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[report.detailedStatus] || [];

          return (
            <Card key={report.id} className="hover:border-brand/30 transition-all">
              <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-3 sm:gap-4 min-w-0 flex-1">
                  {report.thumbnailUrl && (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-muted shrink-0 border border-border">
                      <img
                        src={getSafeImageUrl(report.thumbnailUrl, report.category)}
                        alt={report.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = CATEGORY_FALLBACK_IMAGES[report.category] || DEFAULT_ROAD_DAMAGE_IMAGE;
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-md">
                        {report.publicId}
                      </span>
                      <Badge variant={statusMeta.badgeVariant} size="sm" className="shrink-0 whitespace-nowrap">
                        {statusMeta.publicLabel}
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-[11px] shrink-0">
                        {categoryMeta.label}
                      </Badge>
                      {report.operationalPriority && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                          Priority {report.operationalPriority.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-text-primary break-words">
                      {report.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span>{report.localityLabel || "Bangkok Central"}</span>
                        {report.exactLocation && (
                          <span className="text-[11px] text-text-muted font-mono">
                            ({formatCoordinates(report.exactLocation.latitude, report.exactLocation.longitude, 4)})
                          </span>
                        )}
                      </div>
                      <span>•</span>
                      <span>{formatRelativeTime(report.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-subtle">
                  {allowedTransitions.length > 0 && (
                    <Button
                      type="button"
                      onClick={() => handleOpenTransitionModal(report)}
                      variant="primary"
                      size="sm"
                      className="text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Update Status</span>
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGovFormReport(report)}
                      className="text-xs gap-1 border-brand/40 text-brand hover:bg-brand-soft"
                      title="พิมพ์หนังสือขอความอนุเคราะห์ซ่อมแซมถนน (แบบฟอร์มราชการ PDF)"
                    >
                      <FileText className="h-3 w-3" />
                      <span>พิมพ์หนังสือราชการ</span>
                    </Button>

                    <a href={`/reports/${report.id}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="text-xs">
                        View Incident
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transition Modal */}
      {activeReport && (
        <Dialog
          isOpen={isTransitionModalOpen}
          onClose={() => setIsTransitionModalOpen(false)}
          title={`Update Status: ${activeReport.publicId}`}
          description="Advance this incident along the verified municipal repair workflow."
        >
          <form onSubmit={handleExecuteTransition} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Target Status
              </label>
              <select
                aria-label="Target Status"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as ReportStatus)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {(ALLOWED_STATUS_TRANSITIONS[activeReport.detailedStatus] || []).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_DISPLAY_CONFIG[st]?.label || st}
                  </option>
                ))}
              </select>
            </div>

            {/* Reopening warning if transitioning from resolved -> assessing */}
            {activeReport.detailedStatus === "resolved" && targetStatus === "assessing" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Incident Reopening Notice</strong>
                  <span>Reopening an already resolved incident will notify citizen watchers. You must provide a clear justification in the internal note.</span>
                </div>
              </div>
            )}

            {/* Operational Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Operational Priority
              </label>
              <select
                aria-label="Operational Priority"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as OperationalPriority)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="p1">P1 - Critical (Immediate Hazard / Arterial Road)</option>
                <option value="p2">P2 - High (Heavy Disruption / Collector)</option>
                <option value="p3">P3 - Normal (Standard Neighborhood Road)</option>
                <option value="p4">P4 - Low (Cosmetic Wear / Preventative)</option>
              </select>
            </div>

            {/* Maintenance Team Assignment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Assigned Engineering Crew
              </label>
              <select
                aria-label="Assigned Engineering Crew"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)">หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)</option>
                <option value="หน่วยเคลื่อนที่เร็ว 2 (ฝ่ายโยธา กทม.)">หน่วยเคลื่อนที่เร็ว 2 (ฝ่ายโยธา กทม.)</option>
                <option value="กองช่างบูรณะทางหลวงชนบท">กองช่างบูรณะทางหลวงชนบท</option>
                <option value="ผู้รับเหมาซ่อมแซมฉุกเฉินเขตพระนคร">ผู้รับเหมาซ่อมแซมฉุกเฉินเขตพระนคร</option>
              </select>
            </div>

            {/* Canonical duplicate report ID if duplicate */}
            {targetStatus === "duplicate" && (
              <Input
                label="Canonical Report ID *"
                placeholder="e.g. ROAD-BKK-0001"
                value={canonicalId}
                onChange={(e) => setCanonicalId(e.target.value)}
                helperText="Specify the master report ID that this duplicate links to."
                required
              />
            )}

            <div>
              <Textarea
                label="Public Note (Visible on community timeline)"
                placeholder="e.g. Work crew Alpha #2 has arrived on site with asphalt compaction equipment."
                value={publicNote}
                onChange={(e) => setPublicNote(e.target.value)}
                required
                rows={3}
              />
            </div>

            <div>
              <Textarea
                label="Internal Staff Note (Private to Operations)"
                placeholder="e.g. Material batch #492, subcontracted to Central Paving."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTransitionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="font-bold"
              >
                Confirm Transition
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Official Thai Repair Request Petition Modal (Printable/PDF) */}
      {govFormReport && (
        <ThaiRepairRequestModal
          report={govFormReport}
          isOpen={!!govFormReport}
          onClose={() => setGovFormReport(null)}
        />
      )}
    </div>
  );
}
