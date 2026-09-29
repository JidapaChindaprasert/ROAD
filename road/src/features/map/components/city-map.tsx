"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ReportSummary } from "@/features/reports/types";
import {
  Search,
  MapPin,
  Crosshair,
  LocateFixed,
  Plus,
  Minus,
  RotateCcw,
  X,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface CityMapProps {
  reports: ReportSummary[];
  selectedReportId?: string | null;
  onSelectReport?: (report: ReportSummary) => void;
  onSelectLocation?: (coords: { lat: number; lng: number; label?: string }) => void;
  className?: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  enableReportAction?: boolean;
}

interface GeocodingResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

interface SelectedTarget {
  lat: number;
  lng: number;
  label: string;
}

// Default center: Bangkok central
const DEFAULT_BANGKOK_CENTER: [number, number] = [100.5018, 13.7563];
const DEFAULT_ZOOM = 12;

export function CityMap({
  reports = [],
  selectedReportId,
  onSelectReport,
  onSelectLocation,
  className = "",
  initialCenter = DEFAULT_BANGKOK_CENTER,
  initialZoom = DEFAULT_ZOOM,
  enableReportAction = true,
}: CityMapProps) {
  const router = useRouter();
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const reportMarkersRef = React.useRef<maplibregl.Marker[]>([]);
  const targetMarkerRef = React.useRef<maplibregl.Marker | null>(null);

  // Map state
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);

  // Search state (Feature 1 & Feature 3)
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<GeocodingResult[]>([]);
  const [showSearchResults, setShowSearchResults] = React.useState(false);

  // Selected Target state (Feature 2)
  const [selectedTarget, setSelectedTarget] = React.useState<SelectedTarget | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = React.useState(false);
  const [copiedCoords, setCopiedCoords] = React.useState(false);

  // Coordinate Search Modal state (Feature 3)
  const [showCoordDialog, setShowCoordDialog] = React.useState(false);
  const [customLat, setCustomLat] = React.useState("13.7563");
  const [customLng, setCustomLng] = React.useState("100.5018");

  // Handle Location Selection (Reverse Geocode + Target Pin)
  const handleLocationSelect = React.useCallback(
    async (lat: number, lng: number, manualLabel?: string) => {
      setSelectedTarget({
        lat,
        lng,
        label: manualLabel || "กำลังค้นหาชื่อสถานที่...",
      });

      // Update or create target marker on map
      if (mapRef.current) {
        if (!targetMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "road-target-marker";
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <span class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></span>
              <div class="w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="22" y1="12" x2="18" y2="12"></line>
                  <line x1="6" y1="12" x2="2" y2="12"></line>
                  <line x1="12" y1="6" x2="12" y2="2"></line>
                  <line x1="12" y1="22" x2="12" y2="18"></line>
                </svg>
              </div>
            </div>
          `;
          targetMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
        } else {
          targetMarkerRef.current.setLngLat([lng, lat]);
        }
      }

      if (manualLabel) return;

      // Reverse geocode via OpenStreetMap Nominatim
      setIsReverseGeocoding(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
          {
            headers: {
              "Accept-Language": "th,en",
              "User-Agent": "ROAD-Damage-Reporter/1.0",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          let niceLabel = "";
          if (data.address) {
            const addr = data.address;
            const road = addr.road || addr.street || addr.pedestrian || "";
            const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.district || "";
            const city = addr.city || addr.town || addr.province || addr.state || "";
            const parts = [road, suburb, city].filter(Boolean);
            niceLabel = parts.join(", ") || data.display_name.split(",").slice(0, 3).join(", ");
          } else if (data.display_name) {
            niceLabel = data.display_name.split(",").slice(0, 3).join(", ");
          }

          setSelectedTarget({
            lat,
            lng,
            label: niceLabel || `${lat}, ${lng}`,
          });
        }
      } catch (err) {
        console.warn("Reverse geocode failed:", err);
        setSelectedTarget((prev) =>
          prev ? { ...prev, label: `พิกัด ${lat}, ${lng}` } : null
        );
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    []
  );

  const locationSelectRef = React.useRef(handleLocationSelect);
  React.useEffect(() => {
    locationSelectRef.current = handleLocationSelect;
  }, [handleLocationSelect]);

  // Clear target location
  const handleClearTarget = () => {
    setSelectedTarget(null);
    if (targetMarkerRef.current) {
      targetMarkerRef.current.remove();
      targetMarkerRef.current = null;
    }
  };

  // Initialize Map
  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 3,
        maxZoom: 19,
        attributionControl: false,
      });

      // Add compact attribution
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", () => {
        setIsMapLoaded(true);
        map.resize();
      });

      map.on("error", (e) => {
        console.warn("MapLibre notice:", e);
      });

      // Click to select location (Feature 2)
      map.on("click", (e) => {
        const originalEvent = e.originalEvent as MouseEvent;
        const targetElement = originalEvent.target as HTMLElement;
        if (targetElement.closest(".road-report-marker")) {
          return; // Ignore clicks on report markers
        }

        const lat = Number(e.lngLat.lat.toFixed(6));
        const lng = Number(e.lngLat.lng.toFixed(6));
        locationSelectRef.current(lat, lng);
      });

      mapRef.current = map;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load map canvas";
      queueMicrotask(() => {
        setMapError(msg);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCenter, initialZoom]);

  // Sync Community Reports Markers
  React.useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear old markers
    reportMarkersRef.current.forEach((marker) => marker.remove());
    reportMarkersRef.current = [];

    // Create markers for reports
    reports.forEach((report) => {
      const lat = report.publicLatitude;
      const lng = report.publicLongitude;
      if (typeof lat !== "number" || typeof lng !== "number") return;

      const isSelected = selectedReportId === report.id;

      // Status color & badge icon
      let statusBg = "bg-amber-500 border-amber-600";
      let pingColor = "bg-amber-400";
      let statusIconSvg = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;

      if (report.publicStatus === "repairing") {
        statusBg = "bg-indigo-600 border-indigo-700";
        pingColor = "bg-indigo-400";
        statusIconSvg = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        `;
      } else if (report.publicStatus === "fixed") {
        statusBg = "bg-emerald-600 border-emerald-700";
        pingColor = "bg-emerald-400";
        statusIconSvg = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      }

      const el = document.createElement("div");
      el.className = "road-report-marker cursor-pointer group transition-transform duration-200";
      el.style.transformOrigin = "bottom center";

      el.innerHTML = `
        <div class="relative flex items-center justify-center ${isSelected ? "scale-125 z-30" : "hover:scale-115"}">
          ${isSelected ? `<span class="absolute w-8 h-8 rounded-full ${pingColor} opacity-75 animate-ping"></span>` : ""}
          <div class="w-7 h-7 rounded-full ${statusBg} text-white border-2 border-white shadow-lg flex items-center justify-center">
            ${statusIconSvg}
          </div>
          <!-- Tooltip on hover -->
          <div class="absolute bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-40 whitespace-nowrap">
            <div class="bg-gray-900/95 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-xl backdrop-blur-sm border border-gray-700/50">
              <span class="font-bold text-amber-300 capitalize">${report.category}</span>: ${report.title.slice(0, 30)}
            </div>
            <div class="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5"></div>
          </div>
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onSelectReport) {
          onSelectReport(report);
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!);

      reportMarkersRef.current.push(marker);
    });
  }, [reports, selectedReportId, onSelectReport, isMapLoaded]);

  // Execute Search (Feature 1: Search Area & Feature 3: Coordinate Parsing)
  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Feature 3: Check if input looks like coordinates (e.g. "13.7563, 100.5018" or "13.7563 100.5018")
    const coordMatch = query.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        flyToCoordinates(lat, lng, `พิกัด ${lat}, ${lng}`);
        setShowSearchResults(false);
        return;
      }
    }

    // Feature 1: Area Geocoding Search via OpenStreetMap Nominatim
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=th&limit=5`,
        {
          headers: {
            "Accept-Language": "th,en",
            "User-Agent": "ROAD-Damage-Reporter/1.0",
          },
        }
      );

      if (response.ok) {
        let data: GeocodingResult[] = await response.json();
        // Fallback search without country filter if 0 results
        if (!data || data.length === 0) {
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&limit=5`,
            {
              headers: {
                "Accept-Language": "th,en",
                "User-Agent": "ROAD-Damage-Reporter/1.0",
              },
            }
          );
          if (fallbackRes.ok) {
            data = await fallbackRes.json();
          }
        }
        setSearchResults(data || []);
        setShowSearchResults(true);
        if (data.length === 0) {
          toast.info("ไม่พบสถานที่ที่ค้นหา ลองระบุชื่อถนนหรือย่านที่ชัดเจนขึ้น");
        }
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
      toast.error("การค้นหาสถานที่ขัดข้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSearching(false);
    }
  };

  // Fly to selected coordinate and set target
  const flyToCoordinates = (lat: number, lng: number, label?: string) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 16,
      essential: true,
      duration: 1500,
    });
    handleLocationSelect(lat, lng, label);
  };

  // Handle Geolocation (Locate Me)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }

    toast.info("กำลังดึงพิกัดตำแหน่งปัจจุบันของคุณ...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        flyToCoordinates(latitude, longitude, "ตำแหน่งปัจจุบันของคุณ");
        toast.success("พบตำแหน่งของคุณแล้ว");
      },
      (err) => {
        console.warn("GPS error:", err);
        toast.error("ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ กรุณาอนุญาตสิทธิ์ในเบราว์เซอร์");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reset View to Default Center
  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: initialCenter,
      zoom: initialZoom,
      duration: 1200,
    });
  };

  // Copy coordinates to clipboard
  const handleCopyCoordinates = () => {
    if (!selectedTarget) return;
    const text = `${selectedTarget.lat}, ${selectedTarget.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    toast.success(`คัดลอกพิกัด ${text} แล้ว`);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Trigger Report Creation at Selected Spot (Feature 2)
  const handleProceedToReport = () => {
    if (!selectedTarget) return;

    if (onSelectLocation) {
      onSelectLocation({
        lat: selectedTarget.lat,
        lng: selectedTarget.lng,
        label: selectedTarget.label,
      });
      return;
    }

    // Direct navigation to report creation wizard with prefilled coordinates
    const url = `/report/new?lat=${selectedTarget.lat}&lng=${selectedTarget.lng}&label=${encodeURIComponent(
      selectedTarget.label
    )}`;
    router.push(url);
  };

  return (
    <div
      className={`relative w-full h-[520px] rounded-3xl overflow-hidden border border-border shadow-inner bg-slate-100 ${className}`}
    >
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Skeleton Overlay */}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/90 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm font-semibold text-text-secondary">กำลังโหลดแผนที่ OpenFreeMap...</p>
        </div>
      )}

      {/* Map Error Banner */}
      {mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
          <h4 className="text-base font-bold text-text-primary">ไม่สามารถโหลดแผนที่ได้</h4>
          <p className="text-xs text-text-muted mt-1 max-w-sm">{mapError}</p>
        </div>
      )}

      {/* Top Search & Filter Bar (Feature 1 & Feature 3) */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-4 sm:w-96 z-20">
        <div className="relative">
          <form
            onSubmit={handleExecuteSearch}
            className="flex items-center gap-1.5 p-1.5 bg-surface/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-lg"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาพื้นที่, ถนน, หรือพิกัด..."
                className="w-full pl-9 pr-7 py-2 text-xs sm:text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-text-primary placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="absolute right-2 p-1 text-text-muted hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Coordinate Search Button (Feature 3) */}
            <button
              type="button"
              onClick={() => setShowCoordDialog(!showCoordDialog)}
              title="ค้นหาด้วยพิกัด GPS"
              className={`p-2 rounded-xl border transition-colors ${
                showCoordDialog
                  ? "bg-primary text-white border-primary"
                  : "bg-surface-secondary/70 hover:bg-surface-secondary text-text-secondary border-border/60"
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Search Submit Button */}
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>ค้นหา</span>
              )}
            </button>
          </form>

          {/* Search Results Dropdown (Feature 1) */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 inset-x-0 bg-surface/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-xl overflow-hidden z-30 max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-border/60 text-[11px] font-semibold text-text-muted flex justify-between items-center">
                <span>ผลการค้นหาสถานที่ ({searchResults.length})</span>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-border/40">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    onClick={() => {
                      const lat = parseFloat(item.lat);
                      const lng = parseFloat(item.lon);
                      flyToCoordinates(lat, lng, item.display_name.split(",")[0]);
                      setShowSearchResults(false);
                      setSearchQuery(item.display_name.split(",")[0]);
                    }}
                    className="w-full text-left p-3 hover:bg-primary/5 transition-colors flex items-start gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {item.display_name.split(",")[0]}
                      </p>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {item.display_name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coordinate Direct Input Popover (Feature 3) */}
          {showCoordDialog && (
            <div className="absolute top-full mt-2 inset-x-0 bg-surface/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-2xl p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text-primary">ค้นหาจากพิกัด (Coordinates)</span>
                </div>
                <button
                  onClick={() => setShowCoordDialog(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Latitude (ละติจูด)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="13.7563"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Longitude (ลองจิจูด)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="100.5018"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="mb-3">
                <span className="text-[10px] text-text-muted font-medium block mb-1.5">
                  จุดสำคัญยอดนิยม:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { name: "สยาม", lat: 13.7456, lng: 100.5342 },
                    { name: "อโศก", lat: 13.7371, lng: 100.5604 },
                    { name: "อนุสาวรีย์ชัยฯ", lat: 13.7649, lng: 100.5383 },
                    { name: "สนามหลวง", lat: 13.7553, lng: 100.493 },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setCustomLat(preset.lat.toString());
                        setCustomLng(preset.lng.toString());
                      }}
                      className="px-2 py-0.5 text-[10px] rounded-lg bg-surface-secondary hover:bg-surface-secondary/80 text-text-secondary border border-border/50"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const lat = parseFloat(customLat);
                  const lng = parseFloat(customLng);
                  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    toast.error("กรุณาระบุพิกัดที่ถูกต้อง (-90 ถึง 90 และ -180 ถึง 180)");
                    return;
                  }
                  flyToCoordinates(lat, lng, `พิกัด ${lat}, ${lng}`);
                  setShowCoordDialog(false);
                }}
                className="w-full py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>บินไปยังพิกัดนี้</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Map Navigation Controls (Zoom / Geolocation / Reset) */}
      <div className="absolute top-20 right-3 sm:right-4 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom In (ซูมเข้า)"
          className="w-9 h-9 bg-surface/90 backdrop-blur-md rounded-xl border border-border/80 shadow-md flex items-center justify-center text-text-primary hover:bg-surface transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom Out (ซูมออก)"
          className="w-9 h-9 bg-surface/90 backdrop-blur-md rounded-xl border border-border/80 shadow-md flex items-center justify-center text-text-primary hover:bg-surface transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px bg-border/60 my-0.5" />
        <button
          type="button"
          onClick={handleLocateMe}
          title="ตำแหน่งปัจจุบันของฉัน (GPS)"
          className="w-9 h-9 bg-surface/90 backdrop-blur-md rounded-xl border border-border/80 shadow-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          title="รีเซ็ตมุมมองแผนที่"
          className="w-9 h-9 bg-surface/90 backdrop-blur-md rounded-xl border border-border/80 shadow-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Instruction Badge when no target selected */}
      {!selectedTarget && (
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden md:block">
          <div className="bg-surface/85 backdrop-blur-sm border border-border/70 rounded-full px-3 py-1.5 shadow-sm text-[11px] text-text-muted flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>คลิกบนแผนที่เพื่อเลือกตำแหน่งแจ้งเหตุ</span>
          </div>
        </div>
      )}

      {/* Floating Target Action Card (Feature 2: เลือกตำแหน่งที่จะ report) */}
      {selectedTarget && (
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-auto sm:left-4 sm:bottom-4 z-25 sm:max-w-md w-auto animate-in slide-in-from-bottom-3 duration-200">
          <div className="p-3.5 bg-surface/95 backdrop-blur-md rounded-2xl border-2 border-primary/30 shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text-primary truncate">
                      ตำแหน่งที่เลือก
                    </span>
                    {isReverseGeocoding && (
                      <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary truncate mt-0.5">
                    {selectedTarget.label}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearTarget}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Coordinates & Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={handleCopyCoordinates}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-text-muted hover:text-text-primary bg-surface-secondary/60 rounded-lg hover:bg-surface-secondary transition-colors"
                title="คลิกเพื่อคัดลอกพิกัด"
              >
                {copiedCoords ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>
                  {selectedTarget.lat.toFixed(4)}, {selectedTarget.lng.toFixed(4)}
                </span>
              </button>

              {enableReportAction && (
                <button
                  type="button"
                  onClick={handleProceedToReport}
                  className="px-3 py-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 hover:gap-2"
                >
                  <span>แจ้งเหตุที่จุดนี้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
