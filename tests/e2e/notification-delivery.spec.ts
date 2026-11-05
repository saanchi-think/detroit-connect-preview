import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("notifications can be grouped, marked read, and configured for email digests", async ({
  page,
  request,
}) => {
  execFileSync(process.execPath, ["scripts/reset-local-test-data.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
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
  await page.getByRole("combobox", { name: "Email schedule" }).selectOption("weekly");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/settings\?saved=1/);
  await expect(page.getByRole("status")).toHaveText("Settings saved.");
  await expect(page.getByRole("combobox", { name: "Email schedule" })).toHaveValue("weekly");

  const digestResponse = await request.get("/api/notifications/digest");
  expect(digestResponse.status()).toBe(401);
});

test("an individual notification can be marked read and unread", async ({ page }) => {
  execFileSync(process.execPath, ["scripts/reset-local-test-data.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  await page.goto("/notifications");

  const row = page.locator(".notification-row.is-unread").first();
  const title = await row.locator(".notification-copy strong").innerText();
  await row.locator("summary").click();
  await row.getByRole("button", { name: "Mark as read" }).click();

  const readRow = page.locator(".notification-row", { hasText: title });
  await expect(readRow).not.toHaveClass(/is-unread/);
  await readRow.locator("summary").click();
  await readRow.getByRole("button", { name: "Mark as unread" }).click();
  await expect(page.locator(".notification-row.is-unread", { hasText: title })).toBeVisible();
});

test("the production notification stream is publication-backed, recipient-filtered, and suppression-aware", async () => {
  const root = process.cwd();
  const [deliveryMigration, realtimeMigration, header, emailDelivery] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/0016_notification_delivery.sql"), "utf8"),
    readFile(
      path.join(root, "supabase/migrations/20260827143511_realtime_notification_controls.sql"),
      "utf8",
    ),
    readFile(path.join(root, "src/components/app-header.tsx"), "utf8"),
    readFile(path.join(root, "src/lib/notifications/email-delivery.ts"), "utf8"),
  ]);

  expect(deliveryMigration).toContain("record_friendship_notification");
  expect(deliveryMigration).toContain("record_recommendation_notification");
  expect(deliveryMigration).toContain("record_direct_message_notification");
  expect(deliveryMigration).toContain("record_forum_comment_notifications");
  expect(deliveryMigration).toContain("record_forum_mention_notification");
  expect(realtimeMigration).toContain("alter publication supabase_realtime add table public.notification_events");
  expect(realtimeMigration).toContain("set_notification_read");
  expect(header).toContain("table: \"notification_events\"");
  expect(header).toContain("filter: `recipient_id=eq.${userId}`");
  expect(emailDelivery).toContain('.from("user_safety_controls")');
  expect(emailDelivery).toContain('.from("forum_post_subscriptions")');
});
