import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, env } from "@/lib/env";
import { classifyWithRoboflow } from "@/features/ai/roboflow-adapter";
import { simulateDamageClassification } from "@/features/ai/demo-classifier";
import { AIAnalysisResult } from "@/features/reports/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, imageUrl, fileName } = body;

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Either imageBase64 or imageUrl is required for damage classification.",
          },
        },
        { status: 400 }
      );
    }

    // Demo Mode or No API Key: return transparent simulated classification
    if (isDemoMode || !env.ROBOFLOW_API_KEY) {
      const demoResult = await simulateDamageClassification(fileName || "evidence.jpg", 100);
      return NextResponse.json({
        data: demoResult,
        mode: "demo",
        note: "[Simulated AI] Model results generated deterministically for zero-credential demonstration.",
      });
    }

    // Production Mode: Invoke Roboflow inference server-side
    const classification = await classifyWithRoboflow({
      imageBase64,
      imageUrl,
      apiKey: env.ROBOFLOW_API_KEY,
      modelId: env.ROBOFLOW_MODEL_ID,
      version: env.ROBOFLOW_VERSION,
      confidenceThreshold: env.ROBOFLOW_CONFIDENCE_THRESHOLD,
    });

    const formattedResult: AIAnalysisResult = {
      provider: "roboflow",
      model: classification.model,
      labels: classification.labels,
      primaryCategory: classification.primaryCategory,
      suggestedSeverity: classification.suggestedSeverity,
      summary: classification.summary,
      needsHumanReview: classification.needsHumanReview,
      imageQualityIssues: classification.imageQualityIssues,
      confidenceScore: classification.confidenceScore,
      isDemo: false,
    };

    return NextResponse.json({ data: formattedResult, mode: "production" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Classification service error";
    return NextResponse.json(
      {
        error: {
          code: "AI_SERVICE_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
