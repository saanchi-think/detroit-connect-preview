import { expect, test } from "@playwright/test";

const NIA_ID = "friend:local-friend-nia";
const MESSAGE_TEXT = "I have two housing connectors you may want to meet.";

test("a member can like, change, and remove a direct-message reaction", async ({ page }) => {
  await page.goto(`/messages/${encodeURIComponent(NIA_ID)}`);

  const message = page.getByText(MESSAGE_TEXT, { exact: true }).locator("..");
  await message.getByRole("button", { name: "Like message" }).click();
  await expect(message.getByRole("button", { name: "Remove 👍 reaction" })).toBeVisible();

  await message.locator('summary[aria-label="Add reaction"]').click();
  await message.getByRole("button", { name: "React with ❤️" }).click();
  await expect(message.getByRole("button", { name: "Remove ❤️ reaction" })).toBeVisible();
  await expect(message.getByRole("button", { name: "Remove 👍 reaction" })).toHaveCount(0);

  await message.getByRole("button", { name: "Remove ❤️ reaction" }).click();
  await expect(message.getByRole("button", { name: "Like message" })).toBeVisible();
});
