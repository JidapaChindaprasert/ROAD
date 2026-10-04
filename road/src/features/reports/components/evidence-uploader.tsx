"use client";

import * as React from "react";
import { MediaItem } from "../types";
import { UploadCloud, Camera, X, FileVideo, Image as ImageIcon, AlertTriangle, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EvidenceUploaderProps {
  files: MediaItem[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  maxFiles?: number;
  maxFileSizeMb?: number;
  className?: string;
}

export function EvidenceUploader({
  files,
  onAddFiles,
  onRemoveFile,
  maxFiles = 5,
  maxFileSizeMb = 25,
  className = "",
}: EvidenceUploaderProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);

  const isSupportedType = (file: File) => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/avif",
      "video/mp4",
      "video/webm",
    ];
    if (file.type && validTypes.includes(file.type.toLowerCase())) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif", "mp4", "webm"].includes(ext || "");
  };

  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const validFiles: File[] = [];
    const maxSizeBytes = maxFileSizeMb * 1024 * 1024;

    if (maxFiles === 1) {
      const file = fileList[0];
      if (!isSupportedType(file)) {
        setUploadError(`Unsupported file format: ${file.name}. Please upload JPG, PNG, WebP or MP4.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setUploadError(`File ${file.name} exceeds ${maxFileSizeMb}MB limit.`);
        return;
      }
      onAddFiles([file]);
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check max limit
      if (files.length + validFiles.length >= maxFiles) {
        setUploadError(`Maximum ${maxFiles} files allowed per report.`);
        break;
      }

      // Check format
      if (!isSupportedType(file)) {
        setUploadError(`Unsupported file format: ${file.name}. Please upload JPG, PNG, WebP or MP4.`);
        continue;
      }

      // Check size
      if (file.size > maxSizeBytes) {
        setUploadError(`File ${file.name} exceeds ${maxFileSizeMb}MB limit.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onAddFiles(validFiles);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  // Global and zone clipboard paste support (Ctrl+V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const validFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        validateAndAddFiles(validFiles as unknown as FileList);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [files.length]);

  const handlePasteClipboard = async () => {
    setUploadError(null);
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `pasted_road_evidence_${Date.now()}.png`, { type: imageType });
            onAddFiles([file]);
            return;
          }
        }
      }
    } catch {
      // Permission prompt declined or unsupported; explain shortcut
    }
    // Fallback notice
    setUploadError("กดปุ่ม Ctrl+V (หรือ Command+V) เพื่อแปะรูปภาพจากคลิปบอร์ดได้โดยตรง");
  };

  const sampleIndexRef = React.useRef(0);

  const handleLoadSample = () => {
    setUploadError(null);
    if (typeof document === "undefined") return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 420;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const types = ["pothole", "crack", "subsidence"] as const;
      const currentType = types[sampleIndexRef.current % types.length];
      sampleIndexRef.current += 1;

      // Dark asphalt roadbed
      ctx.fillStyle = "#2D3748";
      ctx.fillRect(0, 0, 640, 420);

      // Yellow lane divider
      ctx.fillStyle = "#ECC94B";
      ctx.fillRect(0, 200, 640, 20);

      if (currentType === "crack") {
        // Jagged asphalt crack across road
        ctx.strokeStyle = "#1A202C";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(100, 50);
        ctx.lineTo(240, 180);
        ctx.lineTo(290, 220);
        ctx.lineTo(400, 320);
        ctx.lineTo(540, 390);
        ctx.stroke();

        ctx.strokeStyle = "#718096";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(240, 180);
        ctx.lineTo(310, 140);
        ctx.moveTo(400, 320);
        ctx.lineTo(460, 350);
        ctx.stroke();

        ctx.fillStyle = "#A0AEC0";
        ctx.font = "bold 14px monospace";
        ctx.fillText("ROAD HAZARD #BKK-CRACK [SURFACE CRACK]", 20, 35);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "bangkok_surface_crack_sample.jpg", { type: "image/jpeg" });
            onAddFiles([file]);
          }
        }, "image/jpeg", 0.92);
      } else if (currentType === "subsidence") {
        // Sunken depressed road surface
        const grad = ctx.createLinearGradient(0, 100, 0, 350);
        grad.addColorStop(0, "#2D3748");
        grad.addColorStop(0.5, "#171923");
        grad.addColorStop(1, "#2D3748");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(320, 230, 220, 90, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#A0AEC0";
        ctx.font = "bold 14px monospace";
        ctx.fillText("ROAD HAZARD #BKK-SUBSIDENCE [SUBSIDENCE]", 20, 35);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "bangkok_subsidence_sample.jpg", { type: "image/jpeg" });
            onAddFiles([file]);
          }
        }, "image/jpeg", 0.92);
      } else {
        // Pothole cavity
        ctx.fillStyle = "#1A202C";
        ctx.beginPath();
        ctx.ellipse(320, 240, 110, 55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Surrounding asphalt fracture cracks
        ctx.strokeStyle = "#4A5568";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(210, 240);
        ctx.lineTo(160, 260);
        ctx.moveTo(430, 240);
        ctx.lineTo(480, 220);
        ctx.stroke();

        ctx.fillStyle = "#A0AEC0";
        ctx.font = "bold 14px monospace";
        ctx.fillText("ROAD HAZARD #BKK-POTHOLE [POTHOLE]", 20, 35);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "bangkok_pothole_sample.jpg", { type: "image/jpeg" });
            onAddFiles([file]);
          }
        }, "image/jpeg", 0.92);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none text-center ${
          dragActive
            ? "border-brand bg-brand-soft/50 scale-[1.01]"
            : "border-border hover:border-brand/50 hover:bg-surface-muted/50 bg-surface"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          aria-label="Upload evidence photos and videos"
          onChange={(e) => validateAndAddFiles(e.target.files)}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Capture evidence with camera"
          onChange={(e) => validateAndAddFiles(e.target.files)}
        />

        <div className="h-14 w-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3 shadow-xs">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h3 className="text-base font-bold text-text-primary">
          {maxFiles === 1
            ? "ถ่ายภาพ หรือเลือกรูปภาพความเสียหาย (1 ภาพ)"
            : "ลากไฟล์รูปภาพ หรือกดแปะรูป (Ctrl+V) ที่นี่"}
        </h3>
        <p className="text-xs text-text-secondary mt-1 max-w-sm">
          {maxFiles === 1
            ? "รองรับไฟล์ภาพถ่าย JPEG, PNG, WebP สูงสุด 10MB (ใส่ได้ 1 ภาพ)"
            : `รองรับ JPEG, PNG, WebP หรือวิดีโอ MP4 สูงสุด 10MB (แนบได้สูงสุด ${maxFiles} ไฟล์)`}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs"
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            เลือกรูปภาพ (Browse)
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePasteClipboard}
            className="text-xs"
            title="กดเพื่อแปะรูปภาพจากคลิปบอร์ด หรือกดปุ่มลัด Ctrl+V"
          >
            <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
            แปะรูป (Paste / Ctrl+V)
          </Button>

          <Button
            type="button"
            size="sm"
            variant="soft-brand"
            onClick={handleLoadSample}
            className="text-xs font-bold"
          >
            ⚡ ใช้รูปตัวอย่าง (Demo Photo)
          </Button>

          <Button
            type="button"
            size="sm"
            variant="soft-brand"
            onClick={() => cameraInputRef.current?.click()}
            className="text-xs sm:hidden"
          >
            <Camera className="h-3.5 w-3.5 mr-1" />
            ถ่ายภาพ
          </Button>
        </div>
      </div>

      {/* Upload Error Notice */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-danger-soft border border-danger-border text-xs text-danger flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Thumbnails list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">
              Attached Evidence ({files.length}/{maxFiles})
            </span>
            <span>Primary photo will be analyzed by AI</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map((file, idx) => {
              const isVideo = file.mimeType.startsWith("video/");

              return (
                <div
                  key={file.id}
                  className="relative group rounded-xl overflow-hidden border border-border bg-surface aspect-4/3 flex items-center justify-center shadow-xs"
                >
                  {isVideo ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <FileVideo className="h-8 w-8 text-brand mb-1" />
                      <span className="text-[10px] text-text-secondary truncate max-w-full px-1">
                        {file.fileName}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={file.url}
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Primary badge */}
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-brand text-white text-[10px] font-bold shadow-xs">
                      Primary
                    </span>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-text-primary/70 hover:bg-danger text-white transition-colors opacity-90 group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
