import * as React from "react";
import { TimelineEvent } from "../types";
import { CheckCircle2, Clock, Wrench, Shield, Calendar, UserCheck } from "lucide-react";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import { DEFAULT_ROAD_DAMAGE_IMAGE, getSafeImageUrl } from "@/lib/constants/fallback-images";

export interface ReportTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function ReportTimeline({ events = [], className = "" }: ReportTimelineProps) {
  const safeEvents = events || [];

  const getEventIcon = (toStatus: string) => {
    switch (toStatus) {
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-fixed" />;
      case "repairing":
        return <Wrench className="h-4 w-4 text-repairing" />;
      case "scheduled":
        return <Calendar className="h-4 w-4 text-reported" />;
      case "assessing":
        return <Shield className="h-4 w-4 text-brand" />;
      case "acknowledged":
        return <UserCheck className="h-4 w-4 text-brand" />;
      case "reported":
      default:
        return <Clock className="h-4 w-4 text-text-muted" />;
    }
  };

  const getEventBadgeClass = (toStatus: string) => {
    switch (toStatus) {
      case "resolved":
        return "bg-fixed-soft border-fixed-border text-fixed";
      case "repairing":
        return "bg-repairing-soft border-repairing-border text-repairing";
      case "scheduled":
      case "assessing":
      case "acknowledged":
        return "bg-brand-soft border-brand/20 text-brand";
      case "reported":
      default:
        return "bg-surface-muted border-border text-text-secondary";
    }
  };

  if (safeEvents.length === 0) {
    return (
      <div className={`p-4 text-center text-xs text-text-muted ${className}`}>
        No timeline events recorded yet.
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="relative pl-6 sm:pl-8 border-l-2 border-border/80 space-y-8 ml-3">
        {safeEvents.map((evt, idx) => {
          const isLatest = idx === events.length - 1;

          return (
            <div key={evt.id} className="relative group">
              {/* Event node dot on vertical timeline line */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-0 h-7 w-7 rounded-full border-2 flex items-center justify-center bg-surface shadow-xs transition-transform ${
                  isLatest
                    ? "border-brand ring-4 ring-brand/15 scale-110"
                    : "border-border"
                }`}
              >
                {getEventIcon(evt.toStatus)}
              </div>

              {/* Event card */}
              <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getEventBadgeClass(
                      evt.toStatus
                    )}`}
                  >
                    {evt.toStatus.replace("_", " ")}
                  </span>
                  <span
                    className="text-xs text-text-muted"
                    title={formatDate(evt.createdAt)}
                  >
                    {formatRelativeTime(evt.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-text-primary leading-relaxed">
                  {evt.publicNote}
                </p>

                {/* Actor info & scheduled date */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-text-primary">{evt.actorName}</span>
                    <span className="text-[11px] text-text-muted capitalize">
                      ({evt.actorRole})
                    </span>
                  </div>

                  {evt.scheduledFor && (
                    <div className="text-[11px] text-brand font-semibold">
                      Scheduled for: {formatDate(evt.scheduledFor)}
                    </div>
                  )}
                </div>

                {/* Resolution evidence photo if present */}
                {evt.resolutionEvidenceUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border aspect-16/9 max-w-sm">
                    <img
                      src={getSafeImageUrl(evt.resolutionEvidenceUrl)}
                      alt="Resolution confirmation"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== DEFAULT_ROAD_DAMAGE_IMAGE) {
                          target.src = DEFAULT_ROAD_DAMAGE_IMAGE;
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
