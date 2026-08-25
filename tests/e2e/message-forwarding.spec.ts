import { expect, test } from "@playwright/test";

const MARIA_ID = "11111111-1111-4111-8111-000000000001";
const DARNELL_ID = "11111111-1111-4111-8111-000000000002";
const NIA_ID = "friend:local-friend-nia";
const FORWARDED_MESSAGE = "Absolutely. I can send a short list this afternoon.";

test("a direct message can be forwarded to multiple profiles", async ({ page }) => {
  await page.goto(`/messages/${MARIA_ID}`);

  const sourceMessage = page
    .getByText(FORWARDED_MESSAGE, { exact: true })
    .locator("..");
  await sourceMessage.getByRole("button", { name: "Forward message" }).click();

  const dialog = page.getByRole("dialog", { name: "Send message to" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Forwarded message").locator("..")).toContainText(
    FORWARDED_MESSAGE,
  );

  await dialog.getByRole("button", { name: /Darnell Williams/ }).click();
  await dialog.getByRole("button", { name: /Nia Patel/ }).click();
  await dialog.getByRole("button", { name: "Send to 2", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("Message shared with 2 profiles.");

  await page.goto(`/messages/${DARNELL_ID}`);
  const darnellMessage = page
    .getByText(FORWARDED_MESSAGE, { exact: true })
    .last()
    .locator("..");
  await expect(darnellMessage.getByText("Forwarded", { exact: true })).toBeVisible();

  await page.goto(`/messages/${encodeURIComponent(NIA_ID)}`);
  const niaMessage = page
    .getByText(FORWARDED_MESSAGE, { exact: true })
    .last()
    .locator("..");
  await expect(niaMessage.getByText("Forwarded", { exact: true })).toBeVisible();
});
