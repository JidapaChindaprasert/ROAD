"use client";

import * as React from "react";
import { PublicStatus, DamageCategory, MapFilterState } from "@/features/reports/types";
import { Search, SlidersHorizontal, Map, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAMAGE_CATEGORY_CONFIG } from "@/features/reports/status-machine";

export interface MapFiltersProps {
  filters: MapFilterState;
  onFilterChange: (filters: MapFilterState) => void;
  viewMode: "map" | "list";
  onViewModeChange: (mode: "map" | "list") => void;
  reportCount: number;
  className?: string;
}

export function MapFilters({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  reportCount,
  className = "",
}: MapFiltersProps) {
  const statusOptions: Array<{ value: PublicStatus | "all"; label: string }> = [
    { value: "all", label: "All Statuses" },
    { value: "reported", label: "Reported" },
    { value: "repairing", label: "Repairing" },
    { value: "fixed", label: "Fixed" },
  ];

  const categoryEntries = Object.entries(DAMAGE_CATEGORY_CONFIG) as Array<
    [DamageCategory, (typeof DAMAGE_CATEGORY_CONFIG)[DamageCategory]]
  >;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Bar: Search, Category Selector & View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full md:max-w-xs lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by road name, street, or ID..."
            value={filters.searchQuery || ""}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand shadow-2xs"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
              aria-label="Clear search query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controls: Category Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Category Dropdown */}
          <select
            aria-label="Filter by damage category"
            value={filters.category || "all"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                category: e.target.value as DamageCategory | "all",
              })
            }
            className="flex-1 min-w-0 md:flex-initial md:w-48 h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-sm font-medium text-text-primary truncate focus:outline-none focus:ring-2 focus:ring-brand shadow-2xs cursor-pointer"
          >
            <option value="all">All Damage Types</option>
            {categoryEntries.map(([cat, config]) => (
              <option key={cat} value={cat}>
                {config.label}
              </option>
            ))}
          </select>

          {/* View Mode Toggle (Map vs Accessible List) */}
          <div
            className="flex items-center h-10 rounded-xl bg-surface border border-border p-1 shrink-0 shadow-2xs"
            role="tablist"
            aria-label="View mode toggle"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "map"}
              onClick={() => onViewModeChange("map")}
              className={`h-full flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all shrink-0 select-none ${
                viewMode === "map"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-muted/60"
              }`}
              title="Switch to map view"
            >
              <Map className="h-3.5 w-3.5 shrink-0" />
              <span>Map</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
              className={`h-full flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all shrink-0 select-none ${
                viewMode === "list"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-muted/60"
              }`}
              title="Switch to list view"
            >
              <List className="h-3.5 w-3.5 shrink-0" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Pills & Report Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full"
          role="tablist"
          aria-label="Filter reports by status"
        >
          {statusOptions.map((opt) => {
            const isSelected = (filters.publicStatus || "all") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onFilterChange({ ...filters, publicStatus: opt.value })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 select-none ${
                  isSelected
                    ? "bg-brand-soft text-brand font-bold border border-brand/30 shadow-xs"
                    : "bg-surface text-text-secondary border border-border hover:bg-surface-muted"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs font-medium text-text-muted shrink-0">
          Showing <strong className="text-text-primary">{reportCount}</strong> reports
        </span>
      </div>
    </div>
  );
}
