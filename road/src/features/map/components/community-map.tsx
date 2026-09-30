"use client";

import * as React from "react";
import { ReportSummary, MapFilterState } from "@/features/reports/types";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { MapFilters } from "./map-filters";
import { CityMap } from "./city-map";
import { ReportListView } from "./report-list-view";
import { MapLegend } from "./map-legend";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSubscription } from "@/features/realtime/use-realtime";

export function CommunityMap() {
  const router = useRouter();
  const repository = useReportRepository();

  const [filters, setFilters] = React.useState<MapFilterState>({
    publicStatus: "all",
    category: "all",
    searchQuery: "",
  });

  const [viewMode, setViewMode] = React.useState<"map" | "list">("map");
  const [reports, setReports] = React.useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load reports based on filters
  const loadReports = React.useCallback(() => {
    repository
      .listPublicReports({ filters })
      .then((data) => {
        setReports(data);
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
            onSelectReport={(rep) => {
              router.push(`/reports/${rep.id}`);
            }}
          />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-20 hidden sm:block">
            <MapLegend />
          </div>
        </div>
      ) : (
        <ReportListView
          reports={reports}
          onSelectReport={(rep) => {
            router.push(`/reports/${rep.id}`);
          }}
        />
      )}
    </div>
  );
}
