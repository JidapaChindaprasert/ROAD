import { test, expect } from "@playwright/test";

test.describe("Citizen Damage Report Submission Flow", () => {
  test("completes step-by-step reporting with sample evidence photo and location", async ({ page }) => {
    await page.goto("/report/new");

    // Verify Wizard Step 1: Evidence Photo
    await expect(page.getByText("Step 1 of 2").first()).toBeVisible();
    await expect(page.getByText("Drop a photo. We’ll help identify the damage.").first()).toBeVisible();

    // Click 'Use Demo Photo' button
    const demoPhotoBtn = page.getByRole("button", { name: /(ใช้รูปตัวอย่าง|Demo Photo)/i });
    await expect(demoPhotoBtn).toBeVisible();
    await demoPhotoBtn.click();

    // Verify attached evidence and AI analysis preview
    await expect(page.getByText(/Attached Evidence \(1\/[15]\)/i)).toBeVisible();
    await expect(page.getByText(/(Damage Classification|AI Classification)/i)).toBeVisible({ timeout: 10000 });

    // Proceed to Step 2: Location
    const nextBtn = page.getByRole("button", { name: /Next: Confirm Location/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Verify Step 2: Location & AI Review
    await expect(page.getByText("Step 2 of 2").first()).toBeVisible();
    await expect(page.getByText("Confirm Incident Location")).toBeVisible();

    // Verify mini-map search bar is available
    await expect(page.getByPlaceholder(/ค้นหาชื่อถนน, ซอย, สถานที่ หรือพิกัด/i)).toBeVisible();

    // Fill optional landmark and description
    await page.getByPlaceholder("e.g. In front of BTS station exit 2").fill("Near Siam Paragon North Entrance");
    await page.getByPlaceholder("Briefly describe if traffic is blocked").fill("Deep pothole causing motorbikes to swerve into the right lane.");

    // Submit report
    const submitBtn = page.getByRole("button", { name: /Submit Road Report/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify Success Screen
    await expect(page.getByText("Incident Reported Successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/(RD-2026-|ROAD-BKK-|REP-)/i)).toBeVisible();

    // Navigate to public tracking page
    const trackBtn = page.getByRole("link", { name: /View Public Audit & Tracking/i });
    await expect(trackBtn).toBeVisible();
    await trackBtn.click();

    // Verify detail page has loaded
    await expect(page.getByText("Repair Progress & Event History")).toBeVisible({ timeout: 10000 });
  });
});
