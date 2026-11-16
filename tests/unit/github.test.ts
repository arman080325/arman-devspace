import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateRepositoryHealth,
  classifyActivity,
  clearGitHubInspectionCache,
  getGitHubRateLimitStatus,
  inspectGitHubRepository,
  parseGitHubRepoUrl,
} from "@/services/github";

describe("GitHub URL parser", () => {
  it("parses standard owner/repo URLs cleanly", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/DarkSoul26/bookstore-mern");
    expect(parsed).toEqual({
      owner: "DarkSoul26",
      repo: "bookstore-mern",
      hasSpaceInUrl: false,
      isSubtreePath: false,
      hasFragmentAnchor: false,
      isLikelyCollection: false,
      normalizedRepoUrl: "https://github.com/DarkSoul26/bookstore-mern",
    });
  });

  it("flags whitespace anomalies like projects #28 and #49 while normalizing", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/example/task- app");
    expect(parsed?.hasSpaceInUrl).toBe(true);
    expect(parsed?.normalizedRepoUrl).toBe("https://github.com/example/task-app");
  });

  it("detects /tree/<branch> subtree URLs and collection repos", () => {
    const subtree = parseGitHubRepoUrl("https://github.com/safak/youtube/tree/quiz-app");
    expect(subtree?.isSubtreePath).toBe(true);
    expect(subtree?.normalizedRepoUrl).toBe("https://github.com/safak/youtube");

    const collection = parseGitHubRepoUrl(
      "https://github.com/enaqx/awesome-react#finance",
    );
    expect(collection?.isLikelyCollection).toBe(true);
    expect(collection?.hasFragmentAnchor).toBe(true);
  });

  it("strips .git extensions cleanly", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/owner/my-repo.git");
    expect(parsed?.repo).toBe("my-repo");
    expect(parsed?.normalizedRepoUrl).toBe("https://github.com/owner/my-repo");
  });

  it("rejects non-GitHub or incomplete URLs", () => {
    expect(parseGitHubRepoUrl("https://gitlab.com/user/repo")).toBeNull();
    expect(parseGitHubRepoUrl("https://github.com/only-owner")).toBeNull();
    expect(parseGitHubRepoUrl("not a url")).toBeNull();
  });
});

describe("GitHub Activity and Health Classification", () => {
  it("classifies activity by pushed_at date", () => {
    const now = Date.now();
    const daysAgo = (days: number) =>
      new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

    expect(classifyActivity(daysAgo(30), false)).toBe("active");
    expect(classifyActivity(daysAgo(300), false)).toBe("moderate");
    expect(classifyActivity(daysAgo(600), false)).toBe("stale");
    expect(classifyActivity(daysAgo(10), true)).toBe("archived");
    expect(classifyActivity(null, false)).toBe("unknown");
  });

  it("computes transparent health signals accurately", () => {
    const daysAgo = (days: number) =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const healthy = calculateRepositoryHealth({
      isAvailable: true,
      isArchived: false,
      pushedAt: daysAgo(20),
      hasReadme: true,
      license: "MIT",
      openIssues: 5,
      hasReleases: true,
      isCollection: false,
    });
    expect(healthy.status).toBe("healthy");
    expect(healthy.freshness).toBe("active");
    expect(healthy.scoreFactors?.hasReadme).toBe(true);
    expect(healthy.scoreFactors?.hasLicense).toBe(true);

    const archived = calculateRepositoryHealth({
      isAvailable: true,
      isArchived: true,
      pushedAt: daysAgo(500),
      hasReadme: true,
      license: "Apache-2.0",
      openIssues: 0,
      hasReleases: false,
      isCollection: false,
    });
    expect(archived.status).toBe("archived");
    expect(archived.freshness).toBe("archived");

    const unavailable = calculateRepositoryHealth({
      isAvailable: false,
      isArchived: false,
      pushedAt: null,
      hasReadme: false,
      license: null,
      openIssues: 0,
      hasReleases: false,
      isCollection: false,
    });
    expect(unavailable.status).toBe("unavailable");
  });
});

describe("GitHub Repository Inspector & API Client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearGitHubInspectionCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearGitHubInspectionCache();
    vi.restoreAllMocks();
  });

  it("returns full intelligence on 200 OK responses with commit and release", async () => {
    const mockRepoData = {
      html_url: "https://github.com/octocat/Hello-World",
      name: "Hello-World",
      owner: { login: "octocat" },
      default_branch: "main",
      description: "My first repository",
      language: "TypeScript",
      stargazers_count: 1500,
      forks_count: 320,
      open_issues_count: 12,
      pushed_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      archived: false,
      license: { spdx_id: "MIT", name: "MIT License" },
      topics: ["nextjs", "typescript"],
      homepage: "https://example.com",
    };

    const mockCommitData = [
      {
        sha: "a1b2c3d4e5f67890",
        html_url: "https://github.com/octocat/Hello-World/commit/a1b2c3d",
        commit: {
          message: "feat: add initial setup\n\nDetailed body here",
          author: { name: "Octo Cat", date: "2026-11-15T10:00:00Z" },
        },
      },
    ];

    const mockReleaseData = {
      name: "Version 1.0.0",
      tag_name: "v1.0.0",
      published_at: "2026-11-10T08:00:00Z",
      html_url: "https://github.com/octocat/Hello-World/releases/tag/v1.0.0",
    };

    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/readme")) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      if (url.includes("/commits")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockCommitData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.includes("/releases/latest")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockReleaseData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(mockRepoData), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-ratelimit-remaining": "4950",
            "x-ratelimit-reset": "1900000000",
          },
        }),
      );
    });

    const result = await inspectGitHubRepository(
      "https://github.com/octocat/Hello-World",
    );

    expect(result.verificationStatus).toBe("verified");
    expect(result.verifiedRepoUrl).toBe("https://github.com/octocat/Hello-World");
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.stars).toBe(1500);
    expect(result.metadata?.primaryLanguage).toBe("TypeScript");
    expect(result.metadata?.hasReadme).toBe(true);
    expect(result.metadata?.latestCommit?.shortSha).toBe("a1b2c3d");
    expect(result.metadata?.latestCommit?.message).toBe("feat: add initial setup");
    expect(result.metadata?.latestRelease?.tagName).toBe("v1.0.0");
    expect(result.metadata?.health?.status).toBe("healthy");
  });

  it("handles 404 unavailable repositories cleanly", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await inspectGitHubRepository(
      "https://github.com/nonexistent-org/missing-repo",
    );

    expect(result.verificationStatus).toBe("unavailable");
    expect(result.verifiedRepoUrl).toBeNull();
    expect(result.metadata).toBeNull();
    expect(result.error).toContain("404");
  });

  it("handles 403 / 429 rate limits and tracks reset timestamp", async () => {
    const resetTimeEpoch = Math.floor(Date.now() / 1000) + 1800;
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

    const result = await inspectGitHubRepository("https://github.com/owner/ratelimited");

    expect(result.rateLimited).toBe(true);
    expect(result.error).toContain("rate limit reached");
    expect(result.rateLimitResetAt).toBe(new Date(resetTimeEpoch * 1000).toISOString());

    const status = getGitHubRateLimitStatus();
    expect(status.remaining).toBe(0);
    expect(status.resetEpoch).toBe(resetTimeEpoch);
  });

  it("handles 401 Bad Credentials without leaking secrets", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Bad credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await inspectGitHubRepository("https://github.com/owner/repo");

    expect(result.verificationStatus).toBe("needs-review");
    expect(result.error).toContain("401");
    expect(result.discrepancyNotes).toContain("401 Bad Credentials");
  });

  it("caches successful inspections and skips duplicate network calls", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      callCount++;
      const url = String(input);
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
            html_url: "https://github.com/cached/repo",
            name: "repo",
            owner: { login: "cached" },
            default_branch: "main",
            stargazers_count: 50,
            forks_count: 10,
            open_issues_count: 2,
            pushed_at: new Date().toISOString(),
            archived: false,
            license: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });

    const first = await inspectGitHubRepository("https://github.com/cached/repo");
    expect(first.isCached).toBeUndefined();
    const callsAfterFirst = callCount;

    // Second call should hit in-memory cache
    const second = await inspectGitHubRepository("https://github.com/cached/repo");
    expect(second.isCached).toBe(true);
    expect(callCount).toBe(callsAfterFirst); // No new network calls made

    // Force refresh bypasses cache
    const third = await inspectGitHubRepository(
      "https://github.com/cached/repo",
      undefined,
      {
        forceRefresh: true,
      },
    );
    expect(third.isCached).toBeUndefined();
    expect(callCount).toBeGreaterThan(callsAfterFirst);
  });
});
