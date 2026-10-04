import { DamageCategory, SuggestedSeverity } from "../reports/types";
import { DamageClassificationResult } from "./types";

export interface CustomYoloClassificationParams {
  imageBase64?: string;
  imageUrl?: string;
  fileName?: string;
  apiUrl?: string;
  apiToken?: string;
}

export function mapYoloClassToCategory(className: string | null | undefined): DamageCategory {
  if (!className) return "uncertain";
  const normalized = className.toLowerCase().trim().replace(/[-_\s]+/g, "_");

  if (
    normalized.includes("subsidence") ||
    normalized.includes("sinkhole") ||
    normalized.includes("depression") ||
    normalized.includes("settlement")
  ) {
    return "subsidence";
  }
  if (normalized.includes("pothole") || normalized.includes("hole")) {
    return "pothole";
  }
  if (
    normalized.includes("crack") ||
    normalized.includes("alligator") ||
    normalized.includes("fracture")
  ) {
    return "crack";
  }
  if (
    normalized.includes("sidewalk") ||
    normalized.includes("surface_wear") ||
    normalized.includes("wear") ||
    normalized.includes("rut") ||
    normalized.includes("ravel")
  ) {
    return "surface_wear";
  }
  if (
    normalized.includes("debris") ||
    normalized.includes("obstruction") ||
    normalized.includes("barrier")
  ) {
    return "obstruction";
  }
  if (
    normalized.includes("water") ||
    normalized.includes("flood") ||
    normalized.includes("puddle")
  ) {
    return "standing_water";
  }

  return "other";
}

export function mapYoloSeverity(severity: string | null | undefined): SuggestedSeverity {
  if (!severity) return "medium";
  const s = severity.toLowerCase().trim();
  if (s === "high" || s === "urgent") return "high";
  if (s === "medium" || s === "moderate") return "medium";
  if (s === "low") return "low";
  return "unknown";
}

/**
 * Invokes the local or self-hosted ROAD YOLO inference API (FastAPI)
 */
export async function classifyWithCustomYolo(
  params: CustomYoloClassificationParams
): Promise<DamageClassificationResult> {
  const {
    imageBase64,
    imageUrl,
    fileName = "damage-evidence.jpg",
    apiUrl = process.env.YOLO_API_URL || "http://127.0.0.1:7860",
    apiToken = process.env.YOLO_API_TOKEN,
  } = params;

  let imageBlob: Blob;

  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    imageBlob = new Blob([buffer], { type: "image/jpeg" });
  } else if (imageUrl) {
    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      const mime = match?.[1] || "image/jpeg";
      const b64 = match?.[2] || imageUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      const buffer = Buffer.from(b64, "base64");
      imageBlob = new Blob([buffer], { type: mime });
    } else {
      // Remote HTTP/HTTPS URL
      const fetchRes = await fetch(imageUrl);
      if (!fetchRes.ok) {
        throw new Error(`Failed to fetch image from URL: ${fetchRes.status} ${fetchRes.statusText}`);
      }
      const arrayBuffer = await fetchRes.arrayBuffer();
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      imageBlob = new Blob([arrayBuffer], { type: contentType });
    }
  } else {
    throw new Error("No image data provided for YOLO classification");
  }

  const endpoint = `${apiUrl.replace(/\/+$/, "")}/predict`;

  const formData = new FormData();
  formData.append("file", imageBlob, fileName);

  const headers: Record<string, string> = {};
  if (apiToken) {
    headers["X-API-Token"] = apiToken;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (netErr: unknown) {
    const msg = netErr instanceof Error ? netErr.message : "Network error";
    throw new Error(
      `Failed to connect to YOLO service at ${endpoint}: ${msg}. Please ensure your road-ai FastAPI service is running (e.g. MODEL_PATH=best_v3.pt uvicorn main:app --host 0.0.0.0 --port 7860)`
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`YOLO API error (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();

  const labels = Array.isArray(data.labels)
    ? data.labels.map((l: { category?: string; score?: number; boundingBox?: { x: number; y: number; width: number; height: number } }) => ({
        category: mapYoloClassToCategory(l.category),
        score: typeof l.score === "number" ? l.score : undefined,
        boundingBox: l.boundingBox,
      }))
    : [];

  const rawPrimary = data.primaryCategory;
  const primaryCategory: DamageCategory = rawPrimary
    ? mapYoloClassToCategory(rawPrimary)
    : labels[0]?.category || "uncertain";

  const suggestedSeverity = mapYoloSeverity(data.suggestedSeverity);
  const confidenceScore = typeof data.confidenceScore === "number" ? data.confidenceScore : labels[0]?.score || 0;

  return {
    provider: "custom_yolo",
    model: data.model || "yolo11s-road-v1",
    primaryCategory,
    suggestedSeverity,
    confidenceScore,
    labels,
    summary: data.summary || `Custom YOLO detected ${primaryCategory.replace("_", " ")} (${Math.round(confidenceScore * 100)}%)`,
    needsHumanReview: data.needsHumanReview ?? (confidenceScore < 0.65 || primaryCategory === "subsidence"),
    imageQualityIssues: [],
    isDemo: false,
  };
}
