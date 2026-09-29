"use client";

import * as React from "react";
import type * as LeafletType from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, LocateFixed, Loader2, MapPin, Search, X } from "lucide-react";

export interface LocationMiniMapProps {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  isManual?: boolean;
  onSelectCoordinates?: (lat: number, lng: number, label?: string) => void;
  className?: string;
}

export interface MiniMapSearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

export function LocationMiniMap({
  latitude,
  longitude,
  accuracyMeters,
  isManual = false,
  onSelectCoordinates,
  className = "",
}: LocationMiniMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletType.Map | null>(null);
  const markerRef = React.useRef<LeafletType.Marker | null>(null);
  const leafletModuleRef = React.useRef<typeof LeafletType | null>(null);

  const [isMapReady, setIsMapReady] = React.useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = React.useState(false);

  // Search state for location lookup in maps
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<MiniMapSearchResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Dismiss search dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep callback in ref to avoid stale closures in Leaflet events
  const onSelectRef = React.useRef(onSelectCoordinates);
  React.useEffect(() => {
    onSelectRef.current = onSelectCoordinates;
  }, [onSelectCoordinates]);

  // Reverse geocoding helper
  const reverseGeocode = React.useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        {
          headers: {
            "Accept-Language": "th,en",
            "User-Agent": "ROAD-Damage-Reporter/1.0",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        let label = "";
        if (data.address) {
          const addr = data.address;
          const road = addr.road || addr.street || addr.pedestrian || "";
          const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.district || "";
          const city = addr.city || addr.town || addr.province || addr.state || "";
          const parts = [road, suburb, city].filter(Boolean);
          label = parts.join(", ") || data.display_name.split(",").slice(0, 3).join(", ");
        }
        return label || data.display_name?.split(",").slice(0, 3).join(", ");
      }
    } catch {
      // ignore
    } finally {
      setIsReverseGeocoding(false);
    }
    return `พิกัด ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }, []);

  const initialCoordsRef = React.useRef({ latitude, longitude });
  const reverseGeocodeRef = React.useRef(reverseGeocode);
  React.useEffect(() => {
    reverseGeocodeRef.current = reverseGeocode;
  }, [reverseGeocode]);

  // Location search handler (Supports place names in Thailand & Coordinates)
  const handleSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    // Direct coordinates detection (e.g. 13.7466, 100.5348)
    const coordMatch = q.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = Number(parseFloat(coordMatch[1]).toFixed(6));
      const lng = Number(parseFloat(coordMatch[2]).toFixed(6));
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.flyTo([lat, lng], 17);
        }
        setShowResults(false);
        const label = await reverseGeocodeRef.current(lat, lng);
        if (onSelectRef.current) {
          onSelectRef.current(lat, lng, label);
        }
        return;
      }
    }

    setIsSearching(true);
    setShowResults(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=th&addressdetails=1`,
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
      }
    } catch (err) {
      console.warn("Geocoding failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (item: MiniMapSearchResult) => {
    const lat = Number(parseFloat(item.lat).toFixed(6));
    const lng = Number(parseFloat(item.lon).toFixed(6));
    const title = item.name || item.display_name.split(",")[0];
    setSearchQuery(title);
    setShowResults(false);

    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.flyTo([lat, lng], 17);
    }

    const label = await reverseGeocodeRef.current(lat, lng);
    if (onSelectRef.current) {
      onSelectRef.current(lat, lng, label || title);
    }
  };

  // Initialize Leaflet Mini Map (Client-side dynamic import, runs once)
  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let isDisposed = false;
    let mapInstance: LeafletType.Map | null = null;

    async function initMiniMap() {
      try {
        const leafletModule = await import("leaflet");
        const L = (leafletModule.default || leafletModule) as typeof LeafletType;
        leafletModuleRef.current = L;

        if (isDisposed || !mapContainerRef.current) return;

        const { latitude: initLat, longitude: initLng } = initialCoordsRef.current;
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: 16,
          minZoom: 4,
          maxZoom: 19,
          zoomControl: false,
          attributionControl: false,
        });
        mapInstance = map;
        mapRef.current = map;

        // CARTO Voyager Tiles
        const cartoKey =
          process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_43kf_1_52bd28b4e3ec99b3a194e59f";
        const cartoUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`;
        const tileLayer = L.tileLayer(cartoUrl, {
          subdomains: ["a", "b", "c", "d"],
          maxZoom: 20,
          detectRetina: true,
        });

        // OSM Fallback
        tileLayer.on("tileerror", () => {
          if (!isDisposed && mapRef.current) {
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              subdomains: ["a", "b", "c"],
              maxZoom: 19,
            }).addTo(mapRef.current);
          }
        });
        tileLayer.addTo(map);

        // Draggable Custom Target Pin
        const pinIcon = L.divIcon({
          className: "road-leaflet-div-icon",
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing">
              <span class="absolute w-9 h-9 rounded-full bg-red-500/30 animate-ping"></span>
              <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="22" y1="12" x2="18" y2="12"></line>
                  <line x1="6" y1="12" x2="2" y2="12"></line>
                  <line x1="12" y1="6" x2="12" y2="2"></line>
                  <line x1="12" y1="22" x2="12" y2="18"></line>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([initLat, initLng], {
          icon: pinIcon,
          draggable: true,
          zIndexOffset: 1000,
        }).addTo(map);
        markerRef.current = marker;

        // Handle Pin Drag End
        marker.on("dragend", async () => {
          const latlng = marker.getLatLng();
          const newLat = Number(latlng.lat.toFixed(6));
          const newLng = Number(latlng.lng.toFixed(6));
          const label = await reverseGeocodeRef.current(newLat, newLng);
          if (onSelectRef.current) {
            onSelectRef.current(newLat, newLng, label);
          }
        });

        // Handle Map Click to place pin
        map.on("click", async (e: LeafletType.LeafletMouseEvent) => {
          setShowResults(false);
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          const label = await reverseGeocodeRef.current(newLat, newLng);
          if (onSelectRef.current) {
            onSelectRef.current(newLat, newLng, label);
          }
        });

        // Trigger map resize
        setTimeout(() => {
          if (!isDisposed && mapRef.current) {
            mapRef.current.invalidateSize();
            setIsMapReady(true);
          }
        }, 80);
      } catch (err) {
        console.error("Failed to initialize Leaflet mini map:", err);
      }
    }

    initMiniMap();

    return () => {
      isDisposed = true;
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync marker and pan when props change
  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const cur = markerRef.current.getLatLng();
    if (Math.abs(cur.lat - latitude) > 0.0001 || Math.abs(cur.lng - longitude) > 0.0001) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude]);

  // Handle GPS relocate
  const handleRelocateCurrent = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      if (markerRef.current && mapRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.flyTo([lat, lng], 17);
      }
      const label = await reverseGeocodeRef.current(lat, lng);
      if (onSelectRef.current) {
        onSelectRef.current(lat, lng, label);
      }
    });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface-muted select-none ${className}`}
    >
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[180px] z-0" />

      {/* Loading indicator */}
      {!isMapReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/75 backdrop-blur-xs">
          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-surface border border-border shadow-xs text-xs font-medium text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
            <span>กำลังเตรียมแผนที่พิกัดจริง...</span>
          </div>
        </div>
      )}

      {/* Floating Search Bar Overlay */}
      <div ref={searchContainerRef} className="absolute top-2 left-2 right-12 z-30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setShowResults(false);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
              placeholder="ค้นหาชื่อถนน, ซอย, สถานที่ หรือพิกัด..."
              className="w-full h-8 pl-8 pr-7 text-xs rounded-xl bg-surface/95 backdrop-blur-md border border-border/90 shadow-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            {isSearching ? (
              <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-brand animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                className="absolute right-2 p-0.5 rounded-full hover:bg-surface-muted text-text-muted cursor-pointer"
                title="ล้างข้อความค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        </form>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-surface/98 backdrop-blur-md border border-border shadow-lg py-1 text-xs">
            {isSearching ? (
              <div className="p-3 text-center text-text-muted flex items-center justify-center gap-1.5 text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>กำลังค้นหาสถานที่ในประเทศไทย...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((res) => {
                const title = res.name || res.display_name.split(",")[0];
                const subtitle = res.display_name.split(",").slice(1, 4).join(",").trim();

                return (
                  <button
                    key={res.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-soft/60 flex items-start gap-2 border-b border-border/40 last:border-b-0 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary block truncate">
                        {title}
                      </span>
                      {subtitle && (
                        <span className="text-[10px] text-text-muted block truncate mt-0.25">
                          {subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-2.5 text-center text-[11px] text-text-muted">
                ไม่พบสถานที่ ลองระบุชื่อถนน แขวง หรือพิกัด Lat, Lng
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Mini Controls */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          title="ซูมเข้า"
          className="w-7 h-7 bg-surface/90 backdrop-blur-md rounded-lg border border-border/80 shadow-xs flex items-center justify-center text-text-primary hover:bg-surface"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          title="ซูมออก"
          className="w-7 h-7 bg-surface/90 backdrop-blur-md rounded-lg border border-border/80 shadow-xs flex items-center justify-center text-text-primary hover:bg-surface"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleRelocateCurrent}
          title="ระบุตำแหน่งของฉัน"
          className="w-7 h-7 bg-surface/90 backdrop-blur-md rounded-lg border border-border/80 shadow-xs flex items-center justify-center text-brand hover:bg-brand/10"
        >
          <LocateFixed className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Instructions Banner */}
      <div className="absolute bottom-2 inset-x-2 z-20 pointer-events-none flex justify-center">
        <div className="bg-surface/95 backdrop-blur-md border border-border/80 rounded-full px-3 py-1 shadow-sm text-[11px] text-text-secondary flex items-center gap-1.5">
          {isReverseGeocoding ? (
            <>
              <Loader2 className="w-3 h-3 text-brand animate-spin" />
              <span>กำลังระบุชื่อถนน...</span>
            </>
          ) : (
            <>
              <MapPin className="w-3 h-3 text-red-600" />
              <span>ลากหมุดแดง หรือแตะบนแผนที่เพื่อปรับตำแหน่งจุดชำรุด</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
