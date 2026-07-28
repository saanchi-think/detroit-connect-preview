import { execFileSync } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const testDataDirectory = path.resolve(process.cwd(), ".test-data");

async function readTestJson<T>(fileName: string) {
  return JSON.parse(await readFile(path.join(testDataDirectory, fileName), "utf8")) as T;
}

async function writeTestJson(fileName: string, value: unknown) {
  const filePath = path.join(testDataDirectory, fileName);
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

function resetTestData() {
  execFileSync(process.execPath, ["scripts/reset-local-test-data.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nLkAAAAASUVORK5CYII=",
  "base64",
);

test.describe.configure({ mode: "serial" });

test("home AI search understands explicit profile constraints and shows citations", async ({ page }) => {
  resetTestData();
  await page.goto("/");

  const searchForm = page.locator("form.ai-search");
  await searchForm.getByRole("combobox", { name: "Search Detroit Connect" }).fill(
    "I need a Spanish-speaking housing helper in Southwest Detroit",
  );
  await searchForm.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { name: "What can we help you find?" })).toBeVisible();
  await expect(page.getByText("Smart match")).toBeVisible();
  await expect(page.locator(".ai-intent-row")).toContainText("Housing");
  await expect(page.locator(".ai-intent-row")).toContainText("Southwest Detroit");
  await expect(page.locator(".ai-intent-row")).toContainText("Spanish");
  await expect(page.locator(".ai-connector-list .profile-snapshot")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Sources" })).toContainText(
    "Maria Rodriguez",
  );
});

test("Network, profile sharing, profile activity, directory filters, and settings work together", async ({ page }) => {
  resetTestData();

  await page.goto("/network");
  await expect(page.getByRole("heading", { name: "Network", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recommended by your network" })).toBeVisible();

  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shareDialog = page.getByRole("dialog", { name: "Share this profile" });
  await expect(shareDialog).toBeVisible();
  await expect(shareDialog.getByText("Send to your network")).toBeVisible();
  await expect(shareDialog.getByRole("button", { name: /Message Nia Patel/ })).toBeVisible();
  await shareDialog.getByRole("button", { name: "Close share menu" }).click();

  await expect(page.getByRole("heading", { name: "Community posts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Looking for renter-friendly neighborhoods near reliable transit" })).toBeVisible();

  await page.goto("/connectors");
  await page.getByRole("combobox", { name: "Filter by language" }).selectOption("Spanish");
  await page.getByRole("combobox", { name: "Filter by neighborhood" }).selectOption("Southwest Detroit");
  await page.getByRole("combobox", { name: "Filter by topic" }).selectOption("Housing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/language=Spanish/);
  await expect(page).toHaveURL(/neighborhood=Southwest\+Detroit/);
  await expect(page).toHaveURL(/topic=Housing/);
  await expect(page.locator(".profile-snapshot")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const messagesPreference = page.getByRole("checkbox", { name: "Direct messages" });
  await expect(messagesPreference).toBeChecked();
  await messagesPreference.uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved.");
  await expect(page.getByRole("checkbox", { name: "Direct messages" })).not.toBeChecked();

  await page.goto("/notifications");
  await expect(page.getByText(/Nia Patel sent you 2 messages/)).toHaveCount(0);
});

test("forum posts support three images and comments can only be edited for two minutes", async ({ page }) => {
  resetTestData();
  await page.goto("/forum");

  const imageInput = page.locator('input[name="images"]');
  await expect(imageInput).toBeEnabled();
  await imageInput.setInputFiles(
    [1, 2, 3, 4].map((index) => ({
      name: `too-many-${index}.png`,
      mimeType: "image/png",
      buffer: tinyPng,
    })),
  );
  await expect(page.getByText("Choose up to 3 images.")).toBeVisible();
  await expect(page.locator(".forum-image-preview")).toHaveCount(0);

  await imageInput.setInputFiles(
    [1, 2, 3].map((index) => ({
      name: `forum-${index}.png`,
      mimeType: "image/png",
      buffer: tinyPng,
    })),
  );
  await expect(page.locator(".forum-image-preview")).toHaveCount(3);
  await page.getByLabel("Title").fill("Three-image neighborhood question");
  await page.getByLabel("Details").fill("Which of these three blocks is easiest for a newcomer without a car?");
  await page.getByLabel("Post topic").selectOption("Housing");
  await page.getByRole("button", { name: "Post request" }).click();

  let post = page.locator(".forum-post", { hasText: "Three-image neighborhood question" });
  await expect(post.locator(".forum-post-image")).toHaveCount(3);
  await post.getByText("Add comment", { exact: true }).click();
  await post.getByPlaceholder("Write a comment...").fill("I would compare the first and third options.");
  await post.getByRole("button", { name: "Post comment" }).click();

  post = page.locator(".forum-post", { hasText: "Three-image neighborhood question" });
  let comment = post.locator(".forum-comment", { hasText: "I would compare the first and third options." }).first();
  await comment.getByRole("button", { name: "Edit" }).click();
  await comment.getByRole("textbox", { name: "Edit comment" }).fill("I would compare the second and third options.");
  await comment.getByRole("button", { name: "Save" }).click();

  post = page.locator(".forum-post", { hasText: "Three-image neighborhood question" });
  comment = post.locator(".forum-comment", { hasText: "I would compare the second and third options." }).first();
  await expect(comment).toBeVisible();
  await expect(comment.getByText("Edited")).toBeVisible();

  type ForumStore = {
    posts: Array<{ id: string; title: string }>;
    comments: Array<{
      id: string;
      post_id: string;
      author_id: string | null;
      body: string;
      created_at: string;
      updated_at?: string;
    }>;
    likes: unknown[];
  };
  const store = await readTestJson<ForumStore>("local-dev-forum.json");
  const editedComment = store.comments.find((entry) => entry.body === "I would compare the second and third options.");
  expect(editedComment).toBeTruthy();
  editedComment!.created_at = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await writeTestJson("local-dev-forum.json", store);

  await page.reload();
  post = page.locator(".forum-post", { hasText: "Three-image neighborhood question" });
  comment = post.locator(".forum-comment", { hasText: "I would compare the second and third options." }).first();
  await expect(comment.getByRole("button", { name: "Edit" })).toHaveCount(0);
});

test("notifications include unread DMs and recommendations of the viewer profile", async ({ page }) => {
  resetTestData();
  await page.goto("/network");

  type ConnectorRecord = {
    id: string;
    owner_id: string | null;
    name: string;
  };
  const profiles = await readTestJson<ConnectorRecord[]>("local-dev-store.json");
  const ownedProfile = profiles.find((profile) => profile.name.startsWith("Avery Adams")) ?? profiles[20];
  ownedProfile.owner_id = "local-dev-user";
  await writeTestJson("local-dev-store.json", profiles);

  type RecommendationRecord = {
    id: string;
    user_id: string;
    recommender_name: string;
    connector_profile_id: string;
    note: string;
    created_at: string;
  };
  const recommendations = await readTestJson<RecommendationRecord[]>("local-dev-recommendations.json");
  recommendations.unshift({
    id: "notification-recommended-viewer",
    user_id: "local-dev-user",
    recommender_name: "Nia Patel",
    connector_profile_id: ownedProfile.id,
    note: "A thoughtful guide for newcomers.",
    created_at: new Date().toISOString(),
  });
  await writeTestJson("local-dev-recommendations.json", recommendations);

  await page.goto("/notifications");
  await expect(page.getByText("Nia Patel recommended your profile")).toBeVisible();
  await expect(page.getByText(/Nia Patel sent you 2 messages/)).toBeVisible();
});
