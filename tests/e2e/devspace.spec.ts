import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "large-desktop", width: 1440, height: 900 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "small-desktop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 360, height: 800 },
];

test.describe("Arman's Devspace end-to-end & responsive QA", () => {
  test("homepage renders brand identity, hero CTAs, stats, and public navigation", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Your next project starts here\./i }),
    ).toBeVisible();
    await expect(page.getByText("Arman's Devspace").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open My Workspace" })).toBeVisible();
    await expect(page.getByText("100").first()).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("project explorer preserves strict #001-#100 order, filtering, and Field/Plates/List switching", async ({
    page,
  }) => {
    await page.goto("/projects");

    await expect(page.getByRole("heading", { name: "Project Explorer" })).toBeVisible();

    const searchInput = page.getByLabel(
      /Search projects by number, title, category or stack/i,
    );
    await searchInput.fill("#24");
    await page.getByRole("radio", { name: "Plates" }).click();
    await expect(
      page.getByRole("link", { name: /Quiz Game Multiplayer/i }).first(),
    ).toBeVisible();

    await searchInput.fill("");
    await page.getByRole("radio", { name: "List" }).click();
    await expect(
      page.getByRole("table", { name: /Canonical 100-project catalog/i }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /No\./i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  test("unauthenticated access to protected routes redirects cleanly to login", async ({
    page,
  }) => {
    for (const route of ["/dashboard", "/activity", "/settings", "/kanban"]) {
      await page.goto(route);
      await page.waitForURL(new RegExp(`/login\\?redirect=${encodeURIComponent(route)}`));
      await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
    }
  });

  test("complete authenticated journey across workspace, activity, roadmaps, journal, analytics, settings, and sign-out", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const email = `e2e-${Date.now()}@devspace.test`;
    await page.goto("/register");

    await page.getByLabel(/Full name/i).fill("Arman Tester");
    await page.getByLabel(/Email address/i).fill(email);
    await page
      .getByLabel(/^Password/i)
      .first()
      .fill("DevSpace2026!");
    await page.getByRole("button", { name: /Create workspace account/i }).click();

    await page.waitForURL("**/dashboard");
    await expect(
      page.getByRole("heading", {
        name: /Good (morning|afternoon|evening), Arman Tester\./i,
      }),
    ).toBeVisible();

    // Keyboard navigation: open Command Palette via Ctrl+K, verify search, close with Escape
    await page.keyboard.press("Control+k");
    const cmdInput = page.getByPlaceholder(/Jump to project, command, or path/i);
    if (await cmdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cmdInput.fill("Online Bookstore");
      await page.keyboard.press("Escape");
      await expect(cmdInput).not.toBeVisible();
    }

    // Open Project #001 workspace, toggle Pin, create a task in Roadmap tab, and verify persistence
    await page.goto("/projects/online-bookstore");
    await page.getByRole("button", { name: /Pin/i }).click();
    await expect(page.getByRole("button", { name: /Pinned/i })).toBeVisible();

    await page.getByRole("tab", { name: /Roadmap/i }).click();
    await page
      .getByLabel("New modernization task description")
      .fill("Implement E2E Playwright verified task");
    await page.getByRole("button", { name: /^Add$/i }).click();
    await expect(page.getByText("Implement E2E Playwright verified task")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: /Pinned/i })).toBeVisible();
    await page.getByRole("tab", { name: /Roadmap/i }).click();
    await expect(
      page.getByText("Implement E2E Playwright verified task").first(),
    ).toBeVisible();

    // Visit Activity, Roadmaps, Journal, Analytics, Settings (Appearance + Integrations), then Sign Out
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();

    await page.goto("/kanban");
    await expect(page.getByRole("heading", { name: "Roadmaps" })).toBeVisible();

    await page.goto("/journal");
    await expect(
      page.getByRole("heading", { name: "Engineering Journal" }),
    ).toBeVisible();
    await page.getByLabel(/Title/i).fill("E2E Journal Verification");
    await page
      .getByLabel(/Technical Notes/i)
      .fill("Verified milestone persistence during final QA audit.");
    await page.getByRole("button", { name: /Publish Journal Entry/i }).click();
    await expect(page.getByText("E2E Journal Verification").first()).toBeVisible();

    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

    await page.goto("/settings?section=appearance");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("radio", { name: /Day Shift/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    await page.getByRole("radio", { name: /Night Shift/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");

    await page.goto("/settings?section=integrations");
    await expect(
      page.getByRole("heading", { name: /GitHub Repository Intelligence/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Vercel Deployments/i }),
    ).toBeVisible();

    await page.goto("/settings?section=security");
    await page.getByRole("button", { name: /^Sign out$/i }).click();
    const confirmButtons = page.getByRole("dialog").getByRole("button", {
      name: /^Sign out$/i,
    });
    await confirmButtons.click();
    await page.waitForURL("**/login");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("responsive layout check across all 6 viewports has no horizontal overflow", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const publicRoutes = ["/", "/login", "/register"];
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of publicRoutes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          overflow.scrollWidth,
          `Horizontal overflow on ${route} at ${vp.name} (${vp.width}x${vp.height})`,
        ).toBeLessThanOrEqual(overflow.innerWidth + 1);
      }
    }

    const email = `resp-${Date.now()}@devspace.test`;
    await page.goto("/register");
    await page.getByLabel(/Full name/i).fill("Responsive Audit");
    await page.getByLabel(/Email address/i).fill(email);
    await page
      .getByLabel(/^Password/i)
      .first()
      .fill("DevSpace2026!");
    await page.getByRole("button", { name: /Create workspace account/i }).click();
    await page.waitForURL("**/dashboard");

    const routesToCheck = [
      "/dashboard",
      "/projects",
      "/paths",
      "/paths/beginner",
      "/technologies",
      "/projects/online-bookstore",
      "/activity",
      "/kanban",
      "/journal",
      "/analytics",
      "/settings",
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of routesToCheck) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          overflow.scrollWidth,
          `Horizontal overflow on ${route} at ${vp.name} (${vp.width}x${vp.height})`,
        ).toBeLessThanOrEqual(overflow.innerWidth + 1);
      }
    }
  });
});
