import { describe, it, expect } from "vitest";
import {
  PUBLIC_STATUS_MAPPING,
  canTransitionStatus,
  DAMAGE_CATEGORY_CONFIG,
  STATUS_DISPLAY_CONFIG,
} from "@/features/reports/status-machine";

describe("Status Machine & Domain Rules", () => {
  it("correctly maps internal lifecycle statuses to public-safe groups", () => {
    expect(PUBLIC_STATUS_MAPPING.reported).toBe("reported");
    expect(PUBLIC_STATUS_MAPPING.acknowledged).toBe("reported");
    expect(PUBLIC_STATUS_MAPPING.assessing).toBe("reported");
    expect(PUBLIC_STATUS_MAPPING.scheduled).toBe("reported");
    expect(PUBLIC_STATUS_MAPPING.repairing).toBe("repairing");
    expect(PUBLIC_STATUS_MAPPING.resolved).toBe("fixed");
  });

  it("enforces staff-only status transition permissions", () => {
    expect(canTransitionStatus("reported", "acknowledged", "reporter")).toBe(false);
    expect(canTransitionStatus("reported", "acknowledged", "staff")).toBe(true);
    expect(canTransitionStatus("reported", "acknowledged", "admin")).toBe(true);
  });

  it("permits reopening a resolved report back into assessing with staff role", () => {
    expect(canTransitionStatus("resolved", "assessing", "staff")).toBe(true);
    expect(canTransitionStatus("resolved", "repairing", "staff")).toBe(false);
  });

  it("contains complete metadata for all damage categories", () => {
    expect(DAMAGE_CATEGORY_CONFIG.pothole.label).toBe("Pothole");
    expect(DAMAGE_CATEGORY_CONFIG.crack.label).toBe("Road Surface Crack");
    expect(DAMAGE_CATEGORY_CONFIG.subsidence.label).toContain("Subsidence");
  });
});
