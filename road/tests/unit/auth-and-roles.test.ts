import { describe, it, expect } from "vitest";
import { mapDbReportToDetail, DbReportRow } from "@/lib/supabase/dto-mappers";
import { getDemoUser } from "@/features/auth/demo-users";
import { requireRole } from "@/lib/auth/server-auth";
import { NextRequest } from "next/server";

describe("Authentication & Role-Based Authorization", () => {
  describe("Role Verification & Access Levels", () => {
    it("returns correct verified privileges for Citizen Reporter", () => {
      const reporter = getDemoUser("reporter");
      expect(reporter.role).toBe("reporter");
      expect(reporter.isStaff).toBe(false);
      expect(reporter.isAdmin).toBe(false);
    });

    it("returns correct verified privileges for Maintenance Staff", () => {
      const staff = getDemoUser("staff");
      expect(staff.role).toBe("staff");
      expect(staff.isStaff).toBe(true);
      expect(staff.isAdmin).toBe(false);
      expect(staff.roles).toContain("staff");
    });

    it("returns correct verified privileges for District Admin", () => {
      const admin = getDemoUser("admin");
      expect(admin.role).toBe("admin");
      expect(admin.isStaff).toBe(true);
      expect(admin.isAdmin).toBe(true);
      expect(admin.roles).toContain("admin");
    });

    it("enforces requireRole boundary: permits staff for staff-only endpoint", async () => {
      const req = new NextRequest("http://localhost:3000/api/operations", {
        headers: { "x-demo-role": "staff" },
      });
      const user = await requireRole(["staff", "admin"], req);
      expect(user.isStaff).toBe(true);
    });

    it("enforces requireRole boundary: rejects reporter from staff-only endpoint", async () => {
      const req = new NextRequest("http://localhost:3000/api/operations", {
        headers: { "x-demo-role": "reporter" },
      });
      await expect(requireRole(["staff", "admin"], req)).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
    });

    it("enforces requireRole boundary: rejects staff from admin-only endpoint", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users", {
        headers: { "x-demo-role": "staff" },
      });
      await expect(requireRole(["admin"], req)).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
    });
  });

  describe("Privacy & Coordinate Scoping (SKILL.md §13.1)", () => {
    const mockReportRow: DbReportRow = {
      id: "rep-test-privacy-01",
      public_id: "ROAD-TEST-001",
      owner_id: "user-owner-123",
      category: "pothole",
      status: "reported",
      version: 1,
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      public_latitude: 13.7392,
      public_longitude: 100.5621,
      exact_latitude: 13.739182,
      exact_longitude: 100.562085,
      operational_priority: "p2",
      gps_accuracy_m: 3.5,
      locality_label: "Sukhumvit 21",
    };

    it("discloses exact GPS coordinates to the report owner", () => {
      const detail = mapDbReportToDetail(mockReportRow, {
        currentUserId: "user-owner-123",
        isStaff: false,
      });

      expect(detail.ownerId).toBe("user-owner-123");
      expect(detail.exactLocation).toBeDefined();
      expect(detail.exactLocation?.latitude).toBeCloseTo(13.739182, 5);
      expect(detail.exactLocation?.longitude).toBeCloseTo(100.562085, 5);
      expect(detail.exactLocation?.accuracyMeters).toBe(3.5);
    });

    it("discloses exact GPS coordinates to authorized maintenance staff", () => {
      const detail = mapDbReportToDetail(mockReportRow, {
        currentUserId: "different-user-staff",
        isStaff: true,
      });

      expect(detail.exactLocation).toBeDefined();
      expect(detail.exactLocation?.latitude).toBeCloseTo(13.739182, 5);
    });

    it("strictly hides exact GPS coordinates from public and unprivileged users", () => {
      const detail = mapDbReportToDetail(mockReportRow, {
        currentUserId: "unrelated-citizen-456",
        isStaff: false,
      });

      // Exact location must NOT be exposed
      expect(detail.exactLocation).toBeUndefined();
      expect(detail.ownerId).toBeUndefined();

      // Only public snapped coordinates are provided
      expect(detail.publicLocation).toBeDefined();
      expect(detail.publicLocation.latitude).toBe(13.7392);
      expect(detail.publicLocation.longitude).toBe(100.5621);
      expect(detail.publicLocation.isGeneralized).toBe(true);
    });
  });
});
