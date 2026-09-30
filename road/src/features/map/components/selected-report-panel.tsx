"use client";

import * as React from "react";
import Link from "next/link";
import { ReportSummary, ReportDetail } from "@/features/reports/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  ArrowRight,
  MapPin,
  Calendar,
  Navigation,
  Share2,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import { DAMAGE_CATEGORY_CONFIG, STATUS_DISPLAY_CONFIG } from "@/features/reports/status-machine";
import { formatRelativeTime, formatCoordinates } from "@/lib/utils";
import { toast } from "sonner";
import { getSafeImageUrl, CATEGORY_FALLBACK_IMAGES, DEFAULT_ROAD_DAMAGE_IMAGE } from "@/lib/constants/fallback-images";

export interface SelectedReportPanelProps {
  report: ReportSummary | ReportDetail | null;
  onClose: () => void;
  className?: string;
}

export function SelectedReportPanel({
  report,
  onClose,
  className = "",
}: SelectedReportPanelProps) {
  if (!report) return null;

  const categoryMeta = DAMAGE_CATEGORY_CONFIG[report.category] || DAMAGE_CATEGORY_CONFIG.other;
  const statusMeta = STATUS_DISPLAY_CONFIG[report.detailedStatus] || STATUS_DISPLAY_CONFIG.reported;

  const lat =
    "publicLocation" in report && report.publicLocation?.latitude != null
      ? report.publicLocation.latitude
      : (report.publicLatitude ?? 13.7563);
  const lng =
    "publicLocation" in report && report.publicLocation?.longitude != null
      ? report.publicLocation.longitude
      : (report.publicLongitude ?? 100.5018);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/reports/${report.id}`);
      toast.success("Location link copied to clipboard!");
    }
  };

  const handleOpenGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${className}`}
    >
      {/* Google Maps Style Hero Image & Close Button */}
      <div className="relative aspect-16/10 w-full bg-slate-900 overflow-hidden">
        <img
          src={getSafeImageUrl(report.thumbnailUrl, report.category)}
          alt={report.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = CATEGORY_FALLBACK_IMAGES[report.category] || DEFAULT_ROAD_DAMAGE_IMAGE;
          }}
        />

        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-95 shadow-md z-10"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Bottom image overlay gradient with Category */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
          <Badge variant="brand" size="sm" className="bg-brand text-white border-0 font-bold shadow-xs">
            {categoryMeta.label}
          </Badge>
          <span className="text-[11px] font-mono font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
            {report.publicId}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Title & Status */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={statusMeta.badgeVariant} size="sm">
              {statusMeta.publicLabel}
            </Badge>
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(report.createdAt)}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight leading-snug">
            {report.title}
          </h3>
        </div>

        {/* Google Maps Action Buttons Row */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-y border-border-subtle py-2.5">
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-surface-muted text-brand transition-colors text-center group"
          >
            <div className="h-8 w-8 rounded-full bg-brand-soft flex items-center justify-center mb-1 group-hover:bg-brand group-hover:text-white transition-colors">
              <Navigation className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-text-primary">Navigate</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-surface-muted text-brand transition-colors text-center group"
          >
            <div className="h-8 w-8 rounded-full bg-brand-soft flex items-center justify-center mb-1 group-hover:bg-brand group-hover:text-white transition-colors">
              <Share2 className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-text-primary">Share</span>
          </button>

          <Link
            href={`/reports/${report.id}`}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-surface-muted text-brand transition-colors text-center group"
          >
            <div className="h-8 w-8 rounded-full bg-brand-soft flex items-center justify-center mb-1 group-hover:bg-brand group-hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-text-primary">Timeline</span>
          </Link>
        </div>

        {/* Detailed Address & Coordinates Row */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5 text-text-secondary">
            <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-text-primary">
                {report.localityLabel || "Bangkok Metropolitan Area"}
              </p>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">
                {formatCoordinates(lat, lng, 5)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-text-secondary">
            <Shield className="h-4 w-4 text-brand shrink-0" />
            <span className="text-text-muted">
              Civic verified incident • Open for public repair tracking
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <Link href={`/reports/${report.id}`} className="block w-full">
            <Button
              variant="primary"
              size="md"
              className="w-full font-bold justify-center gap-2 shadow-sm text-xs"
            >
              <span>View Full Repair Timeline &amp; Fix Status</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
