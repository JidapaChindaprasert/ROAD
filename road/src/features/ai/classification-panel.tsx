"use client";

import * as React from "react";
import { AIAnalysisResult } from "../reports/types";
import { Badge } from "@/components/ui/badge";
import { DAMAGE_CATEGORY_CONFIG } from "../reports/status-machine";
import { Tag, AlertCircle, RefreshCw, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClassificationPanelProps {
  isLoading?: boolean;
  analysis?: AIAnalysisResult | null;
  error?: string | null;
  onRetry?: () => void;
  onFlagIncorrect?: () => void;
  isFlaggedIncorrect?: boolean;
  className?: string;
}

export function ClassificationPanel({
  isLoading = false,
  analysis,
  error,
  onRetry,
  onFlagIncorrect,
  isFlaggedIncorrect = false,
  className = "",
}: ClassificationPanelProps) {
  if (isLoading) {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-brand-soft/40 border border-brand/20 flex items-center gap-3.5 ${className}`}>
        <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <span>Analyzing road damage</span>
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Determining damage category...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Classification Unavailable
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              {error || "Could not detect damage category. You can still submit this report."}
            </p>
          </div>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="self-end sm:self-center text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const categoryMeta = DAMAGE_CATEGORY_CONFIG[analysis.primaryCategory] || DAMAGE_CATEGORY_CONFIG.other;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
            <Tag className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Damage Classification
          </span>
        </div>
      </div>

      {/* Primary Category & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-muted/60 border border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-text-primary">
              {categoryMeta.label}
            </span>
            <Badge variant={categoryMeta.dangerLevel === "high" ? "danger" : "brand"} size="sm">
              {analysis.suggestedSeverity.toUpperCase()} SEVERITY
            </Badge>
          </div>
          <p className="text-xs text-text-secondary">{analysis.summary}</p>
        </div>

        {/* Labels pill list */}
        {analysis.labels && analysis.labels.length > 1 && (
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {analysis.labels.map((lbl, idx) => {
              const labelMeta = DAMAGE_CATEGORY_CONFIG[lbl.category] || DAMAGE_CATEGORY_CONFIG.other;
              return (
                <Badge key={idx} variant="outline" size="sm" className="text-[11px]">
                  {labelMeta.shortLabel}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer disclaimer & feedback */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-text-secondary pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3 text-text-muted" />
          <span>Preliminary classification. Verified on-site by municipal engineering crews.</span>
        </div>

        {onFlagIncorrect && (
          <button
            type="button"
            onClick={onFlagIncorrect}
            className={`text-[11px] font-medium transition-colors ${
              isFlaggedIncorrect
                ? "text-amber-700 font-bold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {isFlaggedIncorrect ? "✓ Flagged for staff review" : "Flag incorrect"}
          </button>
        )}
      </div>
    </div>
  );
}
