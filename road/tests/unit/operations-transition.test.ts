import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredDemoReports,
  transitionDemoReportStatus,
  resetStoredDemoReports,
} from "@/lib/demo/storage";

describe("Operations Transition & Concurrency Control", () => {
  beforeEach(() => {
    resetStoredDemoReports();
  });

  it("updates report detailed status, bumps version, and appends timeline event", () => {
    const reports = getStoredDemoReports();
    const first = reports[0];
    const initialVersion = first.version;

    const updated = transitionDemoReportStatus({
      reportId: first.id,
      targetStatus: "acknowledged",
      publicNote: "Inspection dispatched by district engineering office.",
      internalNote: "Crew #3 assigned.",
      expectedVersion: initialVersion,
      operationalPriority: "p1",
      assignedTeam: {
        id: "team-ops-1",
        name: "หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)",
        publicDisplayName: "หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)",
      },
    });

    expect(updated.detailedStatus).toBe("acknowledged");
    expect(updated.version).toBe(initialVersion + 1);
    expect(updated.operationalPriority).toBe("p1");
    expect(updated.assignedTeam?.name).toBe("หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)");

    const lastEvent = updated.events[updated.events.length - 1];
    expect(lastEvent.toStatus).toBe("acknowledged");
    expect(lastEvent.publicNote).toBe("Inspection dispatched by district engineering office.");
    expect(lastEvent.internalNote).toBe("Crew #3 assigned.");
    expect(lastEvent.actorRole).toBe("staff");
  });

  it("records canonicalReportId when marked as duplicate", () => {
    const reports = getStoredDemoReports();
    const second = reports[1];

    const updated = transitionDemoReportStatus({
      reportId: second.id,
      targetStatus: "duplicate",
      publicNote: "Marked as duplicate of master report.",
      expectedVersion: second.version,
      canonicalReportId: "ROAD-BKK-0001",
    });

    expect(updated.detailedStatus).toBe("duplicate");
    expect(updated.canonicalReportId).toBe("ROAD-BKK-0001");
  });

  it("throws an error when transitioning non-existent report", () => {
    expect(() =>
      transitionDemoReportStatus({
        reportId: "non-existent-report-id",
        targetStatus: "acknowledged",
        publicNote: "Note",
        expectedVersion: 1,
      })
    ).toThrow(/not found/);
  });
});
