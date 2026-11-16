import "server-only";

import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { getGitHubRateLimitStatus } from "@/services/github";
import { isVercelConfigured } from "@/services/vercel";

export interface DatabaseDiagnostics {
  configured: boolean;
  status: "healthy" | "unhealthy" | "local";
  latencyMs: number | null;
  storageMode: "postgresql" | "local-store";
  host: string | null;
  error?: string;
}

export interface GitHubDiagnostics {
  configured: boolean;
  connectivity: "connected" | "degraded" | "rate-limited" | "unconfigured";
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
  system: SystemDiagnostics;
}

export async function getOperationalDiagnostics(): Promise<OperationalDiagnostics> {
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

  // GitHub connectivity check
  const githubConfigured = Boolean(process.env.GITHUB_TOKEN?.trim());
  const rateLimitState = getGitHubRateLimitStatus();
  let githubConnectivity: GitHubDiagnostics["connectivity"] = "unconfigured";

  if (rateLimitState.remaining === 0) {
    githubConnectivity = "rate-limited";
  } else {
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Armans-Devspace/1.0",
      };
      if (githubConfigured) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN!.trim()}`;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("https://api.github.com/zen", {
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.ok) {
        githubConnectivity = "connected";
      } else if (res.status === 403 || res.status === 429) {
        githubConnectivity = "rate-limited";
      } else {
        githubConnectivity = "degraded";
      }
    } catch {
      githubConnectivity = "degraded";
    }
  }

  // Vercel check
  const vercelConfigured = isVercelConfigured();
  const vercelProjectConfigured = Boolean(process.env.VERCEL_PROJECT_ID?.trim());
  const vercelTeamConfigured = Boolean(process.env.VERCEL_TEAM_ID?.trim());

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
    githubConnectivity === "degraded";

  return {
    timestamp: new Date().toISOString(),
    status: dbStatus === "unhealthy" ? "unhealthy" : isDegraded ? "degraded" : "healthy",
    database: {
      configured: dbConfigured,
      status: dbStatus,
      latencyMs: dbLatencyMs,
      storageMode: dbConfigured ? "postgresql" : "local-store",
      host: dbHost,
      error: dbError,
    },
    github: {
      configured: githubConfigured,
      connectivity: githubConnectivity,
      rateLimit: {
        limit: rateLimitState.limit,
        remaining: rateLimitState.remaining,
        resetIso: rateLimitState.resetIso,
      },
    },
    vercel: {
      configured: vercelConfigured,
      projectConfigured: vercelProjectConfigured,
      teamConfigured: vercelTeamConfigured,
      status: vercelConfigured ? "configured" : "not-configured",
    },
    system,
  };
}
