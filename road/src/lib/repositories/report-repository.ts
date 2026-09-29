import {
  ReportSummary,
  ReportDetail,
  SubmitReportInput,
  TransitionStatusInput,
  MapBounds,
  MapFilterState,
  MediaItem,
} from "@/features/reports/types";

export interface IReportRepository {
  listPublicReports(params?: {
    bounds?: MapBounds;
    filters?: MapFilterState;
    limit?: number;
  }): Promise<ReportSummary[]>;

  getPublicReport(id: string): Promise<ReportDetail | null>;

  listMyReports(): Promise<ReportDetail[]>;

  submitReport(input: SubmitReportInput): Promise<ReportDetail>;

  transitionReport(input: TransitionStatusInput): Promise<ReportDetail>;

  simulateNextUpdate?(reportId: string): Promise<ReportDetail>;

  resetDemoData?(): Promise<void>;

  uploadMedia?(file: File): Promise<MediaItem>;
}
