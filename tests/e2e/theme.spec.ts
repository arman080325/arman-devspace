import { expect, test } from "@playwright/test";

test.describe("Theme Toggle & Dynamic Branding End-to-End Suite", () => {
  test("theme toggle switches theme instantly on client without reload, error, or navigation", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    const initialUrl = page.url();

    // Verify initial night shift theme
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");

    const themeToggle = page.getByRole("button", { name: /Switch to Day Shift/i });
    await expect(themeToggle).toBeVisible();

    // Click toggle to switch to Day Shift
    await themeToggle.click();

    // Verify instant client update without navigation
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    expect(page.url()).toBe(initialUrl);

    // Verify toggle button aria-label flips
    const nightToggle = page.getByRole("button", { name: /Switch to Night Shift/i });
    await expect(nightToggle).toBeVisible();

    // Click toggle to switch back to Night Shift
    await nightToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    expect(page.url()).toBe(initialUrl);

    // Verify persistence across page refresh
    await themeToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");

    // Zero runtime errors
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("workspace branding displays neutral Devspace when unauthenticated", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // 1. Unauthenticated visit on home
    await page.goto("/");
    await expect(page.getByText("Devspace").first()).toBeVisible();

    // 2. Unauthenticated visit on /login
    await page.goto("/login");
    await expect(page.getByText("Devspace").first()).toBeVisible();

    // 3. Unauthenticated visit on /register
    await page.goto("/register");
    await expect(page.getByText("Devspace").first()).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("dynamic branding displays personalized workspace when session route returns authenticated user", async ({
    page,
  }) => {
    // Intercept /api/auth/me to return an authenticated user session dynamically
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-sanjana-test",
            email: "sanjana@devspace.test",
            name: "Sanjana Patel",
            role: "developer",
          },
        }),
      });
    });

    await page.goto("/projects");

    // Verify dynamic top-left brand reflects user's first name
    await expect(page.getByText("Sanjana's Devspace").first()).toBeVisible();

    // Verify theme toggle still operates smoothly within dynamic branded workspace
    const themeToggle = page.getByRole("button", {
      name: /Switch to (Day|Night) Shift/i,
    });
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.getByText("Sanjana's Devspace").first()).toBeVisible();
  });
});
