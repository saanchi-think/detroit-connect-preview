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
  await writeFile(
    temporaryPath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryPath, filePath);
}

test("complete social, profile, forum, messaging, search, sorting, notification, and map workflow", async ({
  page,
}) => {
  test.setTimeout(180_000);
  execFileSync(process.execPath, ["scripts/reset-local-test-data.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  await page.goto("/connectors?sort=name");
  await expect(page.getByRole("combobox", { name: "Sort profiles" })).toHaveValue("name");
  const alphabeticalNames = await page.locator(".profile-snapshot h3").evaluateAll((headings) =>
    headings.slice(0, 4).map((heading) => heading.textContent?.trim() ?? ""),
  );
  expect([...alphabeticalNames].sort((left, right) => left.localeCompare(right))).toEqual(alphabeticalNames);

  await page.getByRole("combobox", { name: "Search connectors" }).fill("Housing");
  await page.getByRole("combobox", { name: "Sort profiles" }).selectOption("relevance");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Housing/);
  await expect(page).toHaveURL(/sort=relevance/);
  await expect(page.locator(".profile-snapshot").first()).toContainText(/Housing/i);

  await page.goto("/notifications");
  await expect(page.getByText("Andre Brooks sent you a connection request")).toBeVisible();
  await expect(page.getByText(/recommended Maria Rodriguez/)).toBeVisible();

  await page.goto("/network");
  await page.getByRole("button", { name: "Accept" }).click();
  const andreFriend = page.locator(".friend-card", { hasText: "Andre Brooks" });
  await expect(andreFriend.getByRole("link", { name: "Message Andre Brooks" })).toBeVisible();

  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await page.getByText("Recommend", { exact: true }).click();
  await page.getByLabel("Recommendation note").fill("Excellent housing and neighborhood guidance.");
  await page.getByRole("button", { name: "Recommend to network" }).click();
  await expect(page.getByRole("status")).toHaveText("Recommendation shared with your network.");

  await page.goto("/connectors/11111111-1111-4111-8111-000000000002");
  await page.getByText("Recommend", { exact: true }).click();
  await page.getByLabel("Recommendation note").fill("Clear answers about utilities and city services.");
  await page.getByRole("button", { name: "Recommend to network" }).click();
  await expect(page.getByRole("status")).toHaveText("Recommendation shared with your network.");

  await page.goto("/favorites");
  const recommendationsSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Recommended by you" }),
  });
  await expect(recommendationsSection.locator(".profile-snapshot")).toHaveCount(2);

  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await page.getByRole("button", { name: "Add to network" }).click();
  await expect(page.getByRole("status")).toHaveText("Connection request sent.");
  type FriendRecord = {
    id: string;
    display_name: string;
    status: string;
    direction?: string;
    updated_at: string;
  };
  const friends = await readTestJson<FriendRecord[]>("local-dev-friends.json");
  const mariaFriend = friends.find((friend) => friend.display_name === "Maria Rodriguez");
  expect(mariaFriend).toBeTruthy();
  mariaFriend!.status = "accepted";
  delete mariaFriend!.direction;
  mariaFriend!.updated_at = new Date().toISOString();
  await writeTestJson("local-dev-friends.json", friends);

  await page.goto("/notifications");
  await expect(page.getByText("Maria Rodriguez is now in your network")).toBeVisible();
  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  const profileHeader = page.locator(".social-profile-header");
  await profileHeader.getByText("Connected", { exact: true }).click();
  await profileHeader.getByRole("button", { name: "Remove connection" }).click();
  await expect(page.getByRole("status")).toHaveText("Connection removed.");
  await expect(profileHeader.getByRole("button", { name: "Add to network" })).toBeVisible();

  await profileHeader.getByRole("link", { name: "Message", exact: true }).click();
  await page.getByRole("textbox", { name: "Message" }).fill("Can you help me compare Southwest Detroit rentals?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Can you help me compare Southwest Detroit rentals?")).toBeVisible();

  type MessageStore = {
    conversations: Array<{
      id: string;
      connector_profile_id: string;
      updated_at: string;
    }>;
    messages: Array<{
      id: string;
      conversation_id: string;
      sender_id: string;
      body: string;
      created_at: string;
      delivered_at: string | null;
      read_at: string | null;
    }>;
  };
  const messageStore = await readTestJson<MessageStore>("local-dev-messages.json");
  const mariaConversation = messageStore.conversations.find(
    (conversation) =>
      conversation.connector_profile_id === "11111111-1111-4111-8111-000000000001",
  );
  expect(mariaConversation).toBeTruthy();
  const incomingMessageTime = new Date(Date.now() + 1000).toISOString();
  mariaConversation!.updated_at = incomingMessageTime;
  messageStore.messages.push({
    id: "audit-incoming-maria",
    conversation_id: mariaConversation!.id,
    sender_id: "local-connector-11111111-1111-4111-8111-000000000001",
    body: "Yes. I can send three renter-friendly options this afternoon.",
    created_at: incomingMessageTime,
    delivered_at: incomingMessageTime,
    read_at: null,
  });
  await writeTestJson("local-dev-messages.json", messageStore);

  await page.goto("/messages");
  const mariaConversationLink = page.getByRole("link", {
    name: /Open conversation with Maria Rodriguez, 1 unread/,
  });
  await expect(mariaConversationLink).toBeVisible();
  await mariaConversationLink.click();
  await expect(page.getByText("Yes. I can send three renter-friendly options this afternoon.")).toBeVisible();
  await page.getByRole("textbox", { name: "Message" }).fill("Thank you. Please send them here.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thank you. Please send them here.")).toBeVisible();
  await expect(
    page.locator(".message-bubble", { hasText: "Thank you. Please send them here." }).getByText(/Delivered/),
  ).toBeVisible();

  await page.goto("/create-profile");
  await page.getByRole("textbox", { name: "Neighborhood", exact: true }).fill("Midtown");
  await page.getByLabel("First name").fill("Audit");
  await page.getByLabel("Last name").fill("Owner");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("audit.owner@example.test");
  await page.getByRole("checkbox", { name: "Housing" }).check();
  await page.getByRole("checkbox", { name: "Messages" }).check();
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page).toHaveURL(/\/connectors\?created=/);
  const createdId = new URL(page.url()).searchParams.get("created");
  expect(createdId).toBeTruthy();
  await page.getByRole("link", { name: "Audit Owner", exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
  await expect(profileHeader.getByRole("link", { name: "Message", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Edit profile" }).click();
  await expect(page.getByRole("heading", { name: "Edit profile" })).toBeVisible();
  await page.getByLabel("Upload new profile photo").setInputFiles({
    name: "not-an-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByText("Choose a JPG, PNG, or WebP image.")).toBeVisible();
  await page.getByLabel("Upload new profile photo").setInputFiles({
    name: "updated-profile.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nLkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: "Selected profile photo preview" })).toBeVisible();
  await page.getByLabel("Name").fill("Audit Owner Updated");
  await page.getByLabel("Role or headline").fill("Neighborhood resource guide");
  await page.getByLabel("About").fill("Helping newcomers compare neighborhoods and local services.");
  await page.getByLabel("Help topics").fill("Housing, Neighborhood recommendations, Moving");
  await page.getByLabel("Skills").fill("Community organizing, Local research");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile updated.");
  await expect(page.getByRole("heading", { name: "Audit Owner Updated" })).toBeVisible();
  await expect(page.locator(".profile-portrait .connector-profile-photo")).toBeVisible();

  await page.goto("/profile");
  await expect(page).toHaveURL(new RegExp(`/connectors/${createdId}$`));
  await expect(page.getByRole("heading", { name: "Audit Owner Updated" })).toBeVisible();

  await page.goto("/forum");
  await page.getByLabel("Title").fill("Audit notification question");
  await page
    .getByRole("textbox", { name: "Post details" })
    .fill("Testing independent comments, threaded replies, likes, shares, and notifications.");
  await page.getByLabel("Post topic").selectOption("Housing");
  await page.getByRole("button", { name: "Preview post" }).click();
  await page
    .getByRole("dialog", { name: "Preview your post" })
    .getByRole("button", { name: "Publish post" })
    .click();

  let auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  await auditPost.getByText("Comment", { exact: true }).click();
  await auditPost.getByPlaceholder("Write a comment...").fill("First independent comment.");
  await auditPost.getByRole("button", { name: "Post comment" }).click();

  auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  await auditPost.getByText("Comment", { exact: true }).click();
  await auditPost.getByPlaceholder("Write a comment...").fill("Second independent comment.");
  await auditPost.getByRole("button", { name: "Post comment" }).click();

  auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  const firstComment = auditPost.locator(".forum-comment", { hasText: "First independent comment." }).first();
  const firstReplyControl = firstComment.locator(":scope > .forum-comment-copy > .forum-reply-control");
  await firstReplyControl.getByText("Reply in thread", { exact: true }).click();
  await expect(firstReplyControl).toHaveAttribute("open", "");
  await firstReplyControl.getByPlaceholder("Reply to You").fill("First threaded reply.");
  await firstReplyControl
    .getByRole("button", { name: "Post reply" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(
    page.locator(".forum-post", { hasText: "Audit notification question" }).getByText("First threaded reply."),
  ).toBeVisible();

  auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  const nestedReply = auditPost.locator(".forum-comment", { hasText: "First threaded reply." }).last();
  const nestedReplyId = await nestedReply.getAttribute("id");
  expect(nestedReplyId).toBeTruthy();
  const stableNestedReply = page.locator(`#${nestedReplyId}`);
  const nestedReplyControl = stableNestedReply.locator(
    ":scope > .forum-comment-copy > .forum-reply-control",
  );
  await nestedReplyControl.evaluate((details: HTMLDetailsElement) => {
    details.open = true;
  });
  await expect(nestedReplyControl).toHaveAttribute("open", "");
  await nestedReplyControl.getByPlaceholder("Reply to You").fill("Second-level threaded reply.");
  await nestedReplyControl
    .getByRole("button", { name: "Post reply" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(
    page.locator(".forum-post", { hasText: "Audit notification question" }).getByText("Second-level threaded reply."),
  ).toBeVisible();

  auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  await auditPost.getByRole("button", { name: "Like" }).click();
  await expect(auditPost.getByRole("button", { name: "Liked 1" })).toBeVisible();
  await auditPost.getByRole("button", { name: "Liked 1" }).click();
  await expect(auditPost.getByRole("button", { name: "Like" })).toBeVisible();

  type ForumStore = {
    posts: Array<{ id: string; title: string }>;
    comments: Array<{
      id: string;
      post_id: string;
      parent_comment_id: string | null;
      author_id: string | null;
      name: string;
      initials: string;
      avatar_class: string;
      body: string;
      created_at: string;
    }>;
    likes: unknown[];
  };
  const forumStore = await readTestJson<ForumStore>("local-dev-forum.json");
  const localAuditPost = forumStore.posts.find((post) => post.title === "Audit notification question");
  const localFirstComment = forumStore.comments.find((comment) => comment.body === "First independent comment.");
  expect(localAuditPost).toBeTruthy();
  expect(localFirstComment).toBeTruthy();
  const remoteCommentTime = new Date(Date.now() + 2000).toISOString();
  forumStore.comments.push(
    {
      id: "audit-remote-top-level",
      post_id: localAuditPost!.id,
      parent_comment_id: null,
      author_id: "local-nia",
      name: "Nia Patel",
      initials: "NP",
      avatar_class: "avatar-gold",
      body: "I have a neighborhood checklist that may help.",
      created_at: remoteCommentTime,
    },
    {
      id: "audit-remote-thread-reply",
      post_id: localAuditPost!.id,
      parent_comment_id: localFirstComment!.id,
      author_id: "local-nia",
      name: "Nia Patel",
      initials: "NP",
      avatar_class: "avatar-gold",
      body: "Replying directly to your first comment.",
      created_at: new Date(Date.now() + 3000).toISOString(),
    },
  );
  await writeTestJson("local-dev-forum.json", forumStore);

  await page.goto("/notifications");
  await expect(page.getByText("Nia Patel replied to you")).toHaveCount(2);
  await expect(page.getByText(/Replying directly to your first comment/)).toBeVisible();

  await page.goto("/forum");
  auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  await expect(auditPost.getByText("I have a neighborhood checklist that may help.")).toBeVisible();
  await auditPost.getByRole("link", { name: "Nia Patel" }).last().click();
  await expect(page.getByRole("heading", { name: "Nia Patel" })).toBeVisible();

  await page.goto("/forum");
  auditPost = page.locator(".forum-post", { hasText: "Audit notification question" });
  await auditPost.getByRole("button", { name: "Share" }).click();
  await auditPost.getByRole("button", { name: "Message Nia Patel" }).click();
  await expect(page).toHaveURL(/\/messages\/friend:local-friend-nia/);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/Audit notification question/);

  await page.goto("/forum?topic=Housing");
  await expect(page.locator(".topic-filter.is-active")).toHaveText("Housing");
  const visibleTopics = await page.locator(".forum-post .topic-badge").allTextContents();
  expect(visibleTopics.every((topic) => topic.trim() === "Housing")).toBe(true);

  await page.goto("/explore");
  const mapSearch = page.getByRole("combobox", { name: "Search Detroit places" });
  await mapSearch.fill("Not a Detroit place");
  await expect(page.getByText("No Detroit places found")).toBeVisible();
  await mapSearch.fill("Ford");
  await page.getByRole("option", { name: /Ford Field/ }).click();
  await expect(page.locator(".result-card.is-active", { hasText: "Ford Field" })).toBeVisible();
  await page.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("button", { name: "Sports" }).click();
  await expect(page.locator(".result-card", { hasText: "Ford Field" })).toBeVisible();
  const zoomStatus = await page.locator(".zoom-status").textContent();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.locator(".zoom-status")).not.toHaveText(zoomStatus ?? "");
});
