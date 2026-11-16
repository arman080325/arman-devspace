import "server-only";

/* ============================================================================
   VERCEL PLATFORM API CLIENT & INTELLIGENCE
   ============================================================================ */

export type VercelDeploymentState =
  "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";

export interface VercelDeploymentItem {
  uid: string;
  name: string;
  url: string;
  state: VercelDeploymentState;
  created: number;
  ready?: number;
  target?: "production" | "staging" | "preview" | null;
  inspectorUrl?: string | null;
  creator?: {
    username: string;
  };
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitAuthorName?: string;
  };
}

export interface VercelDeploymentsResult {
  configured: boolean;
  deployments: VercelDeploymentItem[];
  error?: string;
}

export function isVercelConfigured(): boolean {
  const token = process.env.VERCEL_TOKEN?.trim();
  return Boolean(token && token.length > 0);
}

export async function fetchVercelDeployments(options?: {
  projectId?: string;
  limit?: number;
  timeoutMs?: number;
}): Promise<VercelDeploymentsResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    return {
      configured: false,
      deployments: [],
      error: "Vercel integration is not configured (VERCEL_TOKEN missing).",
    };
  }

  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const projectId = options?.projectId || process.env.VERCEL_PROJECT_ID?.trim();
  const limit = Math.max(1, Math.min(options?.limit ?? 10, 50));
  const timeoutMs = options?.timeoutMs ?? 8000;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (projectId) params.set("projectId", projectId);
  if (teamId) params.set("teamId", teamId);

  const endpoint = `https://api.vercel.com/v6/deployments?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    if (response.status === 401 || response.status === 403) {
      return {
        configured: true,
        deployments: [],
        error:
          "Vercel API authentication failed (HTTP " +
          response.status +
          "). Check your VERCEL_TOKEN.",
      };
    }

    if (response.status === 404) {
      return {
        configured: true,
        deployments: [],
        error: "Vercel project not found (404).",
      };
    }

    if (response.status === 429) {
      return {
        configured: true,
        deployments: [],
        error: "Vercel API rate limit exceeded. Please try again later.",
      };
    }

    if (!response.ok) {
      return {
        configured: true,
        deployments: [],
        error: `Vercel API returned HTTP ${response.status}.`,
      };
    }

    const data = (await response.json()) as {
      deployments?: Array<{
        uid: string;
        name: string;
        url: string;
        state?: VercelDeploymentState;
        readyState?: VercelDeploymentState;
        created: number;
        ready?: number;
        target?: "production" | "staging" | "preview" | null;
        inspectorUrl?: string | null;
        creator?: { username: string };
        meta?: Record<string, string>;
      }>;
    };

    const deployments: VercelDeploymentItem[] = (data.deployments || []).map((d) => ({
      uid: d.uid,
      name: d.name,
      url: d.url.startsWith("http") ? d.url : `https://${d.url}`,
      state: d.readyState || d.state || "READY",
      created: d.created,
      ready: d.ready,
      target: d.target,
      inspectorUrl: d.inspectorUrl || null,
      creator: d.creator ? { username: d.creator.username } : undefined,
      meta: d.meta
        ? {
            githubCommitSha: d.meta.githubCommitSha,
            githubCommitMessage: d.meta.githubCommitMessage,
            githubCommitRef: d.meta.githubCommitRef,
            githubCommitAuthorName: d.meta.githubCommitAuthorName,
          }
        : undefined,
    }));

    return {
      configured: true,
      deployments,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout =
      (err instanceof Error && err.name === "AbortError") ||
      (err instanceof Error && err.name === "TimeoutError");
    return {
      configured: true,
      deployments: [],
      error: isTimeout
        ? `Vercel request timed out after ${timeoutMs}ms.`
        : err instanceof Error
          ? err.message
          : "Failed to connect to Vercel API.",
    };
  }
}
