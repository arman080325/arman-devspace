import { describe, expect, it, vi } from "vitest";

describe("Persistence Policy and Store Delegation", () => {
  it("delegates to Prisma store when database is configured", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");

    const prismaModule = await import("@/lib/prisma");
    expect(prismaModule.isDatabaseConfigured()).toBe(true);
  });

  it("delegates to JSON store fallback when DATABASE_URL is absent", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");

    const prismaModule = await import("@/lib/prisma");
    expect(prismaModule.isDatabaseConfigured()).toBe(false);

    const devspaceStore = await import("@/services/devspace-store");
    const projects = await devspaceStore.getAllProjects(null);
    expect(projects.length).toBe(100);
    expect(projects[0].slug).toBe("online-bookstore");
  });

  it("isolates user workspace queries and dashboard feeds strictly by userId", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");

    const devspaceStore = await import("@/services/devspace-store");
    const feedA = await devspaceStore.getUserDashboardFeed("user-alpha");
    const feedB = await devspaceStore.getUserDashboardFeed("user-beta");

    expect(feedA.recentNotes.length).toBe(0);
    expect(feedB.recentNotes.length).toBe(0);

    const statsA = await devspaceStore.getWorkspaceStats("user-alpha");
    expect(statsA.totalProjects).toBe(100);
    expect(statsA.notesCount).toBe(0);
  });
});
