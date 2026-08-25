import { expect, test } from "@playwright/test";

test("account recovery and privacy controls work in the local preview", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByLabel("Email").fill("member@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();

  await page.goto("/settings#privacy-controls");
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await page.getByLabel(/Profile visibility/).selectOption("members");
  await page.getByLabel(/Contact details/).selectOption("private");
  await page.getByLabel(/New messages/).selectOption("none");
  await page.getByRole("button", { name: "Save privacy" }).click();
  await expect(page).toHaveURL(/privacy=saved/);
  await expect(page.getByRole("combobox", { name: /Profile visibility/ })).toHaveValue("members");
  await expect(page.getByRole("combobox", { name: /Contact details/ })).toHaveValue("private");
  await expect(page.getByRole("combobox", { name: /New messages/ })).toHaveValue("none");

  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Message", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Contact", exact: true })).toHaveCount(0);

  const exportResponse = await page.request.get("/api/account/export");
  expect(exportResponse.ok()).toBeTruthy();
  expect(exportResponse.headers()["content-disposition"]).toContain("detroit-connect-my-data");

  await page.goto("/settings#account-lifecycle");
  await expect(page.getByRole("heading", { name: "Account security" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download my data" })).toBeVisible();
  await page.getByText("Deactivate account", { exact: true }).first().click();
  await expect(page.getByLabel("Type DEACTIVATE")).toBeVisible();
  await page.getByText("Delete account", { exact: true }).first().click();
  await expect(page.getByLabel("Account email")).toBeVisible();
  await expect(page.getByLabel("Type DELETE")).toBeVisible();

  await page.getByRole("combobox", { name: /Profile visibility/ }).selectOption("public");
  await page.getByRole("combobox", { name: /Contact details/ }).selectOption("network");
  await page.getByRole("combobox", { name: /New messages/ }).selectOption("members");
  await page.getByRole("button", { name: "Save privacy" }).click();
});

test("settings and recovery screens fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/settings", "/forgot-password", "/account/reset-password"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} should not scroll horizontally`).toBeLessThanOrEqual(1);
  }
});
