import { describe, it, expect } from "vitest";
import {
  mapRoboflowClassToCategory,
  determineSuggestedSeverity,
} from "@/features/ai/roboflow-adapter";

describe("Roboflow Adapter & Model Mapping", () => {
  it("maps various Roboflow damage classes to standardized DamageCategory", () => {
    expect(mapRoboflowClassToCategory("pothole")).toBe("pothole");
    expect(mapRoboflowClassToCategory("deep_pothole")).toBe("pothole");
    expect(mapRoboflowClassToCategory("longitudinal_crack")).toBe("crack");
    expect(mapRoboflowClassToCategory("alligator_crack")).toBe("crack");
    expect(mapRoboflowClassToCategory("surface_wear")).toBe("surface_wear");
    expect(mapRoboflowClassToCategory("rutting")).toBe("surface_wear");
    expect(mapRoboflowClassToCategory("sinkhole")).toBe("subsidence");
    expect(mapRoboflowClassToCategory("depression")).toBe("subsidence");
    expect(mapRoboflowClassToCategory("standing_water")).toBe("standing_water");
    expect(mapRoboflowClassToCategory("puddle")).toBe("standing_water");
    expect(mapRoboflowClassToCategory("debris_obstruction")).toBe("obstruction");
    expect(mapRoboflowClassToCategory("unknown_mark")).toBe("other");
  });

  it("calculates appropriate suggested severity based on damage category and confidence", () => {
    expect(determineSuggestedSeverity("subsidence", 0.85, 1)).toBe("high");
    expect(determineSuggestedSeverity("obstruction", 0.9, 1)).toBe("high");
    expect(determineSuggestedSeverity("pothole", 0.95, 1)).toBe("high");
    expect(determineSuggestedSeverity("pothole", 0.65, 1)).toBe("medium");
    expect(determineSuggestedSeverity("surface_wear", 0.9, 1)).toBe("medium");
    expect(determineSuggestedSeverity("other", 0.8, 1)).toBe("low");
  });
});
