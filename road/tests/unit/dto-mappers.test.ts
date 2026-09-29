import { describe, it, expect } from "vitest";
import {
  mapDbFeatureToSummary,
  mapDbReportToDetail,
  DbPublicFeatureRow,
  DbReportRow,
  DbTimelineEventRow,
} from "@/lib/supabase/dto-mappers";

describe("DTO Separation & Privacy Protection", () => {
  const mockPublicFeatureRow: DbPublicFeatureRow = {
    report_id: "rep-101",
    public_id: "REP-BKK-001",
    category: "pothole",
    public_status: "reported",
    detailed_status: "acknowledged",
    approx_longitude: 100.5234,
    approx_latitude: 13.7456,
    locality_label: "Siam Square, Pathum Wan",
    approved_public_summary: "Deep asphalt pothole near pedestrian crossing",
    thumbnail_url: "https://example.com/thumb.jpg",
    version: 1,
    created_at: "2026-09-29T10:00:00Z",
    updated_at: "2026-09-29T10:00:00Z",
  };

  const mockDbReportRow: DbReportRow = {
    id: "rep-101",
    public_id: "REP-BKK-001",
    owner_id: "user-uuid-999",
    category: "pothole",
    status: "repairing",
    operational_priority: "p2",
    gps_accuracy_m: 3.5,
    location_source: "gps",
    locality_label: "Siam Square, Pathum Wan",
    location_context: "In front of Exit 4",
    description: "Hazardous pothole causing motorbikes to swerve",
    public_longitude: 100.5230, // Snapped grid
    public_latitude: 13.7450,
    exact_longitude: 100.523412, // Precise GPS
    exact_latitude: 13.745678,
    version: 3,
    created_at: "2026-09-29T10:00:00Z",
    updated_at: "2026-09-29T11:00:00Z",
  };

  const mockEvents: DbTimelineEventRow[] = [
    {
      id: "ev-1",
      report_id: "rep-101",
      from_status: "reported",
      to_status: "repairing",
      public_note: "Engineering crew arrived on site with asphalt patching gear.",
      internal_note: "CONFIDENTIAL: Contractor crew #4 dispatched, supervisor phone 081-xxx.",
      actor_name: "Municipal Road Maintenance",
      actor_role: "staff",
      created_at: "2026-09-29T11:00:00Z",
    },
  ];

  it("correctly maps public features to ReportSummary", () => {
    const summary = mapDbFeatureToSummary(mockPublicFeatureRow);
    expect(summary.id).toBe("rep-101");
    expect(summary.publicId).toBe("REP-BKK-001");
    expect(summary.publicLongitude).toBe(100.5234);
    expect(summary.publicLatitude).toBe(13.7456);
    expect(summary.category).toBe("pothole");
    expect(summary.publicStatus).toBe("reported");
  });

  it("strips exact GPS, ownerId, and internal notes for public anonymous users", () => {
    const publicDetail = mapDbReportToDetail(mockDbReportRow, {
      currentUserId: null,
      isStaff: false,
      events: mockEvents,
    });

    // Public location must be present
    expect(publicDetail.publicLocation.longitude).toBe(100.5230);
    expect(publicDetail.publicLocation.latitude).toBe(13.7450);
    expect(publicDetail.publicLocation.isGeneralized).toBe(true);

    // Exact location must be completely omitted
    expect(publicDetail.exactLocation).toBeUndefined();

    // Owner ID must be omitted
    expect(publicDetail.ownerId).toBeUndefined();

    // Internal notes must be stripped from public timeline events
    expect(publicDetail.events[0].publicNote).toBe(
      "Engineering crew arrived on site with asphalt patching gear."
    );
    expect(publicDetail.events[0].internalNote).toBeUndefined();
  });

  it("exposes exact GPS, ownerId, and internal notes for authorized staff members", () => {
    const staffDetail = mapDbReportToDetail(mockDbReportRow, {
      currentUserId: "staff-uuid-123",
      isStaff: true,
      events: mockEvents,
    });

    // Staff sees exact coordinates
    expect(staffDetail.exactLocation).toBeDefined();
    expect(staffDetail.exactLocation?.longitude).toBe(100.523412);
    expect(staffDetail.exactLocation?.latitude).toBe(13.745678);
    expect(staffDetail.ownerId).toBe("user-uuid-999");

    // Staff sees internal notes
    expect(staffDetail.events[0].internalNote).toBe(
      "CONFIDENTIAL: Contractor crew #4 dispatched, supervisor phone 081-xxx."
    );
  });

  it("allows report owners to view their own report exact coordinates", () => {
    const ownerDetail = mapDbReportToDetail(mockDbReportRow, {
      currentUserId: "user-uuid-999", // matches owner_id
      isStaff: false,
      events: mockEvents,
    });

    expect(ownerDetail.exactLocation).toBeDefined();
    expect(ownerDetail.exactLocation?.longitude).toBe(100.523412);
    expect(ownerDetail.ownerId).toBe("user-uuid-999");
    // Non-staff owner does not see internal staff-only notes
    expect(ownerDetail.events[0].internalNote).toBeUndefined();
  });
});
