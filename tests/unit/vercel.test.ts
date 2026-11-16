import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVercelDeployments, isVercelConfigured } from "@/services/vercel";

describe("Vercel Platform Service", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reports unconfigured when VERCEL_TOKEN is absent", async () => {
    delete process.env.VERCEL_TOKEN;

    expect(isVercelConfigured()).toBe(false);

    const result = await fetchVercelDeployments();
    expect(result.configured).toBe(false);
    expect(result.deployments).toEqual([]);
    expect(result.error).toContain("VERCEL_TOKEN missing");
  });

  it("retrieves and parses deployment items accurately on 200 OK", async () => {
    process.env.VERCEL_TOKEN = "test-vercel-token-12345";
    process.env.VERCEL_PROJECT_ID = "prj_test123";

    const mockDeploymentsData = {
      deployments: [
        {
          uid: "dpl_abc123",
          name: "arman-devspace",
          url: "arman-devspace-git-main.vercel.app",
          readyState: "READY",
          created: 1700000000000,
          ready: 1700000045000,
          target: "production",
          inspectorUrl: "https://vercel.com/inspect/dpl_abc123",
          creator: { username: "arman" },
          meta: {
            githubCommitSha: "c1d2e3f4",
            githubCommitMessage: "feat: production deployment",
            githubCommitRef: "main",
            githubCommitAuthorName: "Arman",
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockDeploymentsData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchVercelDeployments();

    expect(result.configured).toBe(true);
    expect(result.deployments.length).toBe(1);
    const first = result.deployments[0];
    expect(first.uid).toBe("dpl_abc123");
    expect(first.url).toBe("https://arman-devspace-git-main.vercel.app");
    expect(first.state).toBe("READY");
    expect(first.target).toBe("production");
    expect(first.meta?.githubCommitSha).toBe("c1d2e3f4");
    expect(first.creator?.username).toBe("arman");
  });

  it("handles 401/403 authorization failures without leaking secrets", async () => {
    process.env.VERCEL_TOKEN = "invalid-token";

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchVercelDeployments();

    expect(result.configured).toBe(true);
    expect(result.deployments).toEqual([]);
    expect(result.error).toContain("Vercel API authentication failed");
    expect(result.error).not.toContain("invalid-token");
  });

  it("handles 429 rate limits gracefully", async () => {
    process.env.VERCEL_TOKEN = "valid-token";

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Too many requests" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchVercelDeployments();

    expect(result.configured).toBe(true);
    expect(result.deployments).toEqual([]);
    expect(result.error).toContain("rate limit exceeded");
  });

  it("handles timeouts gracefully", async () => {
    process.env.VERCEL_TOKEN = "valid-token";

    globalThis.fetch = vi.fn().mockImplementation(() => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      return Promise.reject(abortError);
    });

    const result = await fetchVercelDeployments({ timeoutMs: 50 });

    expect(result.configured).toBe(true);
    expect(result.deployments).toEqual([]);
    expect(result.error).toContain("timed out");
  });
});
