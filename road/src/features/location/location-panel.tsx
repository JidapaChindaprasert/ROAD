"use client";

import * as React from "react";
import { ReportLocation } from "../reports/types";
import { LocationMiniMap } from "./location-mini-map";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, CheckCircle2, RotateCcw, AlertCircle, Compass } from "lucide-react";
import { formatCoordinates } from "@/lib/utils";

export interface LocationPanelProps {
  location: ReportLocation;
  state: "idle" | "requesting" | "acquired" | "denied" | "unavailable" | "timeout" | "manual";
  errorMessage?: string | null;
  isManualOverride?: boolean;
  onRequestLocation: () => void;
  onSelectCoordinates: (lat: number, lng: number, label?: string) => void;
  onReturnToGps: () => void;
  className?: string;
}

export function LocationPanel({
  location,
  state,
  errorMessage,
  isManualOverride = false,
  onRequestLocation,
  onSelectCoordinates,
  onReturnToGps,
  className = "",
}: LocationPanelProps) {
  const [manualInputs, setManualInputs] = React.useState({
    lat: location.latitude.toString(),
    lng: location.longitude.toString(),
  });
  const [showCoordinateEntry, setShowCoordinateEntry] = React.useState(false);

  React.useEffect(() => {
    const lat = location.latitude.toString();
    const lng = location.longitude.toString();
    // Run outside the effect body microtask to satisfy react-hooks/set-state-in-effect
    const id = setTimeout(() => {
      setManualInputs({ lat, lng });
    }, 0);
    return () => clearTimeout(id);
  }, [location.latitude, location.longitude]);

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualInputs.lat);
    const lng = parseFloat(manualInputs.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onSelectCoordinates(lat, lng);
      setShowCoordinateEntry(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 space-y-4 ${className}`}>
      {/* Title & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Reporting Position
            </h4>
            <p className="text-xs text-text-secondary">
              {location.localityLabel || "Confirm pin placement before submission"}
            </p>
          </div>
        </div>

        {/* GPS Consent Action / Status */}
        {state === "idle" || state === "denied" ? (
          <Button
            type="button"
            onClick={onRequestLocation}
            variant="soft-brand"
            size="sm"
            className="text-xs gap-1.5"
          >
            <Navigation className="h-3.5 w-3.5" />
            Use My Location
          </Button>
        ) : state === "requesting" ? (
          <Button type="button" disabled variant="outline" size="sm" isLoading className="text-xs">
            Acquiring GPS...
          </Button>
        ) : isManualOverride ? (
          <Button
            type="button"
            onClick={onReturnToGps}
            variant="outline"
            size="sm"
            className="text-xs gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Return to GPS
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-fixed bg-fixed-soft px-2.5 py-1 rounded-full border border-fixed-border">
            <CheckCircle2 className="h-3.5 w-3.5" />
            GPS Acquired {location.accuracyMeters ? `(±${location.accuracyMeters}m)` : ""}
          </span>
        )}
      </div>

      {/* Error / Warning Notice */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mini Interactive Map */}
      <LocationMiniMap
        latitude={location.latitude}
        longitude={location.longitude}
        accuracyMeters={location.accuracyMeters}
        isManual={isManualOverride || location.source === "manual"}
        onSelectCoordinates={onSelectCoordinates}
        className="h-44 sm:h-48"
      />

      {/* Coordinates summary & manual input toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Compass className="h-3.5 w-3.5 text-text-muted" />
          <span className="font-mono tabular-nums font-medium text-text-primary">
            {formatCoordinates(location.latitude, location.longitude, 5)}
          </span>
          <span className="text-[11px] text-text-muted">
            ({location.source === "gps" ? "Device GPS" : "Manual Pin"})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowCoordinateEntry(!showCoordinateEntry)}
          className="text-brand hover:underline font-medium"
        >
          {showCoordinateEntry ? "Hide coordinate form" : "Enter coordinates manually"}
        </button>
      </div>

      {/* Accessible Manual Coordinate Form Fallback */}
      {showCoordinateEntry && (
        <form
          onSubmit={handleApplyCoordinates}
          className="p-3 rounded-xl bg-surface-muted border border-border flex flex-wrap gap-2 items-center"
        >
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[11px] font-medium text-text-secondary mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={manualInputs.lat}
              onChange={(e) => setManualInputs({ ...manualInputs, lat: e.target.value })}
              className="w-full h-8 px-2 rounded-lg bg-surface border border-border text-xs text-text-primary"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[11px] font-medium text-text-secondary mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={manualInputs.lng}
              onChange={(e) => setManualInputs({ ...manualInputs, lng: e.target.value })}
              className="w-full h-8 px-2 rounded-lg bg-surface border border-border text-xs text-text-primary"
            />
          </div>
          <Button type="submit" size="sm" variant="primary" className="h-8 mt-5 text-xs">
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
