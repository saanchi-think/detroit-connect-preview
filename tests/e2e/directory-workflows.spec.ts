import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("directory handles 1,000 synthetic profiles with search, filters, and pagination", async ({ page }) => {
  await page.goto("/connectors");

  await expect(page.getByText("Showing 1–24 of 1000")).toBeVisible();
  await expect(page.locator(".profile-snapshot")).toHaveCount(24);
  await expect(page.getByText("Page 1 of 42")).toBeVisible();
  const firstSnapshot = page.locator(".profile-snapshot").first();
  await expect(firstSnapshot.getByRole("link", { name: /Message/ })).toBeVisible();
  const directorySaveButton = firstSnapshot.getByRole("button", { name: /(Save|Remove).*favorites/ });
  await expect(directorySaveButton).toBeVisible();
  await directorySaveButton.click();
  const directoryRemoveButton = firstSnapshot.getByRole("button", { name: /Remove .* from favorites/ });
  await expect(directoryRemoveButton).toBeVisible();
  await directoryRemoveButton.click();
  await expect(firstSnapshot.getByRole("button", { name: /Save .* to favorites/ })).toBeVisible();

  const firstPageProfile = await page.locator(".profile-snapshot h3").first().textContent();
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Showing 25–48 of 1000")).toBeVisible();
  await expect(page.locator(".profile-snapshot h3").first()).not.toHaveText(firstPageProfile ?? "");

  await page.getByRole("combobox", { name: "Search connectors" }).fill("Maria Rodriguez");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();

  await page.goto("/connectors?type=organization");
  await expect(page.locator(".profile-kind").first()).toHaveText("Organization");
  await expect(page.locator(".result-pagination > span")).toContainText("of");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/connectors");
  const mobileSnapshots = page.locator(".profile-snapshot");
  await expect(mobileSnapshots).toHaveCount(24);
  await expect(mobileSnapshots.first()).toBeVisible();
  const firstMobileSnapshot = await mobileSnapshots.nth(0).boundingBox();
  const secondMobileSnapshot = await mobileSnapshots.nth(1).boundingBox();
  expect(firstMobileSnapshot).not.toBeNull();
  expect(secondMobileSnapshot).not.toBeNull();
  expect(Math.abs(firstMobileSnapshot!.x - secondMobileSnapshot!.x)).toBeLessThan(2);
  expect(secondMobileSnapshot!.y).toBeGreaterThan(firstMobileSnapshot!.y + firstMobileSnapshot!.height);
  const mobileDirectoryWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(mobileDirectoryWidth.scroll - mobileDirectoryWidth.client).toBeLessThanOrEqual(1);
});

test("a profile can be saved, recommended, messaged, and viewed in favorites", async ({ page }) => {
  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");

  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "mailto:maria.rodriguez@example.test");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.getByText("Recommend", { exact: true }).click();
  await page.getByLabel("Recommendation note").fill("Synthetic test recommendation.");
  await page.getByRole("button", { name: "Recommend to network" }).click();
  await expect(page.getByRole("status")).toHaveText("Recommendation shared with your network.");

  await page.getByRole("link", { name: "Message", exact: true }).click();
  await expect(page).toHaveURL(/\/messages\/11111111-1111-4111-8111-000000000001/);
  await page.getByPlaceholder("Message Maria").fill("Hello Maria, could we compare a few neighborhoods?");
  await page.getByRole("button", { name: "Send" }).click();
  const sentMariaMessage = page.locator(".message-bubble", {
    hasText: "Hello Maria, could we compare a few neighborhoods?",
  });
  await expect(sentMariaMessage).toBeVisible();
  await expect(sentMariaMessage.locator("time")).toContainText("Delivered");

  await page.getByRole("link", { name: "All messages" }).click();
  await expect(page).toHaveURL(/\/messages$/);
  await expect(page.getByRole("link", { name: /Open conversation with Maria Rodriguez/ })).toContainText(
    "Hello Maria, could we compare a few neighborhoods?",
  );

  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await page.getByRole("button", { name: "Add to network" }).click();
  await expect(page).toHaveURL(/\/connectors\/11111111-1111-4111-8111-000000000001\?friend=sent/);
  await expect(page.getByRole("status")).toHaveText("Connection request sent.");
  await expect(page.getByRole("link", { name: "Request sent" })).toBeVisible();
  await page.goto("/network");
  const sentRequests = page.getByLabel("Sent");
  await expect(sentRequests.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await sentRequests.getByRole("button", { name: "Cancel" }).click();

  await page.goto("/favorites");
  await expect(page.getByLabel("Saved connector profiles").getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended by you" })).toBeVisible();
  await page.getByLabel("Saved connector profiles").getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("heading", { name: "Saved profiles" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended by you" })).toBeVisible();
});

test("the public profile stays readable on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");

  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await expect(page.locator(".social-profile-header")).toBeVisible();
  await expect(page.locator(".social-profile-tabs")).toBeVisible();
  const connections = page.getByRole("region", { name: "Connections" });
  await expect(connections.getByRole("tab", { name: "Network 6" })).toBeVisible();
  await connections.getByRole("tab", { name: /Recommended by/ }).click();
  await expect(connections.getByRole("link", { name: /Nia Patel/ })).toBeVisible();
  await connections.getByRole("tab", { name: /Recommendations 4/ }).click();
  await expect(connections.getByText("People and organizations Maria recommends")).toBeVisible();

  await page.goto("/connectors/11111111-1111-4111-8111-000000000008");
  await expect(
    page.locator(".social-profile-header").getByText("Connected", { exact: true }),
  ).toBeVisible();
  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();

  const desktopFeed = await page.locator(".social-profile-feed").boundingBox();
  const desktopDetails = await page.locator(".social-profile-sidebar").boundingBox();
  expect(desktopFeed).not.toBeNull();
  expect(desktopDetails).not.toBeNull();
  expect(desktopDetails!.x).toBeGreaterThan(desktopFeed!.x + desktopFeed!.width);
  expect(Math.abs(desktopDetails!.y - desktopFeed!.y)).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/connectors/11111111-1111-4111-8111-000000000001");
  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();

  const mobileFeed = await page.locator(".social-profile-feed").boundingBox();
  const mobileDetails = await page.locator(".social-profile-sidebar").boundingBox();
  expect(mobileFeed).not.toBeNull();
  expect(mobileDetails).not.toBeNull();
  expect(Math.abs(mobileFeed!.x - mobileDetails!.x)).toBeLessThan(2);
  expect(mobileDetails!.y).toBeGreaterThan(mobileFeed!.y + mobileFeed!.height);

  const mobileViewport = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(mobileViewport.scroll - mobileViewport.client).toBeLessThanOrEqual(1);
});

test("messages support unread filtering, delivery timestamps, and starting a conversation", async ({ page }) => {
  await page.goto("/messages");

  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await expect(page.locator(".messages-title").getByLabel("2 unread messages")).toBeVisible();
  await page.getByRole("link", { name: "Unread 2" }).click();

  const unreadList = page.getByLabel("Unread conversations");
  await expect(unreadList.getByRole("link", { name: /Open conversation with Nia Patel/ })).toBeVisible();
  await expect(unreadList.getByRole("link", { name: /Maria Rodriguez/ })).toHaveCount(0);

  await unreadList.getByRole("link", { name: /Open conversation with Nia Patel/ }).click();
  await expect(page.getByRole("link", { name: "All messages" })).toBeVisible();
  await expect(page.getByText("One specializes in Midtown rentals and transit access.")).toBeVisible();
  await page.getByRole("textbox", { name: "Message" }).fill("Please send the Midtown introduction.");
  await page.getByRole("button", { name: "Send" }).click();
  const sentNiaMessage = page.locator(".message-bubble", { hasText: "Please send the Midtown introduction." });
  await expect(sentNiaMessage.locator("time")).toContainText("Delivered");

  await page.getByRole("link", { name: "All messages" }).click();
  await expect(page.getByRole("link", { name: "Unread 0" })).toBeVisible();
  await page.getByRole("link", { name: "Unread 0" }).click();
  await expect(page.getByText("No unread messages")).toBeVisible();

  await page.getByText("New message", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Marcus Bell/ })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/messages");
  const messagesViewport = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(messagesViewport.scroll - messagesViewport.client).toBeLessThanOrEqual(1);
});

test("friend requests can be added, accepted, and cancelled", async ({ page }) => {
  await page.goto("/network");

  const friendRecommendations = page.getByRole("region", { name: "Recommended by your network" });
  await expect(friendRecommendations.locator(".recommendation-card")).toHaveCount(3);
  await expect(friendRecommendations.getByText("You", { exact: true })).toHaveCount(0);
  await friendRecommendations.getByRole("link", { name: "Nia Patel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nia Patel" })).toBeVisible();
  await page.goto("/network");

  const friendFinder = page.getByRole("combobox", { name: "Find someone you know" });
  await friendFinder.fill("Maria");
  const peopleResults = page.getByRole("region", { name: "People search results" });
  await expect(peopleResults.getByRole("link", { name: "Maria Rodriguez", exact: true })).toBeVisible();
  await peopleResults.getByRole("button", { name: "Add Maria Rodriguez to your network" }).click();
  await expect(page.getByText("Connection request sent.")).toBeVisible();
  const newSentRequest = page.getByRole("region", { name: "Sent" });
  await expect(newSentRequest.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await newSentRequest.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("region", { name: "Sent" })).toHaveCount(0);

  await page.getByRole("combobox", { name: "Find someone you know" }).fill("new.neighbor@example.com");
  await expect(page.getByText("No Detroit Connect profile found")).toBeVisible();
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("link", { name: "Email" })).toHaveAttribute(
    "href",
    /mailto:new\.neighbor@example\.com/,
  );
  await expect(page.getByRole("link", { name: "SMS" })).toHaveAttribute("href", /^sms:/);
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await page.getByRole("button", { name: "Close people search" }).click();

  await expect(page.getByText("Andre Brooks")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("button", { name: "Accept" })).not.toBeVisible();
  const andreCard = page.locator(".people-panel > .friend-list .friend-card", { hasText: "Andre Brooks" });
  await expect(andreCard.getByRole("link", { name: "Message Andre Brooks" })).toBeVisible();
  await andreCard.getByRole("link", { name: "Andre Brooks", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Andre Brooks" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/network");
  await page.getByRole("combobox", { name: "Find someone you know" }).fill("Maria");
  await expect(page.getByRole("region", { name: "People search results" })).toBeVisible();
  const friendsViewport = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(friendsViewport.scroll - friendsViewport.client).toBeLessThanOrEqual(1);
});

test("forum posts, likes, threaded replies, profile links, and sharing work", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:5202" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.goto("/forum");

  const mariaPost = page.locator(".forum-post", { hasText: "Looking for renter-friendly neighborhoods" });
  await mariaPost.getByRole("link", { name: "Maria Rodriguez" }).first().click();
  await expect(page.getByRole("heading", { name: "Maria Rodriguez" })).toBeVisible();
  await page.goto("/forum");

  const mariaPostWithComments = page.locator(".forum-post", { hasText: "Looking for renter-friendly neighborhoods" });
  await mariaPostWithComments.getByRole("link", { name: "Jalen P." }).click();
  await expect(page.getByRole("heading", { name: "Jalen Parker" })).toBeVisible();
  await page.goto("/forum");

  const amaraPost = page.locator(".forum-post", { hasText: "Who helps new food businesses" });
  await amaraPost.getByRole("link", { name: "Amara King" }).click();
  await expect(page.getByRole("heading", { name: "Amara King" })).toBeVisible();
  await page.goto("/forum");

  const devonPost = page.locator(".forum-post", { hasText: "Moving checklist for the first two weeks" });
  await devonPost.getByRole("link", { name: "Priya M." }).click();
  await expect(page.getByRole("heading", { name: "Priya Mehta" })).toBeVisible();
  await page.goto("/forum");

  await page.getByLabel("Title").fill("Synthetic forum question");
  await page.getByLabel("Details").fill("This forum post verifies the local synthetic interaction workflow.");
  await page.getByLabel("Post topic").selectOption("Housing");
  await page.getByRole("button", { name: "Post request" }).click();
  await expect(page.getByText("Posted.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthetic forum question" })).toBeVisible();

  const post = page.locator(".forum-post", { hasText: "Synthetic forum question" });
  await post.getByText("Add comment").click();
  await post.getByPlaceholder("Write a comment...").fill("Synthetic comment for interaction testing.");
  await post.getByRole("button", { name: "Post" }).click();
  await expect(page.getByText("Synthetic comment for interaction testing.")).toBeVisible();

  await post.getByRole("button", { name: "Like" }).click();
  await expect(post.getByRole("button", { name: /Liked 1/ })).toBeVisible();

  const topLevelComment = post.locator(".forum-comment", { hasText: "Synthetic comment for interaction testing." }).first();
  await topLevelComment.getByText("Reply in thread").click();
  await post.getByPlaceholder("Reply to You").fill("A nested reply for the local forum test.");
  await post.getByRole("button", { name: "Post reply" }).last().click();
  await expect(post.locator(".forum-comment-copy > p").filter({ hasText: "A nested reply for the local forum test." }).last()).toBeVisible();

  await post.getByRole("button", { name: "Share" }).click();
  await post.getByRole("button", { name: "Copy link" }).click();
  await expect(post.getByRole("button", { name: "Copied" })).toBeVisible();
  await post.getByRole("button", { name: /Nia Patel/ }).click();
  await expect(page).toHaveURL(/\/messages\/friend:local-friend-nia/);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/Synthetic forum question/);
});

test("the Explore Detroit map filters, selects a place, and responds to zoom controls", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("region", { name: "Explore Detroit" })).toBeVisible();

  const placeSearch = page.getByRole("combobox", { name: "Search Detroit places" });
  await placeSearch.fill("Ford");
  const fordSuggestion = page.getByRole("option", { name: /Ford Field/ });
  await expect(fordSuggestion).toBeVisible();
  await fordSuggestion.click();
  await expect(placeSearch).toHaveValue("Ford Field");
  await expect(page.locator(".result-list .result-card")).toHaveCount(2);
  await expect(page.locator(".result-list .result-card", { hasText: "Ford Field" })).toHaveClass(
    "result-card is-active",
  );

  await page.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("button", { name: "Sports" }).click();
  const fordCard = page.locator(".result-list .result-card", { hasText: "Ford Field" });
  await expect(fordCard).toBeVisible();
  await fordCard.click();
  await expect(fordCard).toHaveClass("result-card is-active");

  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  await expect(zoomIn).toBeEnabled();
  await zoomIn.click();
});

test("the home search and profile creator work against the synthetic directory", async ({ page }) => {
  await page.goto("/");
  const homeSearch = page.getByRole("combobox", { name: "Search Detroit Connect", exact: true });
  await homeSearch.fill("Maria");
  await expect(page.getByRole("option", { name: /Maria Rodriguez/ })).toBeVisible();
  await homeSearch.press("ArrowDown");
  await homeSearch.press("Enter");
  await expect(page).toHaveURL(/\/connectors\/11111111-1111-4111-8111-000000000001/);

  await page.goto("/");
  await page.getByRole("combobox", { name: "Search Detroit Connect", exact: true }).fill("Housing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/search\?q=Housing/);
  await expect(page.getByRole("heading", { name: "Recommended connectors" })).toBeVisible();

  await page.goto("/create-profile");
  await page.route("**/api/website-metadata?*", async (route) => {
    await route.fulfill({ json: { name: "Detroit Neighborhood Association" } });
  });
  await page.getByRole("button", { name: "Racing car avatar" }).click();
  await page.getByLabel("Upload photo").setInputFiles({
    name: "fixture-profile.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nLkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: "Selected profile photo preview" })).toBeVisible();
  await page.getByRole("textbox", { name: "Neighborhood", exact: true }).fill("Midtown");
  await page.getByLabel("First name").fill("Fixture");
  await page.getByLabel("Last name").fill("Profile");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("fixture.profile@example.test");
  await page.getByRole("checkbox", { name: "Housing" }).check();
  await page.getByRole("checkbox", { name: "Messages" }).check();
  await page.getByLabel("Website optional").fill("https://example.org");
  await page.getByLabel("Website optional").press("Tab");
  await expect(page.getByLabel("Affiliation name")).toHaveValue("Detroit Neighborhood Association");
  await page.getByRole("button", { name: "Add affiliation" }).click();
  await expect(page.getByLabel("Affiliation name")).toHaveCount(2);
  await page.getByLabel("Affiliation name").nth(1).fill("Wayne State Alumni");
  await page.getByLabel("Website optional").nth(1).fill("https://wayne.edu");
  await page.getByLabel("Add a custom skill").fill("Community organizing");
  await page.getByRole("button", { name: "Add custom skill" }).click();
  await expect(page.getByLabel("Custom skills")).toContainText("Community organizing");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile created. It is now live in your connector results.");
  await expect(page.getByRole("heading", { name: "Fixture Profile" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Fixture Profile", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
  await expect(page.getByText("Community organizing", { exact: true })).toBeVisible();
  const uploadedPhoto = page.locator(".profile-portrait .connector-profile-photo");
  await expect(uploadedPhoto).toBeVisible();
  const uploadedPhotoUrl = await uploadedPhoto.getAttribute("src");
  expect(uploadedPhotoUrl).toMatch(/^\/api\/profile-photos\/[0-9a-f-]{36}\.png$/);
  const uploadedPhotoResponse = await page.request.get(uploadedPhotoUrl!);
  expect(uploadedPhotoResponse.ok()).toBe(true);
  expect(uploadedPhotoResponse.headers()["content-type"]).toBe("image/png");

  await page.goto("/create-profile");
  await page.locator(".profile-type-selector label", { hasText: "Organization" }).click();
  await expect(page.getByLabel("Organization", { exact: true })).toBeChecked();
  await page.getByRole("textbox", { name: "Neighborhood", exact: true }).fill("Corktown");
  await page.getByLabel("Organization name").fill("Fixture Detroit Alliance");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("fixture.alliance@example.test");
  await page.locator("summary", { hasText: "Career & business" }).click();
  await page.getByRole("checkbox", { name: "Small business resources" }).check();
  await page.getByRole("checkbox", { name: "Messages" }).check();
  await page.getByRole("button", { name: "Create profile" }).click();
  const organizationCard = page.locator(".profile-snapshot", { hasText: "Fixture Detroit Alliance" }).first();
  await expect(organizationCard.getByRole("heading", { name: "Fixture Detroit Alliance" })).toBeVisible();
  await expect(organizationCard.locator(".profile-kind")).toHaveText("Organization");
});

test("the profile builder stays aligned on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/create-profile");
  await expect(page.getByRole("heading", { name: "Create profile" })).toBeVisible();

  const desktopSetup = await page.locator(".profile-setup-panel").boundingBox();
  const desktopForm = await page.locator(".profile-form-column").boundingBox();
  expect(desktopSetup).not.toBeNull();
  expect(desktopForm).not.toBeNull();
  expect(desktopForm!.x).toBeGreaterThan(desktopSetup!.x + desktopSetup!.width);
  await expect(page.locator(".required-marker")).toHaveCount(5);
  expect(
    await page.getByRole("textbox", { name: "Email", exact: true })
      .evaluate((input) => (input as HTMLInputElement).required),
  ).toBe(true);

  await page.getByLabel("First name").fill("1");
  await page.getByRole("textbox", { name: "Neighborhood", exact: true }).fill("Midtown");
  await page.getByLabel("Last name").fill("Profile");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByLabel("First name")).toBeFocused();
  expect(await page.getByLabel("First name").evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create-profile");
  await expect(page.getByRole("heading", { name: "Create profile" })).toBeVisible();

  const mobileSetup = await page.locator(".profile-setup-panel").boundingBox();
  const mobileForm = await page.locator(".profile-form-column").boundingBox();
  expect(mobileSetup).not.toBeNull();
  expect(mobileForm).not.toBeNull();
  expect(Math.abs(mobileSetup!.x - mobileForm!.x)).toBeLessThan(2);
  expect(mobileSetup!.y).toBeLessThan(mobileForm!.y);
  const overflowers = await page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.right > document.documentElement.clientWidth + 1 || bounds.left < -1;
      })
      .slice(0, 12)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
  );
  expect(overflowers).toEqual([]);
  const viewportWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(viewportWidth.scroll - viewportWidth.client).toBeLessThanOrEqual(1);
});
