"use client";

import * as React from "react";
import { MapPin, Crosshair } from "lucide-react";

export interface LocationMiniMapProps {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  isManual?: boolean;
  onSelectCoordinates?: (lat: number, lng: number) => void;
  className?: string;
}

// Bounding box for the Bangkok schematic map
const MAP_BOUNDS = {
  north: 13.84,
  south: 13.68,
  west: 100.44,
  east: 100.62,
};

export function LocationMiniMap({
  latitude,
  longitude,
  accuracyMeters,
  isManual = false,
  onSelectCoordinates,
  className = "",
}: LocationMiniMapProps) {
  const mapRef = React.useRef<SVGSVGElement | null>(null);

  // Convert lat/lng to percentage coordinates within bounds
  const getCoordinatesPercent = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
    const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  const { x, y } = getCoordinatesPercent(latitude, longitude);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSelectCoordinates || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const newLng = MAP_BOUNDS.west + (clickX / 100) * (MAP_BOUNDS.east - MAP_BOUNDS.west);
    const newLat = MAP_BOUNDS.north - (clickY / 100) * (MAP_BOUNDS.north - MAP_BOUNDS.south);

    onSelectCoordinates(newLat, newLng);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-[#F2F6F9] ${className}`}>
      {/* SVG Map Canvas */}
      <svg
        ref={mapRef}
        onClick={handleMapClick}
        viewBox="0 0 400 220"
        className="w-full h-full min-h-[160px] cursor-crosshair select-none"
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="miniGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E1E8F0" strokeWidth="0.75" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#miniGrid)" />

        {/* Schematic Chao Phraya River */}
        <path
          d="M 120 0 C 130 50, 110 80, 140 120 C 170 160, 150 190, 160 220"
          fill="none"
          stroke="#CBE9F6"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 120 0 C 130 50, 110 80, 140 120 C 170 160, 150 190, 160 220"
          fill="none"
          stroke="#A8D8F0"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Major Expressways / Arterials */}
        <path d="M 0 70 Q 200 60 400 90" fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M 0 70 Q 200 60 400 90" fill="none" stroke="#CBD5E1" strokeWidth="3" />

        <path d="M 0 150 Q 200 130 400 160" fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M 0 150 Q 200 130 400 160" fill="none" stroke="#CBD5E1" strokeWidth="3" />

        <path d="M 260 0 L 260 220" fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M 260 0 L 260 220" fill="none" stroke="#CBD5E1" strokeWidth="3" />

        {/* Accuracy radius ring if GPS */}
        {!isManual && accuracyMeters && (
          <circle
            cx={`${x}%`}
            cy={`${y}%`}
            r="16"
            fill="rgba(8, 127, 120, 0.15)"
            stroke="rgba(8, 127, 120, 0.4)"
            strokeWidth="1"
            className="animate-pulse"
          />
        )}

        {/* Selected Marker Pin */}
        <g transform={`translate(${x * 4 - 12}, ${y * 2.2 - 24})`}>
          <path
            d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 14 1-1 8-8.75 8-14 0-4.42-3.58-8-8-8z"
            fill="#087F78"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="8" r="3.5" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Floating map hint */}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-white/85 backdrop-blur-xs text-[10px] text-text-secondary border border-border flex items-center gap-1 pointer-events-none">
        <Crosshair className="h-3 w-3 text-brand" />
        <span>Click map to fine-tune pin location</span>
      </div>
    </div>
  );
}
