import { DamageClassificationResult } from "./types";
import { DamageCategory } from "../reports/types";

export async function simulateDamageClassification(
  fileName: string = "evidence.jpg",
  delayMs: number = 1000
): Promise<DamageClassificationResult> {
  // Simulate processing latency
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const lowerName = fileName.toLowerCase();

  let primaryCategory: DamageCategory = "pothole";
  let confidenceScore = 0.96;
  let labels = [
    {
      category: "pothole" as DamageCategory,
      score: 0.96,
      boundingBox: { x: 300, y: 220, width: 220, height: 160 },
    },
    {
      category: "crack" as DamageCategory,
      score: 0.82,
      boundingBox: { x: 420, y: 310, width: 150, height: 90 },
    },
  ];
  let summary = "Deep pothole with surrounding surface micro-cracking detected.";
  let suggestedSeverity: "high" | "medium" | "low" = "high";

  if (lowerName.includes("crack") || lowerName.includes("line")) {
    primaryCategory = "crack";
    confidenceScore = 0.91;
    labels = [
      {
        category: "crack",
        score: 0.91,
        boundingBox: { x: 200, y: 150, width: 400, height: 280 },
      },
    ];
    summary = "Extensive longitudinal surface crack detected across traffic line.";
    suggestedSeverity = "medium";
  } else if (lowerName.includes("water") || lowerName.includes("rain") || lowerName.includes("puddle")) {
    primaryCategory = "standing_water";
    confidenceScore = 0.94;
    labels = [
      {
        category: "standing_water",
        score: 0.94,
        boundingBox: { x: 120, y: 200, width: 480, height: 240 },
      },
    ];
    summary = "Ponding water obscuring road markings with blocked drainage.";
    suggestedSeverity = "medium";
  } else if (lowerName.includes("sink") || lowerName.includes("trench") || (lowerName.includes("hole") && !lowerName.includes("pothole"))) {
    primaryCategory = "subsidence";
    confidenceScore = 0.89;
    labels = [
      {
        category: "subsidence",
        score: 0.89,
        boundingBox: { x: 180, y: 190, width: 340, height: 210 },
      },
    ];
    summary = "Ground subsidence and roadbed depression near service manhole.";
    suggestedSeverity = "high";
  } else if (lowerName.includes("wear") || lowerName.includes("rut")) {
    primaryCategory = "surface_wear";
    confidenceScore = 0.88;
    labels = [
      {
        category: "surface_wear",
        score: 0.88,
        boundingBox: { x: 90, y: 170, width: 420, height: 250 },
      },
    ];
    summary = "Surface asphalt wear and rutting along high load channel.";
    suggestedSeverity = "low";
  }

  return {
    provider: "roboflow",
    model: "roboflow-road-damage-v4 (demo)",
    primaryCategory,
    suggestedSeverity,
    confidenceScore,
    labels,
    summary,
    needsHumanReview: primaryCategory === "subsidence",
    imageQualityIssues: [],
    isDemo: true,
  };
}
