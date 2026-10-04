import { DamageCategory, SuggestedSeverity } from "../reports/types";
import { RoboflowPrediction, DamageClassificationResult } from "./types";

export function mapRoboflowClassToCategory(className: string): DamageCategory {
  const normalized = className.toLowerCase().trim().replace(/[-_\s]+/g, "_");

  // Check subsidence first to avoid "sinkhole" matching "hole" in pothole branch
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
    normalized.includes("longitudinal") ||
    normalized.includes("transverse")
  ) {
    return "crack";
  }
  if (
    normalized.includes("wear") ||
    normalized.includes("rut") ||
    normalized.includes("ravel") ||
    normalized.includes("bleeding") ||
    normalized.includes("weathering")
  ) {
    return "surface_wear";
  }
  if (
    normalized.includes("debris") ||
    normalized.includes("obstruction") ||
    normalized.includes("barrier") ||
    normalized.includes("object")
  ) {
    return "obstruction";
  }
  if (
    normalized.includes("water") ||
    normalized.includes("flood") ||
    normalized.includes("puddle") ||
    normalized.includes("ponding")
  ) {
    return "standing_water";
  }

  return "other";
}

export function determineSuggestedSeverity(
  category: DamageCategory,
  confidence: number,
  predictionsCount: number
): SuggestedSeverity {
  if (category === "subsidence" || category === "obstruction") {
    return "high";
  }
  if (category === "pothole") {
    return confidence > 0.85 || predictionsCount > 1 ? "high" : "medium";
  }
  if (category === "crack") {
    return predictionsCount > 2 ? "high" : "medium";
  }
  if (category === "surface_wear" || category === "standing_water") {
    return "medium";
  }
  return "low";
}

export async function classifyWithRoboflow(params: {
  imageBase64?: string;
  imageUrl?: string;
  apiKey?: string;
  modelId?: string;
  version?: string;
  confidenceThreshold?: number;
}): Promise<DamageClassificationResult> {
  const {
    imageBase64,
    imageUrl,
    apiKey = process.env.ROBOFLOW_API_KEY,
    modelId = process.env.ROBOFLOW_MODEL_ID || "road-damage-detection",
    version = process.env.ROBOFLOW_VERSION || "1",
    confidenceThreshold = 0.4,
  } = params;

  if (!apiKey) {
    throw new Error("Roboflow API key is not configured");
  }

  const endpoint = `https://detect.roboflow.com/${modelId}/${version}?api_key=${apiKey}&confidence=${confidenceThreshold * 100}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": imageBase64 ? "application/x-www-form-urlencoded" : "application/json",
    },
    body: imageBase64 || JSON.stringify({ image: imageUrl }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roboflow API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const predictions: RoboflowPrediction[] = data.predictions || [];

  if (predictions.length === 0) {
    return {
      provider: "roboflow",
      model: `${modelId}/${version}`,
      primaryCategory: "uncertain",
      suggestedSeverity: "unknown",
      confidenceScore: 0,
      labels: [],
      summary: "No prominent road damage detected with high certainty in this frame.",
      needsHumanReview: true,
      imageQualityIssues: [],
    };
  }

  // Sort by confidence descending
  predictions.sort((a, b) => b.confidence - a.confidence);
  const primaryPrediction = predictions[0];
  const primaryCategory = mapRoboflowClassToCategory(primaryPrediction.class);
  const suggestedSeverity = determineSuggestedSeverity(
    primaryCategory,
    primaryPrediction.confidence,
    predictions.length
  );

  const labels = predictions.map((p) => ({
    category: mapRoboflowClassToCategory(p.class),
    score: Number(p.confidence.toFixed(2)),
    boundingBox: {
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
    },
  }));

  return {
    provider: "roboflow",
    model: `${modelId}/${version}`,
    primaryCategory,
    suggestedSeverity,
    confidenceScore: primaryPrediction.confidence,
    labels,
    summary: `AI automated scan identified ${primaryCategory.replace("_", " ")} with ${(
      primaryPrediction.confidence * 100
    ).toFixed(0)}% model score.`,
    needsHumanReview: primaryCategory === "subsidence" || primaryPrediction.confidence < 0.65,
    imageQualityIssues: [],
  };
}
