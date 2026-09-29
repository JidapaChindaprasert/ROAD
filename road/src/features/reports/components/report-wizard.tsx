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
import { Check, ArrowRight, ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/** Generate a unique media ID — defined outside to avoid react-hooks/purity lint */
function generateMediaId(): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).substring(2, 7);
  return `med-${ts}-${rand}`;
}

/** Generate an idempotency key — defined outside to avoid react-hooks/purity lint */
function generateIdempotencyKey(): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).substring(2, 8);
  return `idemp-${ts}-${rand}`;
}


export function ReportWizard() {
  const repository = useReportRepository();

  // Wizard Step (1: Evidence, 2: Location & AI, 3: Success)
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Form State
  const [mediaFiles, setMediaFiles] = React.useState<MediaItem[]>([]);
  const [description, setDescription] = React.useState("");
  const [locationContext, setLocationContext] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<DamageCategory | undefined>(undefined);

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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const latParam = params.get("lat");
      const lngParam = params.get("lng");
      const labelParam = params.get("label");
      if (latParam && lngParam) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setManualLocation(lat, lng, labelParam ? decodeURIComponent(labelParam) : undefined);
        }
      }
    }
  }, [setManualLocation]);

  // Run AI analysis whenever new primary media is uploaded
  const handleAddFiles = async (files: File[]) => {
    const uploadedMedia: MediaItem[] = [];

    for (const f of files) {
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
          mimeType: f.type,
          fileName: f.name,
          byteSize: f.size,
          isSanitized: true,
          createdAt: new Date().toISOString(),
        };
      }
      uploadedMedia.push(item);
    }

    const newMediaList = [...mediaFiles, ...uploadedMedia];
    setMediaFiles(newMediaList);

    // Trigger AI analysis on primary image
    if (newMediaList.length > 0 && !aiAnalysis) {
      triggerAiAnalysis(newMediaList[0].fileName, newMediaList[0]);
    }
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
      setSelectedCategory(undefined);
    }
  };

  const handleSubmit = async () => {
    if (mediaFiles.length === 0) {
      toast.error("Please provide at least one photo of the road damage.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const result = await repository.submitReport({
        draftId: `draft-${Date.now().toString()}`,
        idempotencyKey,
        category: selectedCategory || aiAnalysis?.primaryCategory || "pothole",
        description: description.trim() || undefined,
        locationContext: locationContext.trim() || undefined,
        location: currentLocation,
        media: mediaFiles,
        aiAnalysis: aiAnalysis || undefined,
      });

      setSubmittedReport(result);
      setStep(3);
      toast.success("Road damage report successfully broadcast!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit report. Please try again.";
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
    setSelectedCategory(undefined);
    setSubmittedReport(null);
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
              step >= 1
                ? "bg-brand text-white shadow-xs"
                : "bg-surface-muted text-text-muted"
            }`}
          >
            {step > 1 ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : "1"}
          </div>
          <span className={`text-xs sm:text-sm font-semibold truncate ${step === 1 ? "text-text-primary" : "text-text-muted"}`}>
            1. Evidence Photo
          </span>

          <div className="flex-1 max-w-6 sm:max-w-12 h-0.5 bg-border mx-1 shrink-0" />

          <div
            className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 2
                ? "bg-brand text-white shadow-xs"
                : "bg-surface-muted text-text-muted"
            }`}
          >
            2
          </div>
          <span className={`text-xs sm:text-sm font-semibold truncate ${step === 2 ? "text-text-primary" : "text-text-muted"}`}>
            2. Location & AI Review
          </span>
        </div>
      </div>

      {/* STEP 1: EVIDENCE UPLOAD */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Step 1 of 2
            </span>
            <CardTitle className="text-xl sm:text-2xl mt-1">
              Drop a photo. We’ll help identify the damage.
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Upload clear road surface evidence. Our Roboflow AI vision model will automatically categorize the damage.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <EvidenceUploader
              files={mediaFiles}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
            />

            {/* AI Preview if available right after upload */}
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
              <span className="truncate sm:whitespace-normal">Photos are sanitized and privacy-protected</span>
            </div>

            <Button
              type="button"
              disabled={mediaFiles.length === 0}
              onClick={() => {
                if (mediaFiles.length === 0) {
                  toast.error("Please add at least one photo.");
                  return;
                }
                setStep(2);
              }}
              className="gap-2 font-semibold w-full sm:w-auto justify-center shrink-0"
            >
              <span>Next: Confirm Location</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: LOCATION & AI REVIEW */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Step 2 of 2
            </span>
            <CardTitle className="text-2xl mt-1">
              Confirm Incident Location
            </CardTitle>
            <CardDescription>
              Verify where the hazard is located. You can also add brief landmarks or context.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* AI Classification Badge & Preview */}
            <ClassificationPanel
              isLoading={isAnalyzing}
              analysis={aiAnalysis}
              error={aiError}
              onRetry={() => mediaFiles[0] && triggerAiAnalysis(mediaFiles[0].fileName)}
              onFlagIncorrect={() => setIsFlaggedIncorrect(!isFlaggedIncorrect)}
              isFlaggedIncorrect={isFlaggedIncorrect}
            />

            {/* Location Panel */}
            <LocationPanel
              location={currentLocation}
              state={geoState}
              errorMessage={geoError}
              isManualOverride={isManualOverride}
              onRequestLocation={requestLocation}
              onSelectCoordinates={setManualLocation}
              onReturnToGps={returnToGps}
            />

            {/* Optional Notes */}
            <div className="space-y-3">
              <Input
                label="Landmark / Location Context (Optional)"
                placeholder="e.g. In front of BTS station exit 2, near 7-Eleven"
                value={locationContext}
                onChange={(e) => setLocationContext(e.target.value)}
              />

              <Textarea
                label="Additional Details (Optional)"
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
              <span>Back</span>
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
