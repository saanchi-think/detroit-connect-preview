import { expect, test } from "@playwright/test";

test("conversations can be archived, restored, and returned by a new message", async ({ page }) => {
  await page.goto("/messages?filter=archived");

  const existingRestore = page.getByRole("button", {
    name: "Unarchive conversation with Darnell Williams",
    exact: true,
  });
  if (await existingRestore.count()) {
    await existingRestore.click();
  }

  await page.goto("/messages");
  const inbox = page.getByLabel("All conversations");
  await expect(
    inbox.getByRole("link", { name: /Open conversation with Darnell Williams/ }),
  ).toBeVisible();

  await page.getByRole("button", {
    name: "Archive conversation with Darnell Williams",
    exact: true,
  }).click();
  await expect(
    page.getByLabel("All conversations").getByRole("link", {
      name: /Open conversation with Darnell Williams/,
    }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: /Archived 1/ }).click();
  const archived = page.getByLabel("Archived conversations");
  await expect(
    archived.getByRole("link", { name: /Open conversation with Darnell Williams/ }),
  ).toBeVisible();

  await archived.getByRole("button", {
    name: "Unarchive conversation with Darnell Williams",
    exact: true,
  }).click();
  await expect(
    page.getByLabel("Archived conversations").getByRole("link", {
      name: /Open conversation with Darnell Williams/,
    }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: /All 3/ }).click();
  await page.getByRole("button", {
    name: "Archive conversation with Darnell Williams",
    exact: true,
  }).click();
  await page.getByRole("link", { name: /Archived 1/ }).click();
  await page.getByRole("link", {
    name: /Open conversation with Darnell Williams/,
  }).click();

  await expect(page.getByRole("button", {
    name: "Unarchive conversation with Darnell Williams",
    exact: true,
  })).toBeVisible();
  await page.getByRole("textbox", { name: "Message" }).fill(
    "This new message should return the chat to my inbox.",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("link", { name: "All messages", exact: true }).click();

  await expect(
    page.getByLabel("All conversations").getByRole("link", {
      name: /Open conversation with Darnell Williams/,
    }),
  ).toContainText("This new message should return the chat to my inbox.");
  await page.getByRole("link", { name: /Archived 0/ }).click();
  await expect(page.getByText("No archived chats", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/messages");
  await expect(page.getByRole("button", {
    name: "Archive conversation with Darnell Williams",
    exact: true,
  })).toBeVisible();
  const viewport = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(viewport.scroll - viewport.client).toBeLessThanOrEqual(1);
});
