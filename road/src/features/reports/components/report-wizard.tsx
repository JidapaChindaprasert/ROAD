"use client";

import * as React from "react";
import { MediaItem, ReportDetail, AIAnalysisResult, DamageCategory } from "../types";
import { EvidenceUploader } from "./evidence-uploader";
import { LocationPanel } from "@/features/location/location-panel";
import { ClassificationPanel } from "@/features/ai/classification-panel";
import { SubmissionSuccess } from "./submission-success";
import { useGeolocation } from "@/features/location/use-geolocation";
import { simulateDamageClassification } from "@/features/ai/demo-classifier";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Send,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/use-auth";

/** Generate a unique media ID */
function generateMediaId(): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).substring(2, 7);
  return `med-${ts}-${rand}`;
}

/** Generate an idempotency key */
function generateIdempotencyKey(): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).substring(2, 8);
  return `idemp-${ts}-${rand}`;
}

export function ReportWizard() {
  const repository = useReportRepository();
  const { user } = useAuth();

  // Wizard Step (1: Evidence & Category, 2: Location & Review, 3: Success)
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Form State
  const [mediaFiles, setMediaFiles] = React.useState<MediaItem[]>([]);
  const [description, setDescription] = React.useState("");
  const [locationContext, setLocationContext] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<DamageCategory>("pothole");

  // Pre-filled location state from URL query
  const [presetLocationInfo, setPresetLocationInfo] = React.useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const latParam = params.get("lat");
      const lngParam = params.get("lng");
      const labelParam = params.get("label");
      if (latParam && lngParam) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const label = labelParam ? decodeURIComponent(labelParam) : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          return { lat, lng, label };
        }
      }
    }
    return null;
  });

  // AI Classification state
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [isFlaggedIncorrect, setIsFlaggedIncorrect] = React.useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedReport, setSubmittedReport] = React.useState<ReportDetail | null>(null);

  // Geolocation hook
  const {
    state: geoState,
    location: currentLocation,
    errorMessage: geoError,
    isManualOverride,
    requestLocation,
    setManualLocation,
    returnToGps,
  } = useGeolocation();

  // Pre-fill location if coming from map selection (e.g. /report/new?lat=...&lng=...&label=...)
  React.useEffect(() => {
    if (presetLocationInfo) {
      const timer = setTimeout(() => {
        setManualLocation(presetLocationInfo.lat, presetLocationInfo.lng, presetLocationInfo.label);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [presetLocationInfo, setManualLocation]);

  // Run AI analysis whenever a damage photo is uploaded (single photo mode)
  const handleAddFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;

    let item: MediaItem | null = null;
    if (repository.uploadMedia) {
      try {
        item = await repository.uploadMedia(f);
      } catch (uploadErr) {
        console.warn("Remote storage upload failed, falling back to data URL:", uploadErr);
      }
    }

    if (!item) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(f));
        reader.readAsDataURL(f);
      });
      item = {
        id: generateMediaId(),
        url: dataUrl,
        thumbnailUrl: dataUrl,
        mimeType: f.type || "image/jpeg",
        fileName: f.name,
        byteSize: f.size,
        isSanitized: true,
        createdAt: new Date().toISOString(),
      };
    }

    setMediaFiles([item]);
    triggerAiAnalysis(item.fileName, item);
  };

  const triggerAiAnalysis = async (fileName: string, mediaItem?: MediaItem) => {
    setIsAnalyzing(true);
    setAiError(null);
    try {
      // Call secure server endpoint /api/ai/classify
      const response = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: mediaItem?.url,
          fileName,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          setAiAnalysis(json.data);
          setSelectedCategory(json.data.primaryCategory);
          return;
        }
      }

      // Transparent deterministic fallback in demo/offline mode
      const result = await simulateDamageClassification(fileName, 1200);
      setAiAnalysis(result);
      setSelectedCategory(result.primaryCategory);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to analyze road damage image";
      setAiError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    const updated = mediaFiles.filter((m) => m.id !== fileId);
    setMediaFiles(updated);
    if (updated.length === 0) {
      setAiAnalysis(null);
    }
  };

  const handleSubmit = async () => {
    if (mediaFiles.length === 0) {
      toast.error("กรุณาแนบภาพถ่ายจุดชำรุดอย่างน้อย 1 ภาพ (หรือกดปุ่ม 'ใช้รูปตัวอย่าง' ด้านล่าง)");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const result = await repository.submitReport({
        draftId: `draft-${Date.now().toString()}`,
        idempotencyKey,
        ownerId: user?.id,
        category: aiAnalysis?.primaryCategory || selectedCategory || "pothole",
        description: description.trim() || undefined,
        locationContext: locationContext.trim() || undefined,
        location: currentLocation,
        media: mediaFiles,
        aiAnalysis: aiAnalysis || undefined,
      });

      setSubmittedReport(result);
      setStep(3);
      toast.success("ส่งรายงานความเสียหายเข้าสู่ระบบเรียบร้อยแล้ว!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถส่งรายงานได้ กรุณาลองใหม่อีกครั้ง";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetWizard = () => {
    setStep(1);
    setMediaFiles([]);
    setDescription("");
    setLocationContext("");
    setAiAnalysis(null);
    setSelectedCategory("pothole");
    setSubmittedReport(null);
    setPresetLocationInfo(null);
  };

  if (step === 3 && submittedReport) {
    return (
      <SubmissionSuccess
        report={submittedReport}
        onResetWizard={handleResetWizard}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Progress Header */}
      <div className="flex items-center justify-between px-1 sm:px-2">
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          <div
            className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 1 ? "bg-brand text-white shadow-xs" : "bg-surface-muted text-text-muted"
            }`}
          >
            {step > 1 ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : "1"}
          </div>
          <span
            className={`text-xs sm:text-sm font-semibold truncate ${
              step === 1 ? "text-text-primary" : "text-text-muted"
            }`}
          >
            1. ภาพถ่ายความเสียหาย
          </span>
          <div className="flex-1 max-w-6 sm:max-w-12 h-0.5 bg-border mx-1 shrink-0" />

          <div
            className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 2 ? "bg-brand text-white shadow-xs" : "bg-surface-muted text-text-muted"
            }`}
          >
            2
          </div>
          <span
            className={`text-xs sm:text-sm font-semibold truncate ${
              step === 2 ? "text-text-primary" : "text-text-muted"
            }`}
          >
            2. ยืนยันพิกัดบนแผนที่จริง
          </span>
        </div>
      </div>

      {/* Preset Location Banner (If redirected from /map) */}
      {presetLocationInfo && (
        <div className="p-3 sm:p-4 rounded-2xl bg-brand-soft/80 border border-brand/30 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-brand text-white shrink-0 shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-text-primary block truncate">
                เลือกตำแหน่งจากแผนที่แล้ว
              </span>
              <p className="text-text-secondary truncate mt-0.5">
                {presetLocationInfo.label} ({presetLocationInfo.lat.toFixed(4)},{" "}
                {presetLocationInfo.lng.toFixed(4)})
              </p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[11px] font-bold">
            พิกัดพร้อมแล้ว
          </span>
        </div>
      )}

      {/* STEP 1: EVIDENCE PHOTO */}
      {step === 1 && (
        <Card className="shadow-xs">
          <CardHeader>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Step 1 of 2 • ขั้นตอนที่ 1
            </span>
            <CardTitle className="text-xl sm:text-2xl mt-1">
              Drop a photo. We’ll help identify the damage.
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              ถ่ายหรืออัปโหลดภาพถ่ายจุดเกิดเหตุ ระบบช่วยตรวจจับประเภทความเสียหายอัตโนมัติ
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Upload Area */}
            <EvidenceUploader
              files={mediaFiles}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              maxFiles={1}
            />

            {/* AI Analysis Preview */}
            {(isAnalyzing || aiAnalysis || aiError) && (
              <ClassificationPanel
                isLoading={isAnalyzing}
                analysis={aiAnalysis}
                error={aiError}
                onRetry={() => mediaFiles[0] && triggerAiAnalysis(mediaFiles[0].fileName)}
              />
            )}
          </CardContent>

          <CardFooter className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-surface-muted/30 p-4 sm:p-6">
            <div className="text-xs text-text-muted flex items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
              <ShieldCheck className="h-4 w-4 text-brand shrink-0" />
              <span>ภาพถ่ายได้รับการปกป้องความเป็นส่วนตัว</span>
            </div>

            <Button
              type="button"
              disabled={mediaFiles.length === 0}
              onClick={() => {
                if (mediaFiles.length === 0) {
                  toast.error("กรุณาแนบภาพถ่ายอย่างน้อย 1 ภาพ (หรือกดปุ่ม 'ใช้รูปตัวอย่าง')");
                  return;
                }
                setStep(2);
              }}
              className="gap-2 font-semibold w-full sm:w-auto justify-center shrink-0"
            >
              <span>Next: Confirm Location (ถัดไป)</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: LOCATION & REVIEW */}
      {step === 2 && (
        <Card className="shadow-xs">
          <CardHeader>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Step 2 of 2 • ขั้นตอนที่ 2
            </span>
            <CardTitle className="text-xl sm:text-2xl mt-1">
              Confirm Incident Location (ยืนยันตำแหน่ง)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              ตรวจสอบตำแหน่งที่เกิดเหตุ สามารถลากหมุดบนแผนที่จริงเพื่อปรับตำแหน่งอย่างแม่นยำ
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* AI Summary Banner */}
            <ClassificationPanel
              isLoading={isAnalyzing}
              analysis={aiAnalysis}
              error={aiError}
              onRetry={() => mediaFiles[0] && triggerAiAnalysis(mediaFiles[0].fileName)}
              onFlagIncorrect={() => setIsFlaggedIncorrect(!isFlaggedIncorrect)}
              isFlaggedIncorrect={isFlaggedIncorrect}
            />

            {/* Interactive Leaflet Location Panel */}
            <LocationPanel
              location={currentLocation}
              state={geoState}
              errorMessage={geoError}
              isManualOverride={isManualOverride}
              onRequestLocation={requestLocation}
              onSelectCoordinates={(lat, lng, label) => setManualLocation(lat, lng, label)}
              onReturnToGps={returnToGps}
            />

            {/* Additional Context & Notes */}
            <div className="space-y-3.5 pt-2 border-t border-border-subtle">
              <Input
                label="จุดสังเกต หรือสถานที่ใกล้เคียง (Optional)"
                placeholder="e.g. In front of BTS station exit 2, near 7-Eleven"
                value={locationContext}
                onChange={(e) => setLocationContext(e.target.value)}
              />

              <Textarea
                label="รายละเอียดความเสียหายเพิ่มเติม (Optional)"
                placeholder="Briefly describe if traffic is blocked, hazard severity, or other observations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-surface-muted/30 p-4 sm:p-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              className="gap-1.5 w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>ย้อนกลับ (Back)</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleSubmit}
              className="gap-2 font-bold px-6 shadow-md w-full sm:w-auto justify-center"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Submit Road Report</span>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
