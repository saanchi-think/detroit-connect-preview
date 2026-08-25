import { expect, test } from "@playwright/test";
import benchmark from "../fixtures/ai-search-benchmark.json";
import { inferSearchIntent } from "../../src/lib/ai-search/intent";

const filterOptions = {
  topics: [
    "Housing",
    "Schools",
    "Business",
    "Permits",
    "Finances",
    "Medical",
    "Legal",
    "Moving",
    "Transportation",
    "City Services",
    "Utilities",
    "Neighborhoods",
    "Jobs",
    "Community",
  ],
  languages: ["English", "Spanish", "Arabic"],
  neighborhoods: ["Bagley", "Corktown", "Midtown", "New Center", "Southwest Detroit"],
};

test("40-question AI search benchmark resolves constraints and common typos", async () => {
  expect(benchmark).toHaveLength(40);

  for (const scenario of benchmark) {
    const intent = inferSearchIntent(scenario.query, filterOptions);
    expect(intent.topics, `${scenario.id}: topics`).toEqual(
      expect.arrayContaining(scenario.topics),
    );
    expect(intent.languages, `${scenario.id}: languages`).toEqual(
      expect.arrayContaining(scenario.languages),
    );
    expect(intent.neighborhoods, `${scenario.id}: neighborhoods`).toEqual(
      expect.arrayContaining(scenario.neighborhoods),
    );
    if (scenario.profileType) {
      expect(intent.profileType, `${scenario.id}: profile type`).toBe(scenario.profileType);
    }
  }
});

test("representative benchmark questions render the expected connectors", async ({ page }) => {
  const representativeScenarios = benchmark.filter((scenario) => scenario.connector).slice(0, 6);

  for (const scenario of representativeScenarios) {
    await page.goto(`/search?q=${encodeURIComponent(scenario.query)}`);
    await expect(page.locator(".ai-answer-panel"), scenario.id).toBeVisible();
    await expect(
      page.getByRole("heading", { name: scenario.connector! }),
      scenario.id,
    ).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Sources" })).toHaveCount(0);
  }
});
