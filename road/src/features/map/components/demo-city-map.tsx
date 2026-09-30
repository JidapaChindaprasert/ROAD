"use client";

import * as React from "react";
import { ReportSummary } from "@/features/reports/types";
import { Plus, Minus, RotateCcw, MapPin } from "lucide-react";

export interface DemoCityMapProps {
  reports: ReportSummary[];
  selectedReportId?: string | null;
  onSelectReport: (report: ReportSummary) => void;
  className?: string;
}

// Bounding box for Bangkok schematic map projection
const MAP_BOUNDS = {
  north: 13.84,
  south: 13.68,
  west: 100.44,
  east: 100.62,
};

export function DemoCityMap({
  reports,
  selectedReportId,
  onSelectReport,
  className = "",
}: DemoCityMapProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const hasDraggedRef = React.useRef(false);
  const [hoveredReport, setHoveredReport] = React.useState<ReportSummary | null>(null);

  const getCoordinatesPercent = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
    const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
    return {
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(4, Math.min(96, y)),
    };
  };

  const getStatusMarkerColor = (status: ReportSummary["publicStatus"]) => {
    switch (status) {
      case "fixed":
        return "#059669"; // Green
      case "repairing":
        return "#4F46E5"; // Indigo
      case "reported":
      default:
        return "#D97706"; // Amber
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: panOffset.x,
      originY: panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
    }
    setPanOffset({
      x: dragStartRef.current.originX + dx,
      y: dragStartRef.current.originY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      hasDraggedRef.current = false;
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        originX: panOffset.x,
        originY: panOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
    }
    setPanOffset({
      x: dragStartRef.current.originX + dx,
      y: dragStartRef.current.originY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleResetZoomAndPan = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-[520px] sm:h-[600px] rounded-3xl overflow-hidden border border-border bg-[#F4F6F8] select-none shadow-sm cursor-grab active:cursor-grabbing ${className}`}
    >
      {/* Top Left Badge (Responsive: won't overlap zoom controls on phone) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 glass-panel px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-border flex items-center gap-1.5 shadow-2xs max-w-[calc(100%-110px)]">
        <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
        <span className="text-xs font-bold text-text-primary truncate">
          Bangkok Road Map
        </span>
      </div>

      {/* Zoom / Recenter Controls */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.25))}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl glass-panel text-text-primary hover:text-brand border border-border flex items-center justify-center shadow-xs transition-colors"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl glass-panel text-text-primary hover:text-brand border border-border flex items-center justify-center shadow-xs transition-colors"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoomAndPan}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl glass-panel text-text-primary hover:text-brand border border-border flex items-center justify-center shadow-xs transition-colors"
          aria-label="Reset zoom and center"
          title="Reset Zoom & Center"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* SVG Canvas with Zoom scale and Pan translate transform */}
      <div
        className="w-full h-full transition-transform duration-75 origin-center pointer-events-auto"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        }}
      >
        <svg
          viewBox="0 0 1000 650"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Soft grid pattern for city blocks */}
            <pattern id="blockGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="56" height="56" fill="#F1F4F8" rx="4" />
            </pattern>
            {/* Linear gradient for Chao Phraya River */}
            <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="50%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#7DD3FC" />
            </linearGradient>
            {/* Filter for clean map pin dropshadow */}
            <filter id="pinShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* 1. Base Map Ground */}
          <rect width="100%" height="100%" fill="#F8FAFC" />
          <rect width="100%" height="100%" fill="url(#blockGrid)" opacity="0.65" />

          {/* 2. Urban District Blocks & Built Zones */}
          <rect x="420" y="220" width="280" height="200" rx="16" fill="#E2E8F0" opacity="0.4" />
          <rect x="400" y="380" width="220" height="150" rx="16" fill="#E2E8F0" opacity="0.4" />
          <rect x="520" y="80" width="180" height="160" rx="16" fill="#E2E8F0" opacity="0.4" />
          <rect x="180" y="320" width="180" height="220" rx="16" fill="#E2E8F0" opacity="0.4" />

          {/* 3. Parks & Green Spaces (Google Maps Style #D1EAD0) */}
          {/* Chatuchak Park & Queen Sirikit Park (North) */}
          <path
            d="M 570 120 C 620 110, 650 140, 640 180 C 620 200, 580 180, 570 150 Z"
            fill="#D1F2D9"
            stroke="#A7F3D0"
            strokeWidth="1.5"
          />
          <text x="590" y="155" fill="#047857" fontSize="10" fontWeight="700" letterSpacing="0.5">
            Chatuchak Park
          </text>

          {/* Lumphini Park & Benjakitti Forest Park (Central South) */}
          <path
            d="M 540 435 C 570 425, 600 430, 605 460 C 595 480, 550 480, 535 460 Z"
            fill="#D1F2D9"
            stroke="#A7F3D0"
            strokeWidth="1.5"
          />
          <text x="548" y="458" fill="#047857" fontSize="10" fontWeight="700" letterSpacing="0.5">
            Lumphini Park
          </text>

          <path
            d="M 640 430 C 670 425, 690 440, 685 470 C 665 480, 635 475, 635 450 Z"
            fill="#D1F2D9"
            stroke="#A7F3D0"
            strokeWidth="1.5"
          />
          <text x="645" y="455" fill="#047857" fontSize="9" fontWeight="700" letterSpacing="0.5">
            Benjakitti Park
          </text>

          {/* Sanam Luang / Royal Grounds (West near river) */}
          <path
            d="M 280 290 C 310 285, 320 310, 310 335 C 290 340, 275 320, 280 290 Z"
            fill="#D1F2D9"
            stroke="#A7F3D0"
            strokeWidth="1.5"
          />

          {/* 4. Waterways: Chao Phraya River & Canals */}
          {/* Khlong Saen Saep Canal (West to East) */}
          <path
            d="M 320 320 L 530 350 L 700 350 L 1000 340"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Khlong Bangkok Noi */}
          <path
            d="M 0 250 Q 180 260 270 290"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Chao Phraya River Main Channel */}
          <path
            d="M 370 0 C 400 120, 250 200, 270 300 C 290 400, 390 450, 385 520 C 380 580, 480 620, 555 650"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth="64"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 370 0 C 400 120, 250 200, 270 300 C 290 400, 390 450, 385 520 C 380 580, 480 620, 555 650"
            fill="none"
            stroke="url(#riverGrad)"
            strokeWidth="48"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* River Label */}
          <text
            x="240"
            y="260"
            fill="#0284C7"
            fontSize="11"
            fontWeight="700"
            letterSpacing="2"
            opacity="0.8"
            transform="rotate(65 240 260)"
          >
            CHAO PHRAYA RIVER
          </text>

          {/* 5. ROAD NETWORK CASING LAYER (Draw all road borders together so they connect smoothly) */}
          <g stroke="#CBD5E1" strokeLinecap="round" strokeLinejoin="round">
            {/* Secondary Local Street Grid Casings */}
            <g strokeWidth="7">
              <path d="M 400 180 L 800 180" fill="none" />
              <path d="M 420 240 L 900 240" fill="none" />
              <path d="M 440 280 L 920 280" fill="none" />
              <path d="M 420 380 L 880 380" fill="none" />
              <path d="M 400 440 L 850 440" fill="none" />
              <path d="M 400 500 L 780 500" fill="none" />
              {/* North-South local streets */}
              <path d="M 480 140 L 480 520" fill="none" />
              <path d="M 540 100 L 540 560" fill="none" />
              <path d="M 600 80 L 600 580" fill="none" />
              <path d="M 740 100 L 740 540" fill="none" />
              <path d="M 820 120 L 820 540" fill="none" />
              {/* Thonburi West local grid */}
              <path d="M 120 400 L 360 400" fill="none" />
              <path d="M 140 460 L 360 460" fill="none" />
              <path d="M 160 520 L 360 520" fill="none" />
              <path d="M 220 320 L 220 580" fill="none" />
              <path d="M 300 320 L 300 580" fill="none" />
            </g>

            {/* Major Arterial Roads Casings */}
            <g strokeWidth="13">
              {/* Phahonyothin Corridor (Victory Monument -> Chatuchak -> North) */}
              <path d="M 527 346 L 560 280 L 617 165 L 660 0" fill="none" />
              {/* Sukhumvit Arterial (Phloen Chit -> Asok -> On Nut -> East) */}
              <path d="M 530 405 L 678 410 L 800 435 L 1000 480" fill="none" />
              {/* Rama IV Corridor (Hua Lamphong -> Sam Yan -> Silom -> Khlong Toei) */}
              <path d="M 410 420 L 490 455 L 560 465 L 720 500 L 880 540" fill="none" />
              {/* Asok Montri & Ratchada Ring Road (North-South) */}
              <path d="M 678 600 L 678 410 L 719 340 L 720 120 L 680 0" fill="none" />
              {/* Silom Road */}
              <path d="M 380 470 L 490 474 L 560 465" fill="none" />
              {/* Sathorn Road (King Taksin Bridge -> Wireless Rd) */}
              <path d="M 240 487 L 385 487 L 490 487 L 570 480" fill="none" />
              {/* New Phetchaburi Road */}
              <path d="M 420 365 L 530 365 L 678 365 L 950 365" fill="none" />
              {/* Rama IX Corridor */}
              <path d="M 527 325 L 719 340 L 1000 340" fill="none" />
              {/* Charoen Nakhon (Thonburi Riverfront) */}
              <path d="M 280 320 L 330 420 L 361 487 L 370 650" fill="none" />
              {/* Somdet Phra Pin Klao Rd */}
              <path d="M 60 300 L 270 300" fill="none" />
            </g>

            {/* Expressways Casings (Gold Highway Network) */}
            <g strokeWidth="13">
              {/* Si Rat Expressway (North-South Elevated) */}
              <path d="M 500 0 L 515 260 L 500 360 L 470 500 L 420 650" fill="none" />
              {/* Chaloem Maha Nakhon (Port -> Din Daeng -> Bang Na) */}
              <path d="M 527 280 L 660 300 L 740 480 L 1000 520" fill="none" />
              {/* Chalong Rat Expressway (Ram Inthra) */}
              <path d="M 850 0 L 830 350 L 800 650" fill="none" />
            </g>
          </g>

          {/* 6. BRIDGES OVER CHAO PHRAYA RIVER (Bridges cross over water before fills) */}
          <g stroke="#94A3B8" strokeWidth="14" strokeLinecap="butt">
            {/* Somdet Phra Pin Klao Bridge */}
            <line x1="250" y1="300" x2="295" y2="300" />
            {/* Rama VIII Bridge */}
            <line x1="285" y1="210" x2="330" y2="245" />
            {/* Phra Pok Klao & Memorial Bridge */}
            <line x1="330" y1="380" x2="365" y2="400" />
            {/* King Taksin Bridge (Sathorn) */}
            <line x1="355" y1="487" x2="415" y2="487" />
            {/* Krungthep / Rama III Bridge */}
            <line x1="420" y1="585" x2="465" y2="605" />
          </g>

          {/* 7. ROAD NETWORK FILL LAYER (Connects perfectly without any clipping) */}
          {/* Secondary Local Street Grid Fills */}
          <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 400 180 L 800 180" fill="none" />
            <path d="M 420 240 L 900 240" fill="none" />
            <path d="M 440 280 L 920 280" fill="none" />
            <path d="M 420 380 L 880 380" fill="none" />
            <path d="M 400 440 L 850 440" fill="none" />
            <path d="M 400 500 L 780 500" fill="none" />
            <path d="M 480 140 L 480 520" fill="none" />
            <path d="M 540 100 L 540 560" fill="none" />
            <path d="M 600 80 L 600 580" fill="none" />
            <path d="M 740 100 L 740 540" fill="none" />
            <path d="M 820 120 L 820 540" fill="none" />
            <path d="M 120 400 L 360 400" fill="none" />
            <path d="M 140 460 L 360 460" fill="none" />
            <path d="M 160 520 L 360 520" fill="none" />
            <path d="M 220 320 L 220 580" fill="none" />
            <path d="M 300 320 L 300 580" fill="none" />
          </g>

          {/* Major Arterial Roads Fills (Bright White Arterials) */}
          <g stroke="#FFFFFF" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Phahonyothin */}
            <path d="M 527 346 L 560 280 L 617 165 L 660 0" fill="none" />
            {/* Sukhumvit */}
            <path d="M 530 405 L 678 410 L 800 435 L 1000 480" fill="none" />
            {/* Rama IV */}
            <path d="M 410 420 L 490 455 L 560 465 L 720 500 L 880 540" fill="none" />
            {/* Asok Montri & Ratchada */}
            <path d="M 678 600 L 678 410 L 719 340 L 720 120 L 680 0" fill="none" />
            {/* Silom */}
            <path d="M 380 470 L 490 474 L 560 465" fill="none" />
            {/* Sathorn */}
            <path d="M 240 487 L 385 487 L 490 487 L 570 480" fill="none" />
            {/* New Phetchaburi */}
            <path d="M 420 365 L 530 365 L 678 365 L 950 365" fill="none" />
            {/* Rama IX */}
            <path d="M 527 325 L 719 340 L 1000 340" fill="none" />
            {/* Charoen Nakhon */}
            <path d="M 280 320 L 330 420 L 361 487 L 370 650" fill="none" />
            {/* Somdet Phra Pin Klao Rd */}
            <path d="M 60 300 L 270 300" fill="none" />
          </g>

          {/* Expressways Fills (Google Maps Amber/Gold Highways) */}
          <g stroke="#FDE68A" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Si Rat Expressway */}
            <path d="M 500 0 L 515 260 L 500 360 L 470 500 L 420 650" fill="none" />
            {/* Chaloem Maha Nakhon */}
            <path d="M 527 280 L 660 300 L 740 480 L 1000 520" fill="none" />
            {/* Chalong Rat Expressway */}
            <path d="M 850 0 L 830 350 L 800 650" fill="none" />
          </g>

          {/* 8. DISTRICT LABELS & ROAD NAMES (Google Maps Styling) */}
          <g fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" opacity="0.75">
            <text x="635" y="100" fill="#64748B" fontSize="12" letterSpacing="1.2">
              CHATUCHAK
            </text>
            <text x="510" y="240" fill="#64748B" fontSize="11" letterSpacing="1">
              ARI / PHAYA THAI
            </text>
            <text x="460" y="340" fill="#64748B" fontSize="11" letterSpacing="1">
              VICTORY MONUMENT
            </text>
            <text x="735" y="405" fill="#64748B" fontSize="12" letterSpacing="1.2">
              WATTHANA / SUKHUMVIT
            </text>
            <text x="420" y="445" fill="#64748B" fontSize="11" letterSpacing="1">
              BANG RAK / SILOM
            </text>
            <text x="450" y="520" fill="#64748B" fontSize="11" letterSpacing="1">
              SATHORN
            </text>
            <text x="760" y="325" fill="#64748B" fontSize="11" letterSpacing="1">
              HUAI KHWANG / RAMA IX
            </text>
            <text x="200" y="440" fill="#64748B" fontSize="11" letterSpacing="1">
              THONBURI
            </text>

            {/* Road Name Annotations along corridors */}
            <text x="740" y="450" fill="#94A3B8" fontSize="9" fontWeight="500">
              Sukhumvit Rd (Route 3)
            </text>
            <text x="590" y="270" fill="#94A3B8" fontSize="9" fontWeight="500" transform="rotate(-65 590 270)">
              Phahonyothin Rd
            </text>
            <text x="692" y="540" fill="#94A3B8" fontSize="9" fontWeight="500" transform="rotate(90 692 540)">
              Asok Montri / Ratchadaphisek
            </text>
            <text x="450" y="470" fill="#94A3B8" fontSize="8" fontWeight="500">
              Silom Rd
            </text>
            <text x="430" y="500" fill="#94A3B8" fontSize="8" fontWeight="500">
              Sathorn Tai Rd
            </text>
          </g>

          {/* 9. CLICKABLE REPORT PIN MARKERS */}
          {reports.map((report) => {
            const { x, y } = getCoordinatesPercent(
              report.publicLatitude,
              report.publicLongitude
            );
            const isSelected = selectedReportId === report.id;
            const markerColor = getStatusMarkerColor(report.publicStatus);

            const px = x * 10;
            const py = y * 6.5;

            return (
              <g
                key={report.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasDraggedRef.current) return;
                  onSelectReport(report);
                }}
                onMouseEnter={() => setHoveredReport(report)}
                onMouseLeave={() => setHoveredReport(null)}
                className="cursor-pointer transition-transform duration-150"
                style={{ transformOrigin: `${px}px ${py}px` }}
              >
                {/* Static Ring for Selected Pin (no circle move animation) */}
                {isSelected && (
                  <circle
                    cx={px}
                    cy={py}
                    r="19"
                    fill="none"
                    stroke={markerColor}
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    opacity="0.85"
                  />
                )}

                {/* Pin Shadow */}
                <ellipse cx={px} cy={py + 8} rx="7" ry="3.5" fill="#0F172A" opacity="0.3" />

                {/* Google Maps Teardrop / Radar Pin */}
                <g filter="url(#pinShadow)">
                  {/* Outer circle badge */}
                  <circle
                    cx={px}
                    cy={py}
                    r={isSelected ? "14" : "11"}
                    fill={markerColor}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? "3.5" : "2.5"}
                    className="transition-all"
                  />
                  {/* Inner white dot */}
                  <circle cx={px} cy={py} r={isSelected ? "4.5" : "3.5"} fill="#FFFFFF" />
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Tooltip (Positioned within bounds) */}
      {hoveredReport && (
        <div
          className="pointer-events-none absolute z-30 px-3 py-2 rounded-xl bg-surface/95 backdrop-blur-md text-text-primary border border-border shadow-xl text-xs max-w-[220px]"
          style={{
            left: `${Math.min(75, Math.max(12, getCoordinatesPercent(hoveredReport.publicLatitude, hoveredReport.publicLongitude).x))}%`,
            top: `${Math.min(75, Math.max(15, getCoordinatesPercent(hoveredReport.publicLatitude, hoveredReport.publicLongitude).y - 12))}%`,
          }}
        >
          <div className="font-bold text-text-primary line-clamp-1">{hoveredReport.title}</div>
          <div className="text-[11px] text-text-secondary mt-0.5 capitalize flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: getStatusMarkerColor(hoveredReport.publicStatus) }}
            />
            <span>{hoveredReport.category.replace("_", " ")}</span>
            <span>•</span>
            <span className="font-semibold">{hoveredReport.publicStatus}</span>
          </div>
        </div>
      )}
    </div>
  );
}
