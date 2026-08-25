import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const mobileRoutes = [
  { name: "home", path: "/", ready: (page: Page) => page.getByRole("heading", { name: "Detroit Connect", exact: true }) },
  { name: "connectors", path: "/connectors", ready: (page: Page) => page.getByRole("heading", { name: "Connectors", exact: true }) },
  {
    name: "ai-search",
    path: "/search?q=Spanish-speaking%20housing%20help%20in%20Southwest%20Detroit",
    ready: (page: Page) => page.getByRole("heading", { name: "What can we help you find?", exact: true }),
  },
  { name: "forum", path: "/forum", ready: (page: Page) => page.getByRole("heading", { name: "Ask & Answer", exact: true }) },
  { name: "explore", path: "/explore", ready: (page: Page) => page.getByRole("region", { name: "Explore Detroit" }) },
  { name: "friends", path: "/network", ready: (page: Page) => page.getByRole("heading", { name: "Network", exact: true }) },
  { name: "favorites", path: "/favorites", ready: (page: Page) => page.getByRole("heading", { name: "Favorites", exact: true }) },
  { name: "messages", path: "/messages", ready: (page: Page) => page.getByRole("heading", { name: "Messages", exact: true }) },
  {
    name: "conversation",
    path: "/messages/11111111-1111-4111-8111-000000000001",
    ready: (page: Page) => page.getByRole("region", { name: "Conversation with Maria Rodriguez" }),
  },
  { name: "notifications", path: "/notifications", ready: (page: Page) => page.getByRole("heading", { name: "Notifications", exact: true }) },
  { name: "settings", path: "/settings", ready: (page: Page) => page.getByRole("heading", { name: "Settings", exact: true }) },
  { name: "community-guidelines", path: "/community-guidelines", ready: (page: Page) => page.getByRole("heading", { name: "Community Guidelines", exact: true }) },
  { name: "admin", path: "/admin", ready: (page: Page) => page.getByRole("heading", { name: "Community operations", exact: true }) },
  { name: "create-profile", path: "/create-profile", ready: (page: Page) => page.getByRole("heading", { name: "Create profile", exact: true }) },
  { name: "login", path: "/login", ready: (page: Page) => page.getByRole("heading", { name: "Sign in", exact: true }) },
  {
    name: "public-profile",
    path: "/connectors/11111111-1111-4111-8111-000000000001",
    ready: (page: Page) => page.getByRole("heading", { name: "Maria Rodriguez" }),
  },
  { name: "not-found", path: "/missing-page", ready: (page: Page) => page.getByRole("heading", { name: "Page not found" }) },
] as const;

test("every primary route is usable at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of mobileRoutes) {
    await page.goto(route.path);
    await expect(route.ready(page)).toBeVisible();

    if (route.name === "explore") {
      await expect(page.locator(".leaflet-map")).toBeVisible();
      await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
    }

    const layout = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const header = document.querySelector<HTMLElement>(".topbar")?.getBoundingClientRect();
      const nav = document.querySelector<HTMLElement>(".topbar nav")?.getBoundingClientRect();
      const interactiveOverflow = Array.from(
        document.querySelectorAll<HTMLElement>("a, button, input, select, textarea, summary"),
      )
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          const hasScrollableAncestor = Boolean(
            element.parentElement?.closest(".forum-sidebar, .social-profile-tabs"),
          );
          return (
            !hasScrollableAncestor &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            bounds.width > 0 &&
            bounds.height > 0 &&
            (bounds.left < -1 || bounds.right > viewportWidth + 1)
          );
        })
        .map((element) => `${element.tagName.toLowerCase()}.${element.className}`)
        .slice(0, 12);

      return {
        header: header ? { left: header.left, right: header.right, top: header.top } : null,
        nav: nav ? { bottom: nav.bottom, height: nav.height, top: nav.top } : null,
        interactiveOverflow,
        viewportWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(layout.header, `${route.name} should have the shared mobile header`).not.toBeNull();
    expect(layout.header!.left, `${route.name} header should start at the viewport edge`).toBeGreaterThanOrEqual(-1);
    expect(layout.header!.right, `${route.name} header should span the viewport`).toBeGreaterThanOrEqual(389);
    expect(layout.header!.top, `${route.name} header should stay at the top`).toBeGreaterThanOrEqual(-1);
    expect(layout.nav, `${route.name} should have mobile navigation`).not.toBeNull();
    expect(layout.nav!.bottom, `${route.name} navigation should stay at the bottom`).toBeGreaterThanOrEqual(843);
    expect(layout.nav!.height, `${route.name} navigation should remain compact`).toBeLessThanOrEqual(76);
    expect(layout.scrollWidth - layout.viewportWidth, `${route.name} should not scroll horizontally`).toBeLessThanOrEqual(1);
    expect(layout.interactiveOverflow, `${route.name} has clipped interactive controls`).toEqual([]);

    await page.screenshot({
      fullPage: true,
      path: `test-results/mobile-${route.name}.png`,
    });
  }
});

test("the mobile profile submit action stays above navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create-profile");
  await expect(page.getByRole("heading", { name: "Create profile" })).toBeVisible();

  const submitBar = page.locator(".profile-submit-bar");
  await submitBar.scrollIntoViewIfNeeded();
  const submitBounds = await submitBar.boundingBox();
  const navBounds = await page.locator(".topbar nav").boundingBox();

  expect(submitBounds).not.toBeNull();
  expect(navBounds).not.toBeNull();
  expect(submitBounds!.y + submitBounds!.height).toBeLessThanOrEqual(navBounds!.y - 4);
});

test("essential pages also fit a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });

  for (const path of ["/", "/connectors", "/search?q=housing", "/forum", "/create-profile", "/connectors/11111111-1111-4111-8111-000000000001"]) {
    await page.goto(path);

    const frame = await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>(".topbar nav")?.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        navBottom: nav?.bottom ?? 0,
        navHeight: nav?.height ?? 0,
      };
    });

    expect(frame.scrollWidth - frame.clientWidth, `${path} should not overflow at 320px`).toBeLessThanOrEqual(1);
    expect(frame.navBottom, `${path} navigation should stay at the bottom`).toBeGreaterThanOrEqual(699);
    expect(frame.navHeight, `${path} two-row navigation should remain compact`).toBeLessThanOrEqual(118);
  }
});
