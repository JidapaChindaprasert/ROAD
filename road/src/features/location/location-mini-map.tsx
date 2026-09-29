"use client";

import * as React from "react";
import type * as LeafletType from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, LocateFixed, Loader2, MapPin } from "lucide-react";

export interface LocationMiniMapProps {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  isManual?: boolean;
  onSelectCoordinates?: (lat: number, lng: number, label?: string) => void;
  className?: string;
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
