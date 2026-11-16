import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGitHubInspectionCache, syncRepositoriesBatch } from "@/services/github";
import * as devspaceStore from "@/services/devspace-store";

describe("GitHub Batch Synchronization Engine", () => {
  const originalFetch = globalThis.fetch;
  let savedVerifications: Array<{
    userId: string;
    projectId: string;
    data: unknown;
  }> = [];

  beforeEach(() => {
    savedVerifications = [];
    clearGitHubInspectionCache();

    vi.spyOn(devspaceStore, "saveRepositoryVerification").mockImplementation(
      async (userId, projectId, data) => {
        savedVerifications.push({ userId, projectId, data });
      },
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearGitHubInspectionCache();
    vi.restoreAllMocks();
  });

  it("processes batch items with partial failure tolerance", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/valid-repo")) {
        if (
          url.includes("/readme") ||
          url.includes("/commits") ||
          url.includes("/releases") ||
          url.includes("/actions")
        ) {
          return Promise.resolve(new Response(null, { status: 404 }));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              html_url: "https://github.com/org/valid-repo",
              name: "valid-repo",
              owner: { login: "org" },
              default_branch: "main",
              stargazers_count: 100,
              forks_count: 20,
              open_issues_count: 3,
              pushed_at: new Date().toISOString(),
              archived: false,
              license: { spdx_id: "MIT" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.includes("/missing-repo")) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Not Found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.reject(new Error("Network connection reset"));
    });

    const items = [
      {
        projectId: "project-1",
        originalRepoUrl: "https://github.com/org/valid-repo",
      },
      {
        projectId: "project-2",
        originalRepoUrl: "https://github.com/org/missing-repo",
      },
      {
        projectId: "project-3",
        originalRepoUrl: null, // Reserved placeholder slot
      },
    ];

    const summary = await syncRepositoriesBatch(items, "user-test", {
      concurrency: 2,
      delayMs: 10,
    });

    expect(summary.total).toBe(3);
    expect(summary.succeeded).toBe(2); // 1 verified + 1 unavailable (authoritative 404 recorded)
    expect(summary.skipped).toBe(1); // null repo url
    expect(summary.failed).toBe(0);
    expect(savedVerifications.length).toBe(2);
    const savedIds = savedVerifications.map((s) => s.projectId);
    expect(savedIds).toContain("project-1");
    expect(savedIds).toContain("project-2");
  });

  it("aborts remaining items when rate limit is reached", async () => {
    const resetTimeEpoch = Math.floor(Date.now() / 1000) + 3600;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(resetTimeEpoch),
        },
      }),
    );

    const items = [
      { projectId: "p-1", originalRepoUrl: "https://github.com/org/repo-1" },
      { projectId: "p-2", originalRepoUrl: "https://github.com/org/repo-2" },
      { projectId: "p-3", originalRepoUrl: "https://github.com/org/repo-3" },
      { projectId: "p-4", originalRepoUrl: "https://github.com/org/repo-4" },
    ];

    const summary = await syncRepositoriesBatch(items, "user-test", {
      concurrency: 2,
      delayMs: 10,
    });

    expect(summary.rateLimited).toBe(true);
    expect(summary.rateLimitResetAt).toBe(new Date(resetTimeEpoch * 1000).toISOString());
    // At least the later chunk items must be marked skipped
    expect(summary.skipped).toBeGreaterThan(0);
    expect(savedVerifications.length).toBe(0); // Rate limited items do not overwrite DB
  });

  it("does not overwrite database metadata when network failure occurs", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    const items = [
      { projectId: "p-net-fail", originalRepoUrl: "https://github.com/org/repo" },
    ];

    const summary = await syncRepositoriesBatch(items, "user-test");

    expect(summary.failed).toBe(1);
    expect(summary.succeeded).toBe(0);
    // Crucial: existing DB metadata is preserved on network failure!
    expect(savedVerifications.length).toBe(0);
  });
});
