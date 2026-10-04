import { describe, it, expect, vi } from "vitest";
import {
  mapYoloClassToCategory,
  mapYoloSeverity,
  classifyWithCustomYolo,
} from "@/features/ai/custom-yolo-adapter";

describe("Custom YOLO Adapter & Mapping", () => {
  it("maps various YOLO damage classes to standardized DamageCategory", () => {
    expect(mapYoloClassToCategory("pothole")).toBe("pothole");
    expect(mapYoloClassToCategory("crack")).toBe("crack");
    expect(mapYoloClassToCategory("subsidence")).toBe("subsidence");
    expect(mapYoloClassToCategory("damaged sidewalk")).toBe("surface_wear");
    expect(mapYoloClassToCategory("sidewalk damage")).toBe("surface_wear");
    expect(mapYoloClassToCategory("sinkhole")).toBe("subsidence");
    expect(mapYoloClassToCategory("debris")).toBe("obstruction");
    expect(mapYoloClassToCategory("water puddle")).toBe("standing_water");
    expect(mapYoloClassToCategory("unknown_mark")).toBe("other");
    expect(mapYoloClassToCategory(null)).toBe("uncertain");
  });

  it("maps severity strings properly", () => {
    expect(mapYoloSeverity("high")).toBe("high");
    expect(mapYoloSeverity("medium")).toBe("medium");
    expect(mapYoloSeverity("low")).toBe("low");
    expect(mapYoloSeverity("unknown")).toBe("unknown");
    expect(mapYoloSeverity(null)).toBe("medium");
  });

  it("calls the YOLO endpoint and formats the prediction response correctly", async () => {
    const mockApiResponse = {
      provider: "custom_yolo",
      model: "yolo11s-road-v1",
      primaryCategory: "pothole",
      suggestedSeverity: "high",
      confidenceScore: 0.88,
      labels: [
        {
          category: "pothole",
          score: 0.88,
          boundingBox: { x: 120, y: 150, width: 200, height: 180 },
        },
      ],
      summary: "ระบบ AI ตรวจพบหลุมบ่อบนผิวทาง (ความมั่นใจ 88%)",
      needsHumanReview: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await classifyWithCustomYolo({
      imageBase64: "dGVzdC1pbWFnZQ==",
      fileName: "test.jpg",
      apiUrl: "http://127.0.0.1:7860",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:7860/predict");

    expect(result.provider).toBe("custom_yolo");
    expect(result.model).toBe("yolo11s-road-v1");
    expect(result.primaryCategory).toBe("pothole");
    expect(result.suggestedSeverity).toBe("high");
    expect(result.confidenceScore).toBe(0.88);
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0].category).toBe("pothole");
    expect(result.summary).toContain("หลุมบ่อ");

    vi.unstubAllGlobals();
  });

  it("handles empty detections by returning uncertain category and flagging for review", async () => {
    const mockEmptyResponse = {
      provider: "custom_yolo",
      model: "yolo11s-road-v1",
      primaryCategory: null,
      suggestedSeverity: "low",
      confidenceScore: 0.0,
      labels: [],
      summary: "ระบบ AI ไม่พบความเสียหายในภาพนี้",
      needsHumanReview: true,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEmptyResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await classifyWithCustomYolo({
      imageBase64: "dGVzdC1pbWFnZQ==",
      apiUrl: "http://127.0.0.1:7860",
    });

    expect(result.primaryCategory).toBe("uncertain");
    expect(result.needsHumanReview).toBe(true);
    expect(result.confidenceScore).toBe(0);

    vi.unstubAllGlobals();
  });
});
