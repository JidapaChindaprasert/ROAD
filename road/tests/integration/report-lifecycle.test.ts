import { describe, it, expect, beforeEach } from "vitest";
import { demoReportRepository } from "@/lib/repositories/demo-report-repository";
import { resetStoredDemoReports } from "@/lib/demo/storage";
import { simulateDamageClassification } from "@/features/ai/demo-classifier";

describe("ROAD End-to-End Incident Lifecycle (Integration)", () => {
  beforeEach(async () => {
    await demoReportRepository.resetDemoData?.();
  });

  it("submits, categorizes with AI, lists on community map, and completes lifecycle", async () => {
    // 1. Simulate AI classification on citizen photo
    const aiResult = await simulateDamageClassification("bangkok_asphalt_pothole.jpg");
    expect(aiResult.primaryCategory).toBe("pothole");
    expect(aiResult.suggestedSeverity).toBe("high");
    expect(aiResult.confidenceScore).toBeGreaterThan(0.7);

    // 2. Submit new report through repository
    const submitted = await demoReportRepository.submitReport({
      draftId: "draft-integration-test-01",
      idempotencyKey: "idem-key-test-001",
      category: aiResult.primaryCategory,
      description: "Severe pothole causing traffic obstruction on Sukhumvit Soi 55.",
      locationContext: "Near Thong Lo BTS station Exit 3",
      location: {
        latitude: 13.7314,
        longitude: 100.5812,
        accuracyMeters: 4.5,
        source: "gps",
        localityLabel: "Sukhumvit 55, Thong Lo",
        capturedAt: new Date().toISOString(),
      },
      media: [
        {
          id: "med-test-01",
          url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7",
          mimeType: "image/jpeg",
          fileName: "bangkok_asphalt_pothole.jpg",
          byteSize: 102400,
          isSanitized: true,
          createdAt: new Date().toISOString(),
        },
      ],
      aiAnalysis: aiResult,
    });

    expect(submitted.publicId).toMatch(/^(RD-2026-|ROAD-BKK-)/);
    expect(submitted.detailedStatus).toBe("reported");
    expect(submitted.publicStatus).toBe("reported");
    expect(submitted.events).toHaveLength(1);
    expect(submitted.events[0].actorRole).toBe("reporter");

    // 3. Verify incident is visible in community map public projection
    const publicReports = await demoReportRepository.listPublicReports({
      filters: { searchQuery: "Thong Lo" },
    });
    expect(publicReports.some((r) => r.id === submitted.id)).toBe(true);

    // 4. Staff triage: Acknowledge and assign operational priority P1
    const acknowledged = await demoReportRepository.transitionReport({
      reportId: submitted.id,
      targetStatus: "acknowledged",
      publicNote: "BMA Public Works District dispatched triage unit.",
      internalNote: "Priority P1 - Arterial road hazard.",
      expectedVersion: submitted.version,
      operationalPriority: "p1",
      assignedTeam: {
        id: "team-ops-1",
        name: "หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)",
        publicDisplayName: "หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)",
      },
    });

    expect(acknowledged.detailedStatus).toBe("acknowledged");
    expect(acknowledged.operationalPriority).toBe("p1");
    expect(acknowledged.assignedTeam?.name).toBe("หน่วยซ่อมบำรุงทาง 1 (สำนักการโยธา)");
    expect(acknowledged.version).toBe(2);

    // 5. Advance to Repairing
    const repairing = await demoReportRepository.transitionReport({
      reportId: submitted.id,
      targetStatus: "repairing",
      publicNote: "Road maintenance crew on site with hot-mix asphalt asphalt paver.",
      expectedVersion: acknowledged.version,
    });

    expect(repairing.detailedStatus).toBe("repairing");
    expect(repairing.publicStatus).toBe("repairing");
    expect(repairing.version).toBe(3);

    // 6. Complete and Resolve Incident
    const resolved = await demoReportRepository.transitionReport({
      reportId: submitted.id,
      targetStatus: "resolved",
      publicNote: "Asphalt patch compaction complete. Road reopened to regular traffic.",
      expectedVersion: repairing.version,
    });

    expect(resolved.detailedStatus).toBe("resolved");
    expect(resolved.publicStatus).toBe("fixed");
    expect(resolved.resolvedAt).toBeDefined();
    expect(resolved.events).toHaveLength(4);

    // 7. Verify optimistic concurrency rejection on stale version
    await expect(
      demoReportRepository.transitionReport({
        reportId: submitted.id,
        targetStatus: "assessing",
        publicNote: "Stale update attempt",
        expectedVersion: 1, // outdated version!
      })
    ).rejects.toThrow();
  });
});
