import { IReportRepository } from "./report-repository";
import {
  ReportSummary,
  ReportDetail,
  SubmitReportInput,
  TransitionStatusInput,
  MapBounds,
  MapFilterState,
  MediaItem,
} from "@/features/reports/types";
import {
  getStoredDemoReports,
  toReportSummary,
  createDemoReport,
  transitionDemoReportStatus,
  simulateNextDemoUpdate,
  resetStoredDemoReports,
} from "../demo/storage";

export class DemoReportRepository implements IReportRepository {
  async listPublicReports(params?: {
    bounds?: MapBounds;
    filters?: MapFilterState;
    limit?: number;
  }): Promise<ReportSummary[]> {
    const all = getStoredDemoReports();
    let filtered = [...all];

    if (params?.filters) {
      const { publicStatus, category, searchQuery } = params.filters;

      if (publicStatus && publicStatus !== "all") {
        filtered = filtered.filter((r) => r.publicStatus === publicStatus);
      }

      if (category && category !== "all") {
        filtered = filtered.filter((r) => r.category === category);
      }

      if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.title.toLowerCase().includes(query) ||
            r.localityLabel?.toLowerCase().includes(query) ||
            r.publicId.toLowerCase().includes(query) ||
            r.description?.toLowerCase().includes(query)
        );
      }
    }

    if (params?.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered.map(toReportSummary);
  }

  async getPublicReport(id: string): Promise<ReportDetail | null> {
    const all = getStoredDemoReports();
    const report = all.find((r) => r.id === id || r.publicId === id);
    return report || null;
  }

  async listMyReports(): Promise<ReportDetail[]> {
    // In demo mode, return all stored reports with recent ones first
    return getStoredDemoReports();
  }

  async submitReport(input: SubmitReportInput): Promise<ReportDetail> {
    return createDemoReport(input);
  }

  async transitionReport(input: TransitionStatusInput): Promise<ReportDetail> {
    return transitionDemoReportStatus(input);
  }

  async simulateNextUpdate(reportId: string): Promise<ReportDetail> {
    return simulateNextDemoUpdate(reportId);
  }

  async resetDemoData(): Promise<void> {
    resetStoredDemoReports();
  }

  async uploadMedia(file: File): Promise<MediaItem> {
    // In demo mode, convert to a base64 Data URL so it persists across page navigations and reloads in localStorage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          url: dataUrl,
          thumbnailUrl: dataUrl,
          mimeType: file.type || "image/jpeg",
          fileName: file.name,
          byteSize: file.size,
          isSanitized: true,
          createdAt: new Date().toISOString(),
        });
      };
      reader.onerror = () => {
        const objUrl = URL.createObjectURL(file);
        resolve({
          id: `med-${Date.now()}`,
          url: objUrl,
          thumbnailUrl: objUrl,
          mimeType: file.type || "image/jpeg",
          fileName: file.name,
          byteSize: file.size,
          isSanitized: true,
          createdAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    });
  }
}

export const demoReportRepository = new DemoReportRepository();
