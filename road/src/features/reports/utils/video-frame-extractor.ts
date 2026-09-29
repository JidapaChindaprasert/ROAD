/**
 * Browser-side Video Representative Frame Extractor
 * Follows ROAD SKILL.md Section 7.2
 * Extracts up to 3 sampled representative frames from user-selected video evidence.
 */

export interface ExtractedFrame {
  file: File;
  previewUrl: string;
  timestampSeconds: number;
}

/**
 * Extracts representative frames (beginning, middle, 3/4) from a video file
 */
export async function extractVideoFrames(
  videoFile: File,
  maxFrames = 3
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    // Check if in browser environment
    if (typeof window === "undefined" || typeof document === "undefined") {
      return resolve([]);
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    const frames: ExtractedFrame[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      canvas.remove();
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      // Target points: 15%, 50%, 80% through the clip
      const samplePoints = [
        Math.min(0.5, duration * 0.15),
        duration * 0.5,
        duration * 0.8,
      ].slice(0, maxFrames);

      canvas.width = Math.min(video.videoWidth || 1280, 1280);
      canvas.height = Math.min(video.videoHeight || 720, 720);

      try {
        for (let i = 0; i < samplePoints.length; i++) {
          const targetTime = samplePoints[i];
          await seekToTime(video, targetTime);

          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
            if (blob) {
              const frameFile = new File(
                [blob],
                `frame-${i + 1}-${videoFile.name.replace(/\.[^/.]+$/, "")}.jpg`,
                { type: "image/jpeg" }
              );
              frames.push({
                file: frameFile,
                previewUrl: URL.createObjectURL(frameFile),
                timestampSeconds: targetTime,
              });
            }
          }
        }
        cleanup();
        resolve(frames);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to decode or process video frames in this browser."));
    };
  });
}

function seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
