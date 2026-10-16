"use client";

import * as React from "react";
import { AIAnalysisResult } from "../reports/types";
import { Badge } from "@/components/ui/badge";
import { DAMAGE_CATEGORY_CONFIG } from "../reports/status-machine";
import {
  Tag,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type DetectionStatusType = "invalid_source" | "needs_staff_review" | "damage_detected";

export interface DetectionStateMeta {
  type: DetectionStatusType;
  badgeLabel: string;
  badgeVariant: "danger" | "reported" | "brand" | "neutral";
  cardBorderClass: string;
  cardBgClass: string;
  icon: React.ReactNode;
  statusTitle: string;
  subNotice?: string;
}

export function resolveDetectionState(analysis: AIAnalysisResult): DetectionStateMeta {
  const isOutOfDomain =
    analysis.imageQualityIssues?.includes("not_road_or_sidewalk") ||
    analysis.summary?.includes("ไม่ปรากฏพื้นผิว") ||
    analysis.summary?.includes("ไม่อยู่ในพื้นที่") ||
    (analysis.primaryCategory === "uncertain" &&
      (analysis.labels?.length ?? 0) === 0 &&
      (analysis.confidenceScore ?? 0) === 0 &&
      (analysis.imageQualityIssues?.length ?? 0) > 0);

  if (isOutOfDomain) {
    return {
      type: "invalid_source",
      badgeLabel: "ไม่ใช่ภาพถนนหรือทางเท้า",
      badgeVariant: "danger",
      cardBorderClass: "border-red-200 dark:border-red-900/50",
      cardBgClass: "bg-red-50/40 dark:bg-red-950/20",
      icon: <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />,
      statusTitle: "ไม่ใช่ภาพถนนหรือทางเท้า",
      subNotice: "ระบบ AI ไม่พบพื้นผิวถนนหรือทางเท้า กรุณาถ่ายภาพผิวทางที่ชำรุดเพื่อแจ้งซ่อม",
    };
  }

  const isNotSure =
    analysis.needsHumanReview ||
    analysis.primaryCategory === "uncertain" ||
    (analysis.confidenceScore ?? 0) < 0.60;

  if (isNotSure) {
    return {
      type: "needs_staff_review",
      badgeLabel: "รอเจ้าหน้าที่ตรวจสอบ",
      badgeVariant: "reported",
      cardBorderClass: "border-amber-200 dark:border-amber-900/50",
      cardBgClass: "bg-amber-50/40 dark:bg-amber-950/20",
      icon: <Clock className="h-4 w-4 text-amber-600 shrink-0" />,
      statusTitle: "รอเจ้าหน้าที่ตรวจสอบ",
      subNotice: "ตรวจพบผิวทาง แต่ระบบ AI ไม่พบร่องรอยเสียหายชัดเจน รายงานนี้จะส่งต่อให้เจ้าหน้าที่ตรวจสอบภาพถ่ายโดยตรง",
    };
  }

  return {
    type: "damage_detected",
    badgeLabel: "ตรวจพบความเสียหาย",
    badgeVariant: "brand",
    cardBorderClass: "border-brand/30 dark:border-brand/40",
    cardBgClass: "bg-brand-soft/20 dark:bg-brand/10",
    icon: <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />,
    statusTitle: "ตรวจพบความเสียหาย",
    subNotice: "ระบบ AI ตรวจพบและจำแนกประเภทความเสียหายบนผิวทางเรียบร้อยแล้ว",
  };
}

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
  // Log detection type to browser console whenever analysis changes
  React.useEffect(() => {
    if (analysis) {
      const state = resolveDetectionState(analysis);
      console.log(`[ROAD AI Detection] Status: ${state.type.toUpperCase()}`, {
        type: state.type,
        category: analysis.primaryCategory,
        confidence: analysis.confidenceScore,
        needsHumanReview: analysis.needsHumanReview,
        imageQualityIssues: analysis.imageQualityIssues,
        summary: analysis.summary,
      });
    }
  }, [analysis]);

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
            Running dual-model context grounding & classification...
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

  const detectionState = resolveDetectionState(analysis);
  const categoryMeta = DAMAGE_CATEGORY_CONFIG[analysis.primaryCategory] || DAMAGE_CATEGORY_CONFIG.other;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-surface border ${detectionState.cardBorderClass} shadow-xs ${className}`}>
      {/* Header with Type Detection Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
            <Tag className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Damage Classification
          </span>
        </div>

        {/* Prominent Detection Status Badge */}
        <Badge variant={detectionState.badgeVariant} size="sm" className="font-semibold shadow-xs">
          {detectionState.icon}
          <span>{detectionState.badgeLabel}</span>
        </Badge>
      </div>

      {/* Detection Type Status Banner */}
      <div className={`p-3 rounded-xl border mb-3 flex items-start gap-2.5 ${detectionState.cardBgClass} ${detectionState.cardBorderClass}`}>
        <div className="mt-0.5">{detectionState.icon}</div>
        <div className="text-xs">
          <span className="font-bold text-text-primary block mb-0.5">
            {detectionState.statusTitle}
          </span>
          <span className="text-text-secondary leading-relaxed">
            {detectionState.subNotice}
          </span>
        </div>
      </div>

      {/* Primary Category & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-muted/60 border border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text-primary">
              {categoryMeta.label}
            </span>
            {typeof analysis.confidenceScore === "number" && analysis.confidenceScore > 0 && (
              <span className="text-xs font-medium text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border">
                {Math.round(analysis.confidenceScore * 100)}% confidence
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Labels pill list */}
        {analysis.labels && analysis.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 shrink-0 self-start sm:self-center">
            {analysis.labels.map((lbl, idx) => {
              const labelMeta = DAMAGE_CATEGORY_CONFIG[lbl.category] || DAMAGE_CATEGORY_CONFIG.other;
              return (
                <Badge key={idx} variant="outline" size="sm" className="text-[11px]">
                  {labelMeta.shortLabel}
                  {typeof lbl.score === "number" && ` ${Math.round(lbl.score * 100)}%`}
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
