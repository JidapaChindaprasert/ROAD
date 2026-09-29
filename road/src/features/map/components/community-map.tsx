"use client";

import * as React from "react";
import { ReportSummary, MapFilterState } from "@/features/reports/types";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { MapFilters } from "./map-filters";
import { CityMap } from "./city-map";
import { ReportListView } from "./report-list-view";
import { MapLegend } from "./map-legend";
import { SelectedReportPanel } from "./selected-report-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSubscription } from "@/features/realtime/use-realtime";

export function CommunityMap() {
  const repository = useReportRepository();

  const [filters, setFilters] = React.useState<MapFilterState>({
    publicStatus: "all",
    category: "all",
    searchQuery: "",
  });

  const [viewMode, setViewMode] = React.useState<"map" | "list">("map");
  const [reports, setReports] = React.useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedReport, setSelectedReport] = React.useState<ReportSummary | null>(null);

  // Load reports based on filters
  const loadReports = React.useCallback(() => {
    repository
      .listPublicReports({ filters })
      .then((data) => {
        setReports(data);
        setSelectedReport((prev) =>
          prev ? data.find((r) => r.id === prev.id) || null : null
        );
      })
      .catch((err) => {
        console.error("Failed to load community map reports:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [repository, filters]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Subscribe to realtime updates for multi-session sync
  useRealtimeSubscription({
    channelName: "public:reports",
    onEvent: () => {
      loadReports();
    },
  });

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <MapFilters
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        reportCount={reports.length}
      />

      {/* Main View Area */}
      {isLoading ? (
        <Skeleton className="w-full h-[520px] rounded-3xl" />
      ) : viewMode === "map" ? (
        <div className="relative">
          {/* Interactive City Map */}
          <CityMap
            reports={reports}
            selectedReportId={selectedReport?.id}
            onSelectReport={setSelectedReport}
          />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-20 hidden sm:block">
            <MapLegend />
          </div>

          {/* Floating Selected Report Panel (Mobile Bottom Sheet / Desktop Floating Panel) */}
          {selectedReport && (
            <div className="absolute inset-x-2 bottom-2 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto z-30 w-auto sm:w-full sm:max-w-sm max-h-[85%] sm:max-h-[580px] overflow-y-auto">
              <SelectedReportPanel
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            </div>
          )}
        </div>
      ) : (
        <ReportListView
          reports={reports}
          onSelectReport={(rep) => setSelectedReport(rep)}
        />
      )}
    </div>
  );
}
