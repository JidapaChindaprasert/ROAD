"use client";

import * as React from "react";
import Link from "next/link";
import { ReportDetail } from "../types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Map, FileText, Share2, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCoordinates } from "@/lib/utils";
import { toast } from "sonner";

export interface SubmissionSuccessProps {
  report: ReportDetail;
  onResetWizard: () => void;
}

export function SubmissionSuccess({ report, onResetWizard }: SubmissionSuccessProps) {
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `${window.location.origin}/reports/${report.id}`
      );
      toast.success("Public report tracking link copied to clipboard!");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Success Icon */}
      <div className="h-20 w-20 rounded-3xl bg-fixed-soft text-fixed flex items-center justify-center mx-auto shadow-md border border-fixed-border/60">
        <CheckCircle2 className="h-10 w-10" />
      </div>

      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand">
          Incident Reported Successfully
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1">
          Your Report is on the Map!
        </h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto mt-2">
          Thank you for reporting. Local road maintenance crews and community members can now monitor and track this fix.
        </p>
      </div>

      {/* Report Summary Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 text-left space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <span className="text-[11px] font-semibold text-text-muted uppercase">
              Tracking ID
            </span>
            <div className="text-lg font-mono font-bold text-brand">
              {report.publicId}
            </div>
          </div>
          <Badge variant="reported" size="md">
            Reported
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-text-muted">Damage Category</span>
            <div className="font-semibold text-text-primary capitalize mt-0.5">
              {report.category.replace("_", " ")}
            </div>
          </div>
          <div>
            <span className="text-text-muted">Location</span>
            <div className="font-semibold text-text-primary truncate mt-0.5">
              {report.localityLabel || formatCoordinates(report.publicLocation.latitude, report.publicLocation.longitude)}
            </div>
          </div>
        </div>

        {report.aiAnalysis && (
          <div className="p-2.5 rounded-xl bg-brand-soft/50 border border-brand/20 flex items-center gap-2 text-xs">
            <Sparkles className="h-4 w-4 text-brand shrink-0" />
            <span className="text-text-secondary truncate">
              {report.aiAnalysis.summary}
            </span>
          </div>
        )}
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link href={`/reports/${report.id}`} className="w-full sm:w-auto">
          <Button variant="primary" className="w-full gap-2 font-semibold">
            <span>View Public Audit & Tracking</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <Link href="/map" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full gap-2">
            <Map className="h-4 w-4" />
            <span>View on Map</span>
          </Button>
        </Link>

        <Button
          type="button"
          onClick={handleShare}
          variant="secondary"
          className="w-full sm:w-auto gap-2"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={onResetWizard}
          className="text-xs text-text-secondary hover:text-brand underline font-medium"
        >
          Submit another damage report
        </button>
      </div>
    </div>
  );
}
