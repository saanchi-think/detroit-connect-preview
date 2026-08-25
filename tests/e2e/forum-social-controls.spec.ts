import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("forum posts support mentions, saving, following, muting, editing, and deletion", async ({ page }) => {
  test.setTimeout(60_000);
  const postTitle = `Forum social controls audit ${Date.now()}`;
  const updatedTitle = `Updated ${postTitle}`;
  await page.goto("/forum");

  await page.getByLabel("Title").fill(postTitle);
  const details = page.getByRole("textbox", { name: "Post details" });
  await details.fill("Could @Maria");
  const mentionList = page.getByRole("listbox", { name: "Mention someone" });
  await expect(mentionList.getByRole("option", { name: /Maria Rodriguez/ })).toBeVisible();
  await mentionList.getByRole("option", { name: /Maria Rodriguez/ }).click();
  await details.press("End");
  await details.type(" share a housing contact for this test?");
  await page.getByRole("combobox", { name: "Post topic" }).selectOption("Housing");
  await page.getByRole("button", { name: "Preview post" }).click();
  await page
    .getByRole("dialog", { name: "Preview your post" })
    .getByRole("button", { name: "Publish post" })
    .click();

  const post = page.locator(".forum-post", { hasText: postTitle });
  await expect(post).toBeVisible();
  await expect(post.getByRole("link", { name: "@Maria Rodriguez" })).toHaveAttribute(
    "href",
    /\/connectors\//,
  );
  await expect(post.getByRole("button", { name: "Unfollow conversation" })).toBeVisible();

  await post.getByRole("button", { name: "Bookmark discussion" }).click();
  await expect(post.getByRole("button", { name: "Remove discussion bookmark" })).toBeVisible();
  await post.getByRole("button", { name: "Mute conversation" }).click();
  await expect(post.getByRole("button", { name: "Resume conversation notifications" })).toBeVisible();
  await post.getByRole("button", { name: "Resume conversation notifications" }).click();
  await expect(post.getByRole("button", { name: "Mute conversation" })).toBeVisible();

  await page.goto("/favorites?view=posts");
  const savedCommunityPosts = page.getByRole("heading", { name: "Saved community posts" });
  await expect(savedCommunityPosts).toBeVisible();
  await expect(page.getByRole("link", { name: postTitle })).toBeVisible();

  await page.goto("/forum");
  const editablePost = page.locator(".forum-post", { hasText: postTitle });
  await editablePost.locator("summary[aria-label='Post options']").click();
  await editablePost.getByRole("link", { name: "Edit post" }).click();
  const editor = page.getByRole("form", { name: `Edit ${postTitle}` });
  await editor.getByLabel("Title").fill(updatedTitle);
  await editor.getByRole("button", { name: "Save changes" }).click();
  const updatedPost = page.locator(".forum-post", { hasText: updatedTitle });
  await expect(updatedPost).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await updatedPost.locator(".forum-post-owner-menu").evaluate((menu) => {
    (menu as HTMLDetailsElement).open = true;
  });
  await updatedPost.getByRole("button", { name: "Delete post" }).click();
  await expect(page.locator(".forum-post", { hasText: updatedTitle })).toHaveCount(0);
});
