import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Audits (Axe-Core)", () => {
  test("landing page should have no automatically detectable WCAG A/AA violations", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      // Exclude third-party map tile layers if any
      .disableRules(["color-contrast"]) // evaluate contrast in dedicated visual inspection
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("community map page is navigable and accessible", async ({ page }) => {
    await page.goto("/map");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("report wizard step 1 has proper aria landmarks and form labels", async ({ page }) => {
    await page.goto("/report/new");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
