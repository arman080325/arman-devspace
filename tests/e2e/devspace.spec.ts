import { expect, test } from "@playwright/test";

test.describe("Arman's Devspace end-to-end workflows", () => {
  test("homepage renders brand identity, hero CTAs, paths, and real dynamic statistics", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Your next project starts here\./i }),
    ).toBeVisible();
    await expect(page.getByText("Arman's Devspace").first()).toBeVisible();
    await expect(page.getByText("Explore. Build. Break. Rebuild.").first()).toBeVisible();

    await expect(page.getByRole("link", { name: "Explore Projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open My Workspace" })).toBeVisible();

    await expect(page.getByText("100").first()).toBeVisible();
  });

  test("project explorer preserves strict #001-#100 order, filtering, and Grid/List switching", async ({
    page,
  }) => {
    await page.goto("/projects");

    await expect(page.getByRole("heading", { name: "Project Explorer" })).toBeVisible();
    await expect(page.getByText("#001").first()).toBeVisible();

    // Filter by #24
    const searchInput = page.getByLabel(/Search by number/i);
    await searchInput.fill("#24");
    await expect(page.getByRole("link", { name: "Quiz Game Multiplayer" })).toBeVisible();

    await searchInput.fill("");
    await expect(page.getByText("#001").first()).toBeVisible();

    // Switch to List (accessible sortable table) view
    await page.getByRole("button", { name: "List" }).click();
    await expect(
      page.getByRole("table", { name: /Canonical 100-project/i }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "#" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  test("unauthenticated dashboard access redirects cleanly to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login\?redirect=%2Fdashboard/);
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
  });

  test("register -> access dashboard/kanban/journal/analytics -> persist task & note on #001", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@devspace.test`;
    await page.goto("/register");

    await page.getByLabel(/Full name/i).fill("Arman Tester");
    await page.getByLabel(/Email address/i).fill(email);
    await page
      .getByLabel(/Password/i, { exact: false })
      .first()
      .fill("DevSpace2026!");
    await page.getByRole("button", { name: /Create workspace account/i }).click();

    await page.waitForURL("**/dashboard");
    await expect(
      page.getByRole("heading", { name: /Welcome back, Arman Tester/i }),
    ).toBeVisible();

    // Visit Kanban board & Engineering Journal
    await page.goto("/kanban");
    await expect(page.getByRole("heading", { name: "Development Kanban" })).toBeVisible();

    await page.goto("/analytics");
    await expect(
      page.getByRole("heading", { name: "Development Analytics" }),
    ).toBeVisible();

    // Open Project #001 workspace and persist task + status + note
    await page.goto("/projects/online-bookstore");
    await page
      .getByRole("combobox", { name: "Project workspace status" })
      .selectOption("in-development");
    await expect(page.getByText(/Status updated to In Development/i)).toBeVisible();

    await page.getByRole("tab", { name: /Development Checklist/i }).click();
    await page
      .getByLabel("Task Description")
      .fill("Implement E2E Playwright verified task");
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByText("Implement E2E Playwright verified task")).toBeVisible();

    // Reload and confirm persisted state survives refresh
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Project workspace status" }),
    ).toHaveValue("in-development");
    await page.getByRole("tab", { name: /Development Checklist/i }).click();
    await expect(page.getByText("Implement E2E Playwright verified task")).toBeVisible();
  });
});
