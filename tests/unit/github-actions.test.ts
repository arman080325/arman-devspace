import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGitHubInspectionCache,
  fetchRepositoryWorkflowRuns,
} from "@/services/github";

describe("GitHub Actions CI/CD Intelligence", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearGitHubInspectionCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearGitHubInspectionCache();
    vi.restoreAllMocks();
  });

  it("parses workflow runs accurately on 200 OK", async () => {
    const mockRunsData = {
      total_count: 2,
      workflow_runs: [
        {
          id: 998877,
          name: "CI Build & Test",
          head_branch: "main",
          head_sha: "f1e2d3c4b5a6",
          status: "completed",
          conclusion: "success",
          html_url: "https://github.com/org/repo/actions/runs/998877",
          created_at: "2026-11-15T10:00:00Z",
          updated_at: "2026-11-15T10:04:12Z",
          event: "push",
          actor: { login: "dev-arman" },
        },
        {
          id: 998876,
          name: "Nightly Security Audit",
          head_branch: "main",
          head_sha: "e2d3c4b5a6f1",
          status: "completed",
          conclusion: "failure",
          html_url: "https://github.com/org/repo/actions/runs/998876",
          created_at: "2026-11-14T02:00:00Z",
          updated_at: "2026-11-14T02:08:30Z",
          event: "schedule",
          actor: { login: "github-actions" },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRunsData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchRepositoryWorkflowRuns("https://github.com/org/repo");

    expect(result.available).toBe(true);
    expect(result.totalCount).toBe(2);
    expect(result.runs.length).toBe(2);

    const first = result.runs[0];
    expect(first.id).toBe(998877);
    expect(first.name).toBe("CI Build & Test");
    expect(first.status).toBe("completed");
    expect(first.conclusion).toBe("success");
    expect(first.commitShortSha).toBe("f1e2d3c");
    expect(first.actor).toBe("dev-arman");

    const second = result.runs[1];
    expect(second.conclusion).toBe("failure");
  });

  it("handles 404 cleanly when Actions are disabled or repository is unindexed", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchRepositoryWorkflowRuns(
      "https://github.com/org/no-actions-repo",
    );

    expect(result.available).toBe(false);
    expect(result.totalCount).toBe(0);
    expect(result.runs).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it("handles 403 / 429 rate limit responses properly", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1900000000",
        },
      }),
    );

    const result = await fetchRepositoryWorkflowRuns(
      "https://github.com/org/ratelimited-repo",
    );

    expect(result.available).toBe(false);
    expect(result.rateLimited).toBe(true);
    expect(result.error).toContain("rate limit reached");
  });

  it("rejects invalid repository URLs without network calls", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const result = await fetchRepositoryWorkflowRuns("not-a-valid-url");

    expect(result.available).toBe(false);
    expect(result.error).toContain("Invalid GitHub URL");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
