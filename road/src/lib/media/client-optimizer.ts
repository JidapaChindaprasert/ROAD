/**
 * Client-Side Image Optimizer
 * Resizes and compresses user-uploaded road damage evidence in the browser before upload.
 * 
 * Benefits:
 * - Prevents 413 (Payload Too Large) HTTP errors from raw 15-25MB camera photos
 * - Reduces upload time from ~10s to ~100ms on cellular connections
 * - Saves Supabase storage space (reducing file size from 15MB to ~350KB)
 * - Optimizes memory usage for the YOLO inference service (which resizes to 640x640)
 */

export interface CompressionOptions {
  /** Maximum width or height in pixels (default: 1600) */
  maxDimension?: number;
  /** JPEG compression quality between 0.1 and 1.0 (default: 0.85) */
  quality?: number;
  /** Threshold size in bytes below which compression is skipped if dimensions fit (default: 500KB) */
  skipThresholdBytes?: number;
}

export async function compressImageForUpload(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1600,
    quality = 0.85,
    skipThresholdBytes = 500 * 1024,
  } = options;

  // Only compress images (skip videos and non-image files)
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip SVG or animated GIFs to prevent stripping or corrupting
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  // SSR safeguard
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  return new Promise<File>((resolve) => {
    let settled = false;
    let objectUrl = "";

    const finish = (result: File) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore cleanup error
        }
      }
      resolve(result);
    };

    // Safety timeout: Never hang indefinitely if browser image decoding stalls or in headless environments
    const timer = setTimeout(() => {
      finish(file);
    }, 2500);

    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      return finish(file);
    }

    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        // If image is already smaller than maxDimension and under threshold, return original
        if (width <= maxDimension && height <= maxDimension && file.size <= skipThresholdBytes) {
          return finish(file);
        }

        // Calculate aspect-ratio-preserved scaled dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return finish(file);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with chosen quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return finish(file);
            }

            // Create a clean new JPEG file name
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const newFileName = `${baseName}.jpg`;

            const optimizedFile = new File([blob], newFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            // If compressed file ended up larger than original, stick with original
            if (optimizedFile.size >= file.size) {
              return finish(file);
            }

            finish(optimizedFile);
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        console.warn("Canvas compression error, falling back to original file:", err);
        finish(file);
      }
    };

    img.onerror = (err) => {
      console.warn("Failed to decode image for compression, falling back to original:", err);
      finish(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Converts a File or Blob into a base64 Data URL
 */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
