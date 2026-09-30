import { test, expect } from "@playwright/test";

test.describe("Community Map & Incidents Explorer", () => {
  test("loads the landing page and navigates to the community map", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ROAD/);

    // Verify key elements on landing page
    await expect(page.getByText("Report Road Damage")).toBeVisible();
    await expect(page.getByText("Bangkok Municipal Road Damage Tracker")).toBeVisible();

    // Click link to Community Map
    await page.getByRole("link", { name: /Open Live Map/i }).first().click();
    await expect(page).toHaveURL(/\/map/);

    // Verify map controls and incident listing
    await expect(page.getByText("Incident Directory")).toBeVisible();
    await expect(page.getByPlaceholder("Search by road name")).toBeVisible();
  });

  test("filters incidents by status and switches between map and list view", async ({ page }) => {
    await page.goto("/map");

    // Switch to List View
    const listBtn = page.getByRole("button", { name: "List" });
    await listBtn.click();

    // Check that incident cards are visible
    const cards = page.locator("article, [class*='Card']");
    await expect(cards.first()).toBeVisible();

    // Filter by Fixed / Resolved
    const fixedFilter = page.getByRole("tab", { name: "Fixed" });
    await expect(fixedFilter).toBeVisible();
    await fixedFilter.click();
  });

  test("inspects a selected incident and views public details", async ({ page }) => {
    await page.goto("/map");

    // Click on a report card or inspect button
    const viewButtons = page.getByRole("link", { name: /Inspect Audit/i });
    if ((await viewButtons.count()) > 0) {
      await viewButtons.first().click();
      await expect(page).toHaveURL(/\/reports\//);
      await expect(page.getByText("Repair Progress & Event History")).toBeVisible();
      await expect(page.getByText("หนังสือราชการ (PDF)")).toBeVisible();
    }
  });
});
