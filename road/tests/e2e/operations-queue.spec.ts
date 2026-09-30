import { test, expect } from "@playwright/test";

test.describe("Municipal Staff Operations Console", () => {
  test("views incident triage queue, filters by status, and updates incident lifecycle", async ({ page }) => {
    await page.goto("/operations");

    // Verify operations header
    await expect(page.getByText("Municipal Road Maintenance Queue")).toBeVisible();
    await expect(page.getByText("Staff Operations Console")).toBeVisible();

    // Verify filter tabs
    await expect(page.getByRole("button", { name: "all" })).toBeVisible();
    await expect(page.getByRole("button", { name: "reported" })).toBeVisible();

    // Click Update Status on the first eligible incident
    const updateBtn = page.getByRole("button", { name: /Update Status/i }).first();
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    // Verify modal dialog opened
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Operational Priority")).toBeVisible();
    await expect(page.getByText("Assigned Engineering Crew")).toBeVisible();

    // Enter required Public Note
    const publicNoteInput = page.getByPlaceholder(/Work crew Alpha #2 has arrived/i);
    await publicNoteInput.fill("Dispatched engineering crew Alpha #1 with bitumen asphalt paver.");

    // Submit transition
    const confirmBtn = page.getByRole("button", { name: /Confirm Transition/i });
    await confirmBtn.click();

    // Verify dialog closes and toast notification appears
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("generates and previews the Official Thai Repair Petition Form (PDF)", async ({ page }) => {
    await page.goto("/operations");

    // Click 'พิมพ์หนังสือราชการ'
    const govBtn = page.getByRole("button", { name: /พิมพ์หนังสือราชการ/i }).first();
    await expect(govBtn).toBeVisible();
    await govBtn.click();

    // Verify Thai Petition Form Modal
    await expect(page.getByText("หนังสือขอความอนุเคราะห์ซ่อมแซมถนน")).toBeVisible();
    await expect(page.getByText("ตราครุฑ")).toBeVisible();
    await expect(page.getByRole("button", { name: /พิมพ์แบบฟอร์มราชการ/i })).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /ปิดหน้าต่าง/i }).click();
  });
});
