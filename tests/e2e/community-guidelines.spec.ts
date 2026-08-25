import { expect, test } from "@playwright/test";

test("community guidelines are visible from posting and reporting surfaces", async ({ page }) => {
  await page.goto("/forum");

  const composerLink = page.getByRole("link", { name: "Community guidelines" });
  await expect(composerLink).toBeVisible();
  await composerLink.click();

  await expect(page).toHaveURL("/community-guidelines");
  await expect(page.getByRole("heading", { name: "Community Guidelines", exact: true })).toBeVisible();
  await expect(page.locator(".guidelines-grid > section")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Reporting and enforcement" })).toBeVisible();

  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await page.locator('summary[aria-label="More options for Maria Rodriguez"]').click();
  await page.getByText("Report profile").click();
  await expect(page.getByRole("link", { name: "Review community guidelines" })).toBeVisible();
});
