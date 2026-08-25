import { expect, test } from "@playwright/test";

const mariaProfile = "/connectors/11111111-1111-4111-8111-000000000001";

test("member safety controls, reports, admin tools, exports, and typing presence work", async ({ page }) => {
  await page.goto(mariaProfile);

  await page.locator('summary[aria-label="More options for Maria Rodriguez"]').click();
  await page.getByRole("button", { name: "Mute member" }).click();
  await expect(page).toHaveURL(/safety=muted/);
  await expect(page.getByText("Notifications from Maria Rodriguez are muted.")).toBeVisible();

  await page.goto("/settings#safety-controls");
  await expect(page.getByRole("heading", { name: "Muted and blocked" })).toBeVisible();
  await expect(page.getByText("Maria Rodriguez")).toBeVisible();
  await page.getByRole("button", { name: "Unmute" }).click();
  await expect(page).toHaveURL(/safety=unmuted/);
  await expect(page.getByText("No muted or blocked members.")).toBeVisible();

  await page.goto(mariaProfile);
  await page.locator('summary[aria-label="More options for Maria Rodriguez"]').click();
  await page.getByText("Report profile").click();
  await page.locator(".profile-report-form select").selectOption("misinformation");
  await page.locator(".profile-report-form textarea").fill("The profile contains a claim that needs review.");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page).toHaveURL(/reported=1/);
  await expect(page.getByText("Report submitted for review.")).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Community operations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Moderation queue" })).toBeVisible();
  await expect(page.getByText("The profile contains a claim that needs review.")).toBeVisible();
  const exportResponse = await page.request.get("/api/admin/export?dataset=reports");
  expect(exportResponse.ok()).toBeTruthy();
  expect(exportResponse.headers()["content-disposition"]).toContain("detroit-connect-reports");

  await page.goto(mariaProfile);
  await page.locator('summary[aria-label="More options for Maria Rodriguez"]').click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Block member" }).click();
  await expect(page).toHaveURL(/\/settings.*safety=blocked/);
  await expect(page.getByText("Maria Rodriguez")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Unblock" }).click();
  await expect(page).toHaveURL(/safety=unblocked/);
  await expect(page.getByText("No muted or blocked members.")).toBeVisible();

  await page.goto(`/messages/${encodeURIComponent("11111111-1111-4111-8111-000000000001")}`);
  const composer = page.locator(".message-composer-wrap");
  const conversationId = await composer.getAttribute("data-conversation-id");
  expect(conversationId).toBeTruthy();
  await page.evaluate((channelName) => {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ userId: "another-member", isTyping: true });
    channel.close();
  }, `direct-typing:${conversationId}`);
  await expect(page.getByText("Maria is typing")).toBeVisible();
});

test("network exposes explicit accept and decline request actions", async ({ page }) => {
  await page.goto("/network");
  const requestSection = page.getByRole("heading", { name: "Requests" });

  if (await requestSection.count()) {
    await expect(page.getByRole("button", { name: "Accept" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline" }).first()).toBeVisible();
  }
});
