import { expect, test } from "@playwright/test";
import { sanitizeSearchQueryForAnalytics } from "../../src/lib/ai-search/analytics-privacy";

test("search analytics masks contact information before storage", () => {
  expect(
    sanitizeSearchQueryForAnalytics(
      "Email maria@example.com or call (313) 555-0199 about housing",
    ),
  ).toBe("Email [email] or call [phone] about housing");
});

test("search answers collect feedback and connector clicks without showing sources", async ({ page }) => {
  const events: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (!request.url().endsWith("/api/search/events") || request.method() !== "POST") return;
    const payload = request.postDataJSON() as Record<string, unknown> | null;
    if (payload) events.push(payload);
  });

  const query = "Who can help me with housing in Southwest Detroit?";
  await page.goto(`/search?q=${encodeURIComponent(query)}`);
  await expect(page.locator(".ai-answer-panel")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Sources" })).toHaveCount(0);

  await page.getByRole("button", { name: "This answer was helpful" }).click();
  await expect.poll(() => events.some((event) => event.eventType === "feedback")).toBe(true);
  await expect(page.getByText("Thanks for the feedback")).toBeVisible();

  const firstProfileLink = page.locator(".ai-connector-list .profile-snapshot h3 a").first();
  await firstProfileLink.click();
  await expect(page).toHaveURL(/\/connectors\//);
  await expect.poll(() => events.some((event) => event.eventType === "result_click")).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/search?q=${encodeURIComponent(query)}`);
  await expect(page.getByRole("button", { name: "This answer was helpful" })).toBeVisible();
  const mobileViewport = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(mobileViewport.scroll - mobileViewport.client).toBeLessThanOrEqual(1);
});

test("the automatic indexing endpoint rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/search/index");
  expect(response.status()).toBe(401);
});
