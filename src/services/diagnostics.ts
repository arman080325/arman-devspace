import "server-only";

import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isSafeHttpUrl } from "@/lib/validations";
import { getGitHubRateLimitStatus } from "@/services/github";
import {
  fetchVercelDeployments,
  isVercelConfigured,
  type VercelDeploymentItem,
} from "@/services/vercel";

export type ProviderIntegrationState =
  "connected" | "configured" | "available" | "unavailable" | "error";

export interface DatabaseDiagnostics {
  configured: boolean;
  status: "healthy" | "unhealthy" | "local";
  state: ProviderIntegrationState;
  latencyMs: number | null;
  storageMode: "postgresql" | "local-store";
  host: string | null;
  error?: string;
}

export interface GitHubDiagnostics {
  configured: boolean;
  connectivity: "connected" | "degraded" | "rate-limited" | "unconfigured";
  state: ProviderIntegrationState;
  privateRepoCapable: boolean;
  detail?: string;
  rateLimit: {
    limit: number | null;
    remaining: number | null;
    resetIso: string | null;
  };
}

export interface VercelDiagnostics {
  configured: boolean;
  projectConfigured: boolean;
  teamConfigured: boolean;
  status: "configured" | "not-configured";
  state: ProviderIntegrationState;
  detail?: string;
  error?: string;
  latestDeployments?: Array<{
    uid: string;
    name: string;
    url: string;
    state: string;
    target: string | null;
    created: number;
  }>;
}

export interface SupabaseAuthDiagnostics {
  configured: boolean;
  state: "available" | "unavailable";
  detail: string;
}

export interface SystemDiagnostics {
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  environment: string;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
}

export interface OperationalDiagnostics {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  database: DatabaseDiagnostics;
  github: GitHubDiagnostics;
  vercel: VercelDiagnostics;
  supabaseAuth: SupabaseAuthDiagnostics;
  system: SystemDiagnostics;
}

function toSafeDeployments(items: VercelDeploymentItem[]) {
  return items
    .filter((d) => isSafeHttpUrl(d.url))
    .slice(0, 3)
    .map((d) => ({
      uid: d.uid,
      name: d.name,
      url: d.url,
      state: d.state,
      target: d.target ?? null,
      created: d.created,
    }));
}

export async function getOperationalDiagnostics(options?: {
  probeVercel?: boolean;
}): Promise<OperationalDiagnostics> {
  const dbConfigured = isDatabaseConfigured();
  let dbStatus: "healthy" | "unhealthy" | "local" = dbConfigured ? "healthy" : "local";
  let dbLatencyMs: number | null = null;
  let dbHost: string | null = null;
  let dbError: string | undefined = undefined;

  if (dbConfigured) {
    const prisma = getPrismaClient();
    if (prisma) {
      const start = performance.now();
      try {
        await prisma.$queryRawUnsafe("SELECT 1");
        dbLatencyMs = Math.round(performance.now() - start);
        dbStatus = "healthy";
      } catch (err: unknown) {
        dbStatus = "unhealthy";
        dbError = err instanceof Error ? err.message : "Database check failed";
      }
    }

    try {
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const parsed = new URL(dbUrl);
        dbHost = parsed.host; // Host and port only, zero credentials
      }
    } catch {
      dbHost = null;
    }
  }

  const dbState: ProviderIntegrationState = !dbConfigured
    ? "available"
    : dbStatus === "healthy"
      ? "connected"
      : "error";

  // GitHub connectivity check (token validated dynamically; env var alone does not imply connected)
  const githubToken = process.env.GITHUB_TOKEN?.trim() || "";
  const githubConfigured = Boolean(githubToken);
  const cachedRateLimit = getGitHubRateLimitStatus();
  const rateLimit = {
    limit: cachedRateLimit.limit,
    remaining: cachedRateLimit.remaining,
    resetIso: cachedRateLimit.resetIso,
  };

  let githubConnectivity: GitHubDiagnostics["connectivity"] = githubConfigured
    ? "degraded"
    : "unconfigured";
  let githubState: ProviderIntegrationState = githubConfigured
    ? "configured"
    : "unavailable";
  let privateRepoCapable = false;
  let githubDetail = githubConfigured
    ? "GITHUB_TOKEN configured; checking live GitHub connectivity."
    : "Unauthenticated mode (60 req/hr quota).";

  if (cachedRateLimit.remaining === 0) {
    githubConnectivity = "rate-limited";
    githubState = "error";
    githubDetail = "GitHub API rate limit reached.";
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Armans-Devspace/1.0",
        Accept: "application/vnd.github+json",
      };
      if (githubConfigured) {
        headers.Authorization = `Bearer ${githubToken}`;
      }

      const res = await fetch("https://api.github.com/rate_limit", {
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      const hdrLimit = res.headers.get("x-ratelimit-limit");
      const hdrRemaining = res.headers.get("x-ratelimit-remaining");
      const hdrReset = res.headers.get("x-ratelimit-reset");
      if (hdrLimit) rateLimit.limit = Number(hdrLimit);
      if (hdrRemaining !== null) rateLimit.remaining = Number(hdrRemaining);
      if (hdrReset) rateLimit.resetIso = new Date(Number(hdrReset) * 1000).toISOString();

      if (res.ok) {
        try {
          const json = (await res.json()) as {
            resources?: {
              core?: { limit?: number; remaining?: number; reset?: number };
            };
          };
          if (json.resources?.core) {
            rateLimit.limit = json.resources.core.limit ?? rateLimit.limit;
            rateLimit.remaining = json.resources.core.remaining ?? rateLimit.remaining;
            if (json.resources.core.reset) {
              rateLimit.resetIso = new Date(
                json.resources.core.reset * 1000,
              ).toISOString();
            }
          }
        } catch {
          // Ignore non-JSON body in mocked/edge responses
        }

        const scopesHeader = res.headers.get("x-oauth-scopes") ?? "";
        const scopes = scopesHeader
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        privateRepoCapable = githubConfigured && scopes.includes("repo");

        if (githubConfigured) {
          githubConnectivity = "connected";
          githubState = "connected";
          githubDetail = privateRepoCapable
            ? "Authenticated token active with private repository scope."
            : "Authenticated token active (public repository metadata access).";
        } else {
          githubConnectivity = "unconfigured";
          githubState = "available";
          githubDetail =
            "Public GitHub API available (60 req/hr quota); private repositories require server-side GITHUB_TOKEN.";
        }
      } else if (res.status === 401) {
        githubConnectivity = "degraded";
        githubState = "error";
        githubDetail =
          "Server-configured GITHUB_TOKEN was rejected by GitHub (HTTP 401).";
      } else if (res.status === 403 || res.status === 429) {
        githubConnectivity = "rate-limited";
        githubState = "error";
        githubDetail = `GitHub API returned rate/permission restriction (HTTP ${res.status}).`;
      } else {
        githubConnectivity = "degraded";
        githubState = "error";
        githubDetail = `GitHub API returned HTTP ${res.status}.`;
      }
    } catch {
      clearTimeout(timer);
      githubConnectivity = "degraded";
      githubState = githubConfigured ? "error" : "unavailable";
      githubDetail = githubConfigured
        ? "Unable to reach GitHub API within timeout window."
        : "Public GitHub API unreachable from current runtime.";
    }
  }

  // Vercel check
  const vercelConfigured = isVercelConfigured();
  const vercelProjectConfigured = Boolean(process.env.VERCEL_PROJECT_ID?.trim());
  const vercelTeamConfigured = Boolean(process.env.VERCEL_TEAM_ID?.trim());
  let vercelState: ProviderIntegrationState = vercelConfigured
    ? "configured"
    : "unavailable";
  let vercelDetail = vercelConfigured
    ? "VERCEL_TOKEN is set server-side. Run live verification to test API authentication."
    : "VERCEL_TOKEN is not configured server-side.";
  let vercelError: string | undefined;
  let latestDeployments: VercelDiagnostics["latestDeployments"];

  if (vercelConfigured && options?.probeVercel) {
    const result = await fetchVercelDeployments({ limit: 3, timeoutMs: 4000 });
    if (result.error) {
      vercelState = "error";
      vercelError = result.error;
      vercelDetail = result.error;
    } else {
      vercelState = "connected";
      latestDeployments = toSafeDeployments(result.deployments);
      vercelDetail = `Connected to Vercel REST API (${result.deployments.length} recent deployment records inspected).`;
    }
  }

  // Supabase Auth OAuth availability
  const supabaseOAuthConfigured = isSupabaseConfigured();
  const supabaseAuth: SupabaseAuthDiagnostics = {
    configured: supabaseOAuthConfigured,
    state: supabaseOAuthConfigured ? "available" : "unavailable",
    detail: supabaseOAuthConfigured
      ? "Supabase public OAuth configuration present (Google provider supported via server callback)."
      : "Supabase OAuth environment variables are not configured; using local credentials session.",
  };

  // System stats
  const mem = process.memoryUsage();
  const system: SystemDiagnostics = {
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    },
  };

  const isDegraded =
    dbStatus === "unhealthy" ||
    githubConnectivity === "rate-limited" ||
    githubConnectivity === "degraded" ||
    vercelState === "error";

  return {
    timestamp: new Date().toISOString(),
    status: dbStatus === "unhealthy" ? "unhealthy" : isDegraded ? "degraded" : "healthy",
    database: {
      configured: dbConfigured,
      status: dbStatus,
      state: dbState,
      latencyMs: dbLatencyMs,
      storageMode: dbConfigured ? "postgresql" : "local-store",
      host: dbHost,
      error: dbError,
    },
    github: {
      configured: githubConfigured,
      connectivity: githubConnectivity,
      state: githubState,
      privateRepoCapable,
      detail: githubDetail,
      rateLimit,
    },
    vercel: {
      configured: vercelConfigured,
      projectConfigured: vercelProjectConfigured,
      teamConfigured: vercelTeamConfigured,
      status: vercelConfigured ? "configured" : "not-configured",
      state: vercelState,
      detail: vercelDetail,
      ...(vercelError ? { error: vercelError } : {}),
      ...(latestDeployments ? { latestDeployments } : {}),
    },
    supabaseAuth,
    system,
  };
}
