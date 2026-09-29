import { ReportDetail, ReportSummary, SubmitReportInput, TransitionStatusInput, DamageCategory } from "@/features/reports/types";
import { SEED_REPORTS } from "./seed";
import { PUBLIC_STATUS_MAPPING } from "@/features/reports/status-machine";

const STORAGE_KEY = "road_demo_reports_v1";

// In-memory cache for server-side rendering or non-browser environments
let memoryReports: ReportDetail[] = [...SEED_REPORTS];

export function getStoredDemoReports(): ReportDetail[] {
  if (typeof window === "undefined") {
    return memoryReports;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REPORTS));
      return SEED_REPORTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Could not read demo reports from localStorage, using memory cache", err);
    return memoryReports;
  }
}

export function saveStoredDemoReports(reports: ReportDetail[]): void {
  memoryReports = [...reports];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (err) {
      console.warn("Could not save demo reports to localStorage", err);
    }
  }
}

export function resetStoredDemoReports(): ReportDetail[] {
  memoryReports = [...SEED_REPORTS];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REPORTS));
    } catch (err) {
      console.warn("Could not reset demo reports in localStorage", err);
    }
  }
  return SEED_REPORTS;
}

export function toReportSummary(detail: ReportDetail): ReportSummary {
  return {
    id: detail.id,
    publicId: detail.publicId,
    title: detail.title,
    category: detail.category,
    publicStatus: detail.publicStatus,
    detailedStatus: detail.detailedStatus,
    publicLatitude: detail.publicLocation.latitude,
    publicLongitude: detail.publicLocation.longitude,
    localityLabel: detail.localityLabel,
    thumbnailUrl: detail.thumbnailUrl || (detail.media.length > 0 ? detail.media[0].thumbnailUrl || detail.media[0].url : undefined),
    operationalPriority: detail.operationalPriority,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export function createDemoReport(input: SubmitReportInput): ReportDetail {
  const reports = getStoredDemoReports();
  const reportNumber = 840 + reports.length + 1;
  const publicId = `RD-2026-${reportNumber}`;
  const now = new Date().toISOString();

  const category: DamageCategory = input.category || input.aiAnalysis?.primaryCategory || "pothole";
  const title = input.description 
    ? (input.description.length > 40 ? input.description.slice(0, 40) + "..." : input.description)
    : `Reported ${category.replace("_", " ")} on ${input.location.localityLabel || "Bangkok Road"}`;

  const newReport: ReportDetail = {
    id: `rep-demo-${Date.now()}`,
    publicId,
    title,
    category,
    publicStatus: "reported",
    detailedStatus: "reported",
    publicLatitude: Number(input.location.latitude.toFixed(4)),
    publicLongitude: Number(input.location.longitude.toFixed(4)),
    localityLabel: input.location.localityLabel || "Bangkok Central",
    description: input.description,
    locationContext: input.locationContext,
    exactLocation: input.location,
    publicLocation: {
      latitude: Number(input.location.latitude.toFixed(4)),
      longitude: Number(input.location.longitude.toFixed(4)),
      localityLabel: input.location.localityLabel || "Bangkok Central",
      isGeneralized: true,
    },
    thumbnailUrl: input.media[0]?.thumbnailUrl || input.media[0]?.url,
    media: input.media,
    aiAnalysis: input.aiAnalysis,
    operationalPriority: "p2",
    events: [
      {
        id: `evt-demo-${Date.now()}`,
        reportId: `rep-demo-${Date.now()}`,
        toStatus: "reported",
        publicNote: "Citizen incident report submitted with evidence and confirmed location.",
        actorName: "Resident Reporter (You)",
        actorRole: "reporter",
        createdAt: now,
      },
    ],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const updatedReports = [newReport, ...reports];
  saveStoredDemoReports(updatedReports);
  return newReport;
}

export function transitionDemoReportStatus(input: TransitionStatusInput): ReportDetail {
  const reports = getStoredDemoReports();
  const index = reports.findIndex((r) => r.id === input.reportId);
  if (index === -1) {
    throw new Error(`Report with id ${input.reportId} not found`);
  }

  const existing = reports[index];

  if (input.expectedVersion !== undefined && existing.version !== input.expectedVersion) {
    throw new Error(
      `Conflict: Report has been modified by another operator (expected version ${input.expectedVersion}, current version is ${existing.version})`
    );
  }

  const now = new Date().toISOString();
  const publicStatus = PUBLIC_STATUS_MAPPING[input.targetStatus];

  const newEvent = {
    id: `evt-trans-${Date.now()}`,
    reportId: existing.id,
    fromStatus: existing.detailedStatus,
    toStatus: input.targetStatus,
    publicNote: input.publicNote,
    internalNote: input.internalNote,
    actorName: "Operations Desk",
    actorRole: "staff" as const,
    scheduledFor: input.scheduledFor,
    resolutionEvidenceUrl: input.resolutionEvidenceUrl,
    createdAt: now,
  };

  const updated: ReportDetail = {
    ...existing,
    detailedStatus: input.targetStatus,
    publicStatus,
    events: [...existing.events, newEvent],
    scheduledFor: input.scheduledFor || existing.scheduledFor,
    resolvedAt: input.targetStatus === "resolved" ? now : existing.resolvedAt,
    operationalPriority: input.operationalPriority || existing.operationalPriority,
    assignedTeam: input.assignedTeam || existing.assignedTeam,
    canonicalReportId: input.canonicalReportId || existing.canonicalReportId,
    version: existing.version + 1,
    updatedAt: now,
  };

  reports[index] = updated;
  saveStoredDemoReports(reports);
  return updated;
}

export function simulateNextDemoUpdate(reportId: string): ReportDetail {
  const reports = getStoredDemoReports();
  const report = reports.find((r) => r.id === reportId);
  if (!report) throw new Error("Report not found");

  const transitions: Record<string, { next: ReportDetail["detailedStatus"]; note: string }> = {
    reported: {
      next: "acknowledged",
      note: "Operations team acknowledged report and assigned priority assessment.",
    },
    acknowledged: {
      next: "assessing",
      note: "Field engineer Somchai dispatched to evaluate roadbed integrity.",
    },
    assessing: {
      next: "scheduled",
      note: "Repair work crew scheduled for asphalt cold-milling and resurfacing.",
    },
    scheduled: {
      next: "repairing",
      note: "Active road maintenance crew and asphalt compaction rollers on site.",
    },
    repairing: {
      next: "resolved",
      note: "Surface resurfacing complete, cured, and road fully reopened to traffic.",
    },
    resolved: {
      next: "assessing",
      note: "Staff reopened report following community follow-up inspection request.",
    },
  };

  const current = report.detailedStatus;
  const target = transitions[current] || {
    next: "acknowledged",
    note: "Operations team re-evaluated report status.",
  };

  return transitionDemoReportStatus({
    reportId,
    targetStatus: target.next,
    publicNote: target.note,
    expectedVersion: report.version,
  });
}
