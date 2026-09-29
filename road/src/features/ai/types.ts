import { DamageCategory, SuggestedSeverity, BoundingBox } from "../reports/types";

export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id?: number;
}

export interface RoboflowResponse {
  time: number;
  image: {
    width: number;
    height: number;
  };
  predictions: RoboflowPrediction[];
}

export interface DamageClassificationResult {
  provider: "roboflow" | "openai" | "demo";
  model: string;
  primaryCategory: DamageCategory;
  suggestedSeverity: SuggestedSeverity;
  confidenceScore: number;
  labels: Array<{
    category: DamageCategory;
    score: number;
    boundingBox?: BoundingBox;
  }>;
  summary: string;
  needsHumanReview: boolean;
  imageQualityIssues: string[];
  isDemo?: boolean;
}
