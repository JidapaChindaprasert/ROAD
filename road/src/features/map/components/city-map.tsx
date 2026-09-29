"use client";

import * as React from "react";
import type * as LeafletType from "leaflet";
import "leaflet/dist/leaflet.css";
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
  reports?: ReportSummary[];
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

// Default center: Bangkok central [lng, lat]
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
  const mapRef = React.useRef<LeafletType.Map | null>(null);
  const leafletModuleRef = React.useRef<typeof LeafletType | null>(null);
  const reportMarkersRef = React.useRef<LeafletType.Marker[]>([]);
  const targetMarkerRef = React.useRef<LeafletType.Marker | null>(null);

  // Map readiness state
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);

  // Search state (Feature 1: Area Search & Feature 3: Coordinate Search)
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<GeocodingResult[]>([]);
  const [showSearchResults, setShowSearchResults] = React.useState(false);

  // Selected Target state (Feature 2: Location selection & Click-to-Report)
  const [selectedTarget, setSelectedTarget] = React.useState<SelectedTarget | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = React.useState(false);
  const [copiedCoords, setCopiedCoords] = React.useState(false);

  // Coordinate Search Modal state (Feature 3: GPS Presets & Custom Coordinates)
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
      const L = leafletModuleRef.current;
      const map = mapRef.current;
      if (L && map) {
        if (!targetMarkerRef.current) {
          const targetIcon = L.divIcon({
            className: "road-leaflet-div-icon",
            html: `
              <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                <span class="absolute w-8 h-8 rounded-full bg-red-500/35 animate-ping"></span>
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
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          targetMarkerRef.current = L.marker([lat, lng], {
            icon: targetIcon,
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          targetMarkerRef.current.setLatLng([lat, lng]);
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

  // Initialize Leaflet Map (Safe dynamic import for Next.js SSR)
  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let isDisposed = false;
    let mapInstance: LeafletType.Map | null = null;

    async function initializeLeaflet() {
      try {
        // Dynamically load leaflet on client side only
        const leafletModule = await import("leaflet");
        const L = (leafletModule.default || leafletModule) as typeof LeafletType;
        leafletModuleRef.current = L;

        if (isDisposed || !mapContainerRef.current) return;

        // Leaflet takes [latitude, longitude]
        const centerLat = initialCenter[1];
        const centerLng = initialCenter[0];

        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: initialZoom,
          minZoom: 3,
          maxZoom: 19,
          zoomControl: false,
          attributionControl: false,
        });
        mapInstance = map;
        mapRef.current = map;

        // CARTO Voyager raster tiles with User API Key
        const cartoApiKey =
          process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_43kf_1_52bd28b4e3ec99b3a194e59f";
        const cartoUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`;

        const cartoLayer = L.tileLayer(cartoUrl, {
          subdomains: ["a", "b", "c", "d"],
          maxZoom: 20,
          detectRetina: true,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
        });

        // Fallback to OSM if CARTO has tile errors
        let hasSwitchedToOsm = false;
        cartoLayer.on("tileerror", () => {
          if (!hasSwitchedToOsm && !isDisposed && mapRef.current) {
            hasSwitchedToOsm = true;
            console.warn("Tile notice: switching to OpenStreetMap fallback");
            const osmFallback = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              subdomains: ["a", "b", "c"],
              maxZoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            });
            osmFallback.addTo(mapRef.current);
          }
        });

        cartoLayer.addTo(map);

        // Compact attribution control
        L.control
          .attribution({ prefix: false, position: "bottomright" })
          .addAttribution('&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>')
          .addTo(map);

        // Map Click Listener (Feature 2: Click to select location)
        map.on("click", (e: LeafletType.LeafletMouseEvent) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          locationSelectRef.current(lat, lng);
        });

        // Trigger map invalidateSize to prevent tile rendering gaps
        setTimeout(() => {
          if (!isDisposed && mapRef.current) {
            mapRef.current.invalidateSize();
            setIsMapLoaded(true);
          }
        }, 80);
      } catch (err: unknown) {
        console.error("Leaflet initialization failed:", err);
        const msg = err instanceof Error ? err.message : "Failed to load map";
        setMapError(msg);
      }
    }

    initializeLeaflet();

    return () => {
      isDisposed = true;
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, [initialCenter, initialZoom]);

  // Sync Community Reports Markers
  React.useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapRef.current;
    if (!map || !L || !isMapLoaded) return;

    // Remove old markers
    reportMarkersRef.current.forEach((marker) => marker.remove());
    reportMarkersRef.current = [];

    // Create markers for community reports
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
          <line x1="12" y1="8" x2="12"></line>
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

      const icon = L.divIcon({
        className: "road-leaflet-div-icon",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            ${isSelected ? `<span class="absolute w-9 h-9 rounded-full ${pingColor} opacity-75 animate-ping"></span>` : ""}
            <div class="w-7 h-7 rounded-full ${statusBg} text-white border-2 border-white shadow-lg flex items-center justify-center ${isSelected ? "scale-125 ring-2 ring-primary" : "hover:scale-115 transition-transform"}">
              ${statusIconSvg}
            </div>
            <!-- Tooltip on hover -->
            <div class="absolute bottom-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
              <div class="bg-gray-900/95 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-xl backdrop-blur-sm border border-gray-700/50">
                <span class="font-bold text-amber-300 capitalize">${report.category}</span>: ${report.title.slice(0, 30)}
              </div>
              <div class="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5"></div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: isSelected ? 500 : 100 }).addTo(map);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectReport) {
          onSelectReport(report);
        }
      });

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

    // Feature 1: Geocode place name via OpenStreetMap Nominatim
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=th&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "th,en",
            "User-Agent": "ROAD-Damage-Reporter/1.0",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          toast.info("ไม่พบสถานที่ที่ตรงกับคำค้นหา ลองระบุชื่อถนนหรือเขตให้ชัดเจนขึ้น");
        }
      } else {
        toast.error("การค้นหาขัดข้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
      toast.error("ไม่สามารถเชื่อมต่อบริการค้นหาสถานที่ได้");
    } finally {
      setIsSearching(false);
    }
  };

  // Fly to target coordinates
  const flyToCoordinates = (lat: number, lng: number, label?: string) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
    handleLocationSelect(lat, lng, label);
  };

  // Select Search Result Item
  const handleSelectSearchResult = (result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    flyToCoordinates(lat, lng, result.name || result.display_name.split(",")[0]);
    setShowSearchResults(false);
    setSearchQuery(result.name || result.display_name.split(",")[0]);
  };

  // Reset Map View to default center
  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([DEFAULT_BANGKOK_CENTER[1], DEFAULT_BANGKOK_CENTER[0]], DEFAULT_ZOOM, {
      duration: 1.0,
    });
  };

  // Get Current Geolocation (GPS)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS");
      return;
    }

    toast.loading("กำลังระบุตำแหน่งของคุณ...", { id: "locate-me" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss("locate-me");
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        flyToCoordinates(lat, lng, "ตำแหน่งปัจจุบันของคุณ");
        toast.success("ระบุตำแหน่งปัจจุบันสำเร็จ");
      },
      (err) => {
        toast.dismiss("locate-me");
        console.warn("Geolocation error:", err);
        toast.error("ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตสิทธิ์การใช้งาน GPS");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Copy Coordinates to clipboard
  const handleCopyCoordinates = () => {
    if (!selectedTarget) return;
    const text = `${selectedTarget.lat.toFixed(6)}, ${selectedTarget.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    toast.success("คัดลอกพิกัดแล้ว: " + text);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Proceed to Report New Damage (Feature 2)
  const handleProceedToReport = () => {
    if (!selectedTarget) return;
    if (onSelectLocation) {
      onSelectLocation({
        lat: selectedTarget.lat,
        lng: selectedTarget.lng,
        label: selectedTarget.label,
      });
    }
    const params = new URLSearchParams({
      lat: selectedTarget.lat.toString(),
      lng: selectedTarget.lng.toString(),
      label: selectedTarget.label,
    });
    router.push(`/report/new?${params.toString()}`);
  };

  return (
    <div
      className={`relative w-full h-[520px] rounded-3xl overflow-hidden shadow-sm border border-border bg-surface-muted select-none ${className}`}
    >
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading Overlay */}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-surface/75 backdrop-blur-sm transition-opacity duration-300">
          <div className="p-3 bg-surface rounded-2xl shadow-xl border border-border flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-xs font-semibold text-text-primary">
              กำลังเตรียมแผนที่ความเร็วสูง...
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {mapError && (
        <div className="absolute top-4 left-4 right-4 z-40 p-4 bg-danger-soft border border-danger/30 rounded-2xl flex items-center gap-3 text-xs text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1 font-medium">{mapError}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 bg-danger text-white rounded-lg font-bold hover:bg-danger/90"
          >
            รีเฟรช
          </button>
        </div>
      )}

      {/* Search Header Bar (Feature 1: ค้นหาพื้นที่ & Feature 3: ค้นหาจากพิกัด) */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-4 z-20 flex flex-col gap-2 max-w-lg">
        <div className="relative flex items-center gap-1.5">
          <form
            onSubmit={handleExecuteSearch}
            className="relative flex-1 flex items-center bg-surface/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-md focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all overflow-hidden"
          >
            <div className="pl-3.5 text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเขต, ถนน หรือ พิกัด (lat, lng)..."
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-transparent outline-none text-text-primary placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                }}
                className="p-1.5 mr-1 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>ค้นหา</span>
              )}
            </button>
          </form>

          {/* Coordinate Dialog Trigger Button (Feature 3) */}
          <button
            type="button"
            onClick={() => setShowCoordDialog(!showCoordDialog)}
            title="ค้นหาจากพิกัด GPS หรือเลือกสถานที่ยอดนิยม"
            className="p-2.5 bg-surface/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-md text-text-secondary hover:text-primary hover:bg-surface transition-colors shrink-0"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Preset / GPS Coordinate Dialog Popover */}
          {showCoordDialog && (
            <div className="absolute top-12 right-0 w-80 bg-surface/98 backdrop-blur-lg rounded-2xl border border-border shadow-2xl p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/60">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-primary" />
                  <span>ค้นหาจากพิกัด (GPS)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCoordDialog(false)}
                  className="p-1 text-text-muted hover:text-text-primary rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Coordinate Form */}
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-[10px] font-semibold text-text-secondary block mb-1">
                    ละติจูด (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="เช่น 13.7563"
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary rounded-lg border border-border outline-none focus:border-primary text-text-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-secondary block mb-1">
                    ลองจิจูด (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="เช่น 100.5018"
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary rounded-lg border border-border outline-none focus:border-primary text-text-primary font-mono"
                  />
                </div>
              </div>

              {/* Bangkok Quick Presets */}
              <div className="mb-3">
                <span className="text-[10px] font-semibold text-text-muted block mb-1.5">
                  จุดสำคัญยอดนิยม:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "สยามสแควร์", lat: 13.7445, lng: 100.5332 },
                    { name: "แยกอโศก", lat: 13.7372, lng: 100.5604 },
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

        {/* Suggestion Dropdown List (Feature 1) */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="bg-surface/98 backdrop-blur-md rounded-2xl border border-border shadow-xl overflow-hidden divide-y divide-border/60 max-h-60 overflow-y-auto">
            {searchResults.map((result) => {
              const nameParts = result.display_name.split(",");
              const mainTitle = result.name || nameParts[0];
              const subTitle = nameParts.slice(1, 4).join(", ");

              return (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-surface-secondary/80 transition-colors flex items-start gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{mainTitle}</p>
                    {subTitle && (
                      <p className="text-[11px] text-text-muted truncate mt-0.5">{subTitle}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
