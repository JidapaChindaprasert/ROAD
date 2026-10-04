import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, env } from "@/lib/env";
import { classifyWithRoboflow } from "@/features/ai/roboflow-adapter";
import { classifyWithCustomYolo } from "@/features/ai/custom-yolo-adapter";
import { simulateDamageClassification } from "@/features/ai/demo-classifier";
import { AIAnalysisResult } from "@/features/reports/types";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let imageBase64: string | undefined;
    let imageUrl: string | undefined;
    let fileName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        fileName = file.name;
        const arrayBuf = await file.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuf).toString("base64");
      }
      imageUrl = (formData.get("imageUrl") as string) || undefined;
    } else {
      let body: { imageBase64?: string; imageUrl?: string; fileName?: string } = {};
      try {
        body = await req.json();
      } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : "Failed to parse JSON body";
        return NextResponse.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: `Could not parse request body (${msg}). If sending a large image, optimize/compress it client-side or use multipart/form-data.`,
            },
          },
          { status: 400 }
        );
      }
      imageBase64 = body.imageBase64;
      imageUrl = body.imageUrl;
      fileName = body.fileName;
    }

    if (imageUrl?.startsWith("data:")) {
      imageBase64 = imageUrl;
      imageUrl = undefined;
    }

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Either imageBase64, imageUrl, or uploaded file is required for damage classification.",
          },
        },
        { status: 400 }
      );
    }

    // Demo Mode: return transparent simulated classification
    if (isDemoMode || env.AI_PROVIDER === "demo") {
      const demoResult = await simulateDamageClassification(fileName || "evidence.jpg", 100);
      return NextResponse.json({
        data: demoResult,
        mode: "demo",
        note: "[Simulated AI] Model results generated deterministically for zero-credential demonstration.",
      });
    }

    // Production Mode: Dispatch according to configured AI_PROVIDER
    if (env.AI_PROVIDER === "custom_yolo") {
      const yoloResult = await classifyWithCustomYolo({
        imageBase64,
        imageUrl,
        fileName,
        apiUrl: env.YOLO_API_URL,
        apiToken: env.YOLO_API_TOKEN,
      });

      const formattedResult: AIAnalysisResult = {
        provider: "custom_yolo",
        model: yoloResult.model,
        labels: yoloResult.labels,
        primaryCategory: yoloResult.primaryCategory,
        suggestedSeverity: yoloResult.suggestedSeverity,
        summary: yoloResult.summary,
        needsHumanReview: yoloResult.needsHumanReview,
        imageQualityIssues: yoloResult.imageQualityIssues,
        confidenceScore: yoloResult.confidenceScore,
        isDemo: false,
      };

      return NextResponse.json({ data: formattedResult, mode: "production" });
    }

    if (env.AI_PROVIDER === "roboflow") {
      if (!env.ROBOFLOW_API_KEY) {
        return NextResponse.json(
          {
            error: {
              code: "CONFIG_ERROR",
              message: "Roboflow API key is not configured in production mode.",
            },
          },
          { status: 500 }
        );
      }

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
    }

    // If another provider is specified or fallback
    throw new Error(`Unsupported or unconfigured AI provider: ${env.AI_PROVIDER}`);
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

