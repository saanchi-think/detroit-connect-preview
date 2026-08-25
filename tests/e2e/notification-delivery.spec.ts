import { expect, test } from "@playwright/test";

test("notifications can be grouped, marked read, and configured for email digests", async ({
  page,
  request,
}) => {
  await page.goto("/notifications");

  await expect(page.getByRole("heading", { name: "New", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark all as read" })).toBeVisible();

  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page).toHaveURL(/\/notifications\?read=all/);
  await expect(page.getByRole("status")).toHaveText("All notifications marked as read.");
  await expect(page.getByRole("heading", { name: "Earlier", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);

  const unreadResponse = await request.get("/api/notifications/unread-count");
  expect(unreadResponse.ok()).toBeTruthy();
  const unreadPayload = await unreadResponse.json() as { count: number };
  expect(unreadPayload.count).toBe(0);

  await page.goto("/settings#notification-delivery");
  const emailNotifications = page.getByRole("checkbox", { name: "Email notifications" });
  await emailNotifications.check();
  await page.getByRole("combobox", { name: "Digest frequency" }).selectOption("weekly");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/settings\?saved=1/);
  await expect(page.getByRole("status")).toHaveText("Settings saved.");
  await expect(page.getByRole("checkbox", { name: "Email notifications" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Digest frequency" })).toHaveValue("weekly");

  const digestResponse = await request.get("/api/notifications/digest");
  expect(digestResponse.status()).toBe(401);
});
