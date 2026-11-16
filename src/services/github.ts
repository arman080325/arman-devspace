import "server-only";

import { saveRepositoryVerification } from "@/services/devspace-store";
import type {
  GitHubWorkflowRun,
  RepositoryHealthSignals,
  RepositoryMetadata,
  VerificationStatus,
} from "@/types/project";

/* ============================================================================
   TYPES & INTERFACES
   ============================================================================ */

export interface GitHubRateLimitState {
  limit: number | null;
  remaining: number | null;
  resetEpoch: number | null;
  resetIso: string | null;
  updatedAt: string | null;
}

export interface GitHubInspectionResult {
  verificationStatus: VerificationStatus;
  verifiedRepoUrl: string | null;
  discrepancyNotes: string | null;
  metadata: Omit<RepositoryMetadata, "projectId"> | null;
  rateLimited?: boolean;
  rateLimitResetAt?: string | null;
  isCached?: boolean;
  error?: string;
}

export interface ParsedGitHubTarget {
  owner: string;
  repo: string;
  hasSpaceInUrl: boolean;
  isSubtreePath: boolean;
  hasFragmentAnchor: boolean;
  isLikelyCollection: boolean;
  normalizedRepoUrl: string;
}

export interface BatchSyncSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  rateLimited: boolean;
  rateLimitResetAt: string | null;
  results: Array<{
    projectId: string;
    status: "succeeded" | "failed" | "skipped";
    verificationStatus?: VerificationStatus;
    verifiedRepoUrl?: string | null;
    error?: string;
  }>;
}

export interface GitHubWorkflowRunsResult {
  available: boolean;
  totalCount: number;
  runs: GitHubWorkflowRun[];
  error?: string;
  rateLimited?: boolean;
}

/* ============================================================================
   IN-MEMORY STATE: RATE LIMIT, CACHE & REQUEST DEDUPLICATION
   ============================================================================ */

let currentRateLimit: GitHubRateLimitState = {
  limit: null,
  remaining: null,
  resetEpoch: null,
  resetIso: null,
  updatedAt: null,
};

interface CacheEntry {
  result: GitHubInspectionResult;
  expiresAt: number;
}

const inspectionCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<GitHubInspectionResult>>();
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getGitHubRateLimitStatus(): GitHubRateLimitState {
  return { ...currentRateLimit };
}

export function clearGitHubInspectionCache(): void {
  inspectionCache.clear();
  inFlightRequests.clear();
  currentRateLimit = {
    limit: null,
    remaining: null,
    resetEpoch: null,
    resetIso: null,
    updatedAt: null,
  };
}

function updateRateLimitFromHeaders(headers: Headers): void {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  if (limit !== null || remaining !== null || reset !== null) {
    const resetEpoch = reset ? Number(reset) : null;
    currentRateLimit = {
      limit: limit ? Number(limit) : null,
      remaining: remaining ? Number(remaining) : null,
      resetEpoch,
      resetIso: resetEpoch ? new Date(resetEpoch * 1000).toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
  }
}

function isKnownRateLimited(): boolean {
  if (
    currentRateLimit.remaining === 0 &&
    currentRateLimit.resetEpoch !== null &&
    currentRateLimit.resetEpoch * 1000 > Date.now()
  ) {
    return true;
  }
  return false;
}

/* ============================================================================
   URL PARSING & NORMALIZATION
   ============================================================================ */

export function parseGitHubRepoUrl(rawUrl: string): ParsedGitHubTarget | null {
  const hasSpaceInUrl = /\s/.test(rawUrl);
  const cleaned = rawUrl.replace(/\s+/g, "");

  try {
    const parsed = new URL(cleaned);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return null;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, "");
    const isSubtreePath = segments.length > 2 && segments[2] === "tree";
    const hasFragmentAnchor = parsed.hash.length > 1;
    const isLikelyCollection =
      repo.toLowerCase().startsWith("awesome-") || repo.toLowerCase() === "realworld";

    return {
      owner,
      repo,
      hasSpaceInUrl,
      isSubtreePath,
      hasFragmentAnchor,
      isLikelyCollection,
      normalizedRepoUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

/* ============================================================================
   HEALTH & ACTIVITY CLASSIFICATION
   ============================================================================ */

export function classifyActivity(
  pushedAt: string | null,
  archived: boolean,
): RepositoryMetadata["activityLevel"] {
  if (archived) return "archived";
  if (!pushedAt) return "unknown";
  const ageDays = (Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 180) return "active";
  if (ageDays <= 540) return "moderate";
  return "stale";
}

export function calculateRepositoryHealth(input: {
  isAvailable: boolean;
  isArchived: boolean;
  pushedAt: string | null;
  hasReadme: boolean;
  license: string | null;
  openIssues: number;
  hasReleases: boolean;
  isCollection: boolean;
}): RepositoryHealthSignals {
  if (!input.isAvailable) {
    return {
      status: "unavailable",
      availability: "unavailable",
      freshness: "unknown",
      daysSincePush: null,
      signals: ["Repository is unreachable or returned 404 from GitHub."],
      scoreFactors: {
        hasReadme: false,
        hasLicense: false,
        isMaintained: false,
        issueCountRange: "low",
      },
    };
  }

  const ageDays = input.pushedAt
    ? Math.round(
        (Date.now() - new Date(input.pushedAt).getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  if (input.isArchived) {
    return {
      status: "archived",
      availability: "archived",
      freshness: "archived",
      daysSincePush: ageDays,
      signals: [
        "Repository is explicitly archived (read-only) by its maintainers.",
        input.hasReadme ? "Documentation README is preserved." : "No README found.",
        input.license ? `Licensed under ${input.license}.` : "No license file detected.",
      ],
      scoreFactors: {
        hasReadme: input.hasReadme,
        hasLicense: Boolean(input.license),
        isMaintained: false,
        issueCountRange:
          input.openIssues > 50 ? "high" : input.openIssues > 10 ? "moderate" : "low",
      },
    };
  }

  let freshness: "active" | "moderate" | "stale" | "unknown" = "unknown";
  if (ageDays !== null) {
    if (ageDays <= 180) freshness = "active";
    else if (ageDays <= 540) freshness = "moderate";
    else freshness = "stale";
  }

  const signals: string[] = [];
  if (freshness === "active") {
    signals.push(`Active codebase: pushed ${ageDays} days ago (< 6 months).`);
  } else if (freshness === "moderate") {
    signals.push(`Moderate activity: pushed ${ageDays} days ago (< 18 months).`);
  } else if (freshness === "stale") {
    signals.push(`Stale codebase: no commits in ${ageDays} days (> 18 months).`);
  } else {
    signals.push("Last commit timestamp unknown.");
  }

  if (input.hasReadme) {
    signals.push("Official README documentation found.");
  } else {
    signals.push("Missing repository README.");
  }

  if (input.license) {
    signals.push(`Open source license: ${input.license}.`);
  } else {
    signals.push("No standardized SPDX license detected.");
  }

  if (input.hasReleases) {
    signals.push("Published versioned releases detected.");
  }

  signals.push(`${input.openIssues} open issues tracked.`);

  let status: RepositoryHealthSignals["status"] = "healthy";
  if (input.isCollection) {
    status = "needs-review";
  } else if (freshness === "stale" && (!input.hasReadme || !input.license)) {
    status = "needs-review";
  } else if (freshness === "stale") {
    status = "stale";
  } else {
    status = "healthy";
  }

  return {
    status,
    availability: "reachable",
    freshness,
    daysSincePush: ageDays,
    signals,
    scoreFactors: {
      hasReadme: input.hasReadme,
      hasLicense: Boolean(input.license),
      isMaintained: freshness === "active" || freshness === "moderate",
      issueCountRange:
        input.openIssues > 50 ? "high" : input.openIssues > 10 ? "moderate" : "low",
    },
  };
}

/* ============================================================================
   HTTP CLIENT WITH TIMEOUT & EXPONENTIAL BACKOFF RETRY
   ============================================================================ */

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs = 8000,
  maxRetries = 2,
): Promise<Response> {
  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      updateRateLimitFromHeaders(response.headers);

      // Retry only transient 5xx server errors on idempotent GET/HEAD
      if (
        (response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt <= maxRetries
      ) {
        const backoffMs =
          Math.min(1000, 200 * Math.pow(2, attempt - 1)) + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort =
        (err instanceof Error && err.name === "AbortError") ||
        (err instanceof Error && err.name === "TimeoutError");
      if (isAbort) {
        throw new Error(`GitHub request timed out after ${timeoutMs}ms.`);
      }

      if (attempt <= maxRetries) {
        const backoffMs =
          Math.min(1000, 200 * Math.pow(2, attempt - 1)) + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

/* ============================================================================
   SINGLE REPOSITORY INSPECTION ENGINE
   ============================================================================ */

export async function inspectGitHubRepository(
  originalUrl: string,
  overrideUrl?: string,
  options?: { forceRefresh?: boolean },
): Promise<GitHubInspectionResult> {
  const targetInput = overrideUrl?.trim() || originalUrl;
  const parsed = parseGitHubRepoUrl(targetInput);

  if (!parsed) {
    return {
      verificationStatus: "incorrect-link",
      verifiedRepoUrl: null,
      discrepancyNotes: "URL is not a valid GitHub owner/repository link.",
      metadata: null,
      error: "Invalid GitHub URL format.",
    };
  }

  const cacheKey = `${parsed.owner}/${parsed.repo}`.toLowerCase();

  // Check TTL cache unless forceRefresh is requested
  if (!options?.forceRefresh) {
    const cached = inspectionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ...cached.result, isCached: true };
    }
  }

  // Deduplicate simultaneous requests for identical target
  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const inspectionPromise = (async (): Promise<GitHubInspectionResult> => {
    // Check if we are already in an active rate-limited state
    if (isKnownRateLimited()) {
      return {
        verificationStatus: "needs-review",
        verifiedRepoUrl: null,
        discrepancyNotes:
          "GitHub API rate limit is currently exhausted. Please try again after the reset epoch.",
        metadata: null,
        rateLimited: true,
        rateLimitResetAt: currentRateLimit.resetIso,
        error: `GitHub API rate limit exhausted. Resets at ${currentRateLimit.resetIso ?? "later"}.`,
      };
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Armans-Devspace/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Never log or expose GITHUB_TOKEN
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const apiBase = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;

    try {
      const repoRes = await fetchWithRetry(apiBase, {
        headers,
        cache: "no-store",
      });

      const remaining = repoRes.headers.get("x-ratelimit-remaining");
      const resetEpoch = repoRes.headers.get("x-ratelimit-reset");
      const resetIso = resetEpoch
        ? new Date(Number(resetEpoch) * 1000).toISOString()
        : null;

      // Rate limit check
      if ((repoRes.status === 403 || repoRes.status === 429) && remaining === "0") {
        return {
          verificationStatus: "needs-review",
          verifiedRepoUrl: null,
          discrepancyNotes:
            "GitHub API rate limit reached before inspection could complete.",
          metadata: null,
          rateLimited: true,
          rateLimitResetAt: resetIso,
          error: `GitHub API rate limit reached. Resets at ${resetIso ?? "later"}. Add GITHUB_TOKEN in .env to raise limit.`,
        };
      }

      // 401 Bad credentials
      if (repoRes.status === 401) {
        return {
          verificationStatus: "needs-review",
          verifiedRepoUrl: null,
          discrepancyNotes:
            "GitHub API returned HTTP 401 Bad Credentials. Configured GITHUB_TOKEN is invalid or expired.",
          metadata: null,
          error: "GitHub API authentication failed (401 Bad credentials).",
        };
      }

      // 404 Not Found / Private without access
      if (repoRes.status === 404) {
        return {
          verificationStatus: "unavailable",
          verifiedRepoUrl: null,
          discrepancyNotes: parsed.hasSpaceInUrl
            ? `Supplied URL had whitespace ('${originalUrl}'); lookup against ${parsed.normalizedRepoUrl} returned 404.`
            : `Repository ${parsed.owner}/${parsed.repo} returned 404 Not Found on GitHub (or private without access).`,
          metadata: null,
          error: "Repository not found on GitHub (404).",
        };
      }

      // Other non-OK status
      if (!repoRes.ok) {
        return {
          verificationStatus: "needs-review",
          verifiedRepoUrl: null,
          discrepancyNotes: `GitHub API returned HTTP ${repoRes.status}.`,
          metadata: null,
          error: `GitHub API error (${repoRes.status}).`,
        };
      }

      const repoData = (await repoRes.json()) as {
        html_url: string;
        name: string;
        owner: { login: string };
        default_branch: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        pushed_at: string | null;
        archived: boolean;
        license: { spdx_id?: string; name?: string } | null;
        topics?: string[];
        homepage?: string | null;
      };

      // Concurrent fetch for README, latest commit, latest release, and latest workflow run
      const [readmeRes, commitRes, releaseRes, runRes] = await Promise.allSettled([
        fetchWithRetry(`${apiBase}/readme`, { method: "HEAD", headers }, 6000, 1),
        fetchWithRetry(
          `${apiBase}/commits?per_page=1`,
          { headers, cache: "no-store" },
          6000,
          1,
        ),
        fetchWithRetry(
          `${apiBase}/releases/latest`,
          { headers, cache: "no-store" },
          6000,
          1,
        ),
        fetchWithRetry(
          `${apiBase}/actions/runs?per_page=1`,
          { headers, cache: "no-store" },
          6000,
          1,
        ),
      ]);

      const hasReadme = readmeRes.status === "fulfilled" && readmeRes.value.ok;

      let latestCommit: RepositoryMetadata["latestCommit"] = null;
      if (commitRes.status === "fulfilled" && commitRes.value.ok) {
        try {
          const commitData = (await commitRes.value.json()) as Array<{
            sha: string;
            html_url: string;
            commit: {
              message: string;
              author: { name: string; date: string } | null;
            };
          }>;
          if (Array.isArray(commitData) && commitData.length > 0) {
            const c = commitData[0];
            const messageFirstLine = (c.commit.message || "")
              .split("\n")[0]
              .trim()
              .slice(0, 120);
            latestCommit = {
              sha: c.sha,
              shortSha: c.sha.slice(0, 7),
              message: messageFirstLine || "Commit",
              authorName: c.commit.author?.name || "Developer",
              date: c.commit.author?.date || new Date().toISOString(),
              url: c.html_url,
            };
          }
        } catch {
          latestCommit = null;
        }
      }

      let latestRelease: RepositoryMetadata["latestRelease"] = null;
      if (releaseRes.status === "fulfilled" && releaseRes.value.ok) {
        try {
          const r = (await releaseRes.value.json()) as {
            name: string | null;
            tag_name: string;
            published_at: string | null;
            html_url: string;
          };
          latestRelease = {
            name: r.name || r.tag_name,
            tagName: r.tag_name,
            publishedAt: r.published_at || new Date().toISOString(),
            url: r.html_url,
          };
        } catch {
          latestRelease = null;
        }
      }

      let latestWorkflowRun: RepositoryMetadata["latestWorkflowRun"] = null;
      if (runRes.status === "fulfilled" && runRes.value.ok) {
        try {
          const runData = (await runRes.value.json()) as {
            workflow_runs?: Array<{
              id: number;
              name: string;
              head_branch: string | null;
              head_sha: string;
              status: string;
              conclusion: string | null;
              html_url: string;
              created_at: string;
              updated_at: string;
              event: string;
              actor: { login: string } | null;
            }>;
          };
          if (Array.isArray(runData.workflow_runs) && runData.workflow_runs.length > 0) {
            const r = runData.workflow_runs[0];
            latestWorkflowRun = {
              id: r.id,
              name: r.name || "CI Workflow",
              status: r.status,
              conclusion: r.conclusion || null,
              branch: r.head_branch || "main",
              commitSha: r.head_sha,
              commitShortSha: (r.head_sha || "").slice(0, 7),
              url: r.html_url,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
              event: r.event,
              actor: r.actor?.login || "github-actions",
            };
          }
        } catch {
          latestWorkflowRun = null;
        }
      }

      const notes: string[] = [];
      if (parsed.hasSpaceInUrl) {
        notes.push(
          `Original URL contained whitespace; verified normalized target ${repoData.html_url}.`,
        );
      }
      if (parsed.isSubtreePath) {
        notes.push(
          "Original URL points to a branch subtree inside a multi-project repository.",
        );
      }
      if (parsed.hasFragmentAnchor || parsed.isLikelyCollection) {
        notes.push(
          "Repository appears to be a curated list or multi-spec collection rather than a single standalone application.",
        );
      }
      if (repoData.archived) {
        notes.push("Repository is marked archived on GitHub.");
      }

      let verificationStatus: VerificationStatus = "verified";
      if (parsed.hasFragmentAnchor || parsed.isLikelyCollection) {
        verificationStatus = "collection-only";
      } else if (repoData.archived) {
        verificationStatus = "archived";
      } else if (parsed.hasSpaceInUrl && !overrideUrl) {
        verificationStatus = "verified";
      }

      const health = calculateRepositoryHealth({
        isAvailable: true,
        isArchived: repoData.archived,
        pushedAt: repoData.pushed_at,
        hasReadme,
        license: repoData.license?.spdx_id ?? repoData.license?.name ?? null,
        openIssues: repoData.open_issues_count,
        hasReleases: Boolean(latestRelease),
        isCollection: parsed.hasFragmentAnchor || parsed.isLikelyCollection,
      });

      const result: GitHubInspectionResult = {
        verificationStatus,
        verifiedRepoUrl: repoData.html_url,
        discrepancyNotes: notes.length > 0 ? notes.join(" ") : null,
        metadata: {
          owner: repoData.owner.login,
          repoName: repoData.name,
          defaultBranch: repoData.default_branch,
          description: repoData.description,
          primaryLanguage: repoData.language,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          openIssues: repoData.open_issues_count,
          lastUpdated: repoData.pushed_at,
          isArchived: repoData.archived,
          hasReadme,
          license: repoData.license?.spdx_id ?? repoData.license?.name ?? null,
          topics: Array.isArray(repoData.topics) ? repoData.topics.slice(0, 10) : [],
          activityLevel: classifyActivity(repoData.pushed_at, repoData.archived),
          verifiedAt: new Date().toISOString(),
          homepageUrl: repoData.homepage?.trim() || null,
          latestCommit,
          latestRelease,
          latestWorkflowRun,
          health,
        },
      };

      // Cache successful response
      inspectionCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS,
      });

      return result;
    } catch (err) {
      return {
        verificationStatus: "needs-review",
        verifiedRepoUrl: null,
        discrepancyNotes: "Network error while querying GitHub API.",
        metadata: null,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  })();

  inFlightRequests.set(cacheKey, inspectionPromise);

  try {
    return await inspectionPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/* ============================================================================
   CONTROLLED BATCH SYNCHRONIZATION ENGINE
   ============================================================================ */

export async function syncRepositoriesBatch(
  items: Array<{
    projectId: string;
    originalRepoUrl: string | null;
    overrideUrl?: string;
  }>,
  userId: string,
  options?: {
    concurrency?: number;
    delayMs?: number;
    forceRefresh?: boolean;
  },
): Promise<BatchSyncSummary> {
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 2, 4));
  const delayMs = Math.max(0, options?.delayMs ?? 200);
  const forceRefresh = Boolean(options?.forceRefresh);

  const summary: BatchSyncSummary = {
    total: items.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    rateLimited: false,
    rateLimitResetAt: null,
    results: [],
  };

  const queue = [...items];

  // Process items in small concurrent chunks with throttled pacing
  while (queue.length > 0) {
    if (summary.rateLimited) {
      // If previous step hit rate limit, mark remaining as skipped
      const skippedItem = queue.shift()!;
      summary.skipped++;
      summary.results.push({
        projectId: skippedItem.projectId,
        status: "skipped",
        error: "Batch halted: GitHub API rate limit reached.",
      });
      continue;
    }

    const chunk = queue.splice(0, concurrency);

    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        const targetUrl = item.overrideUrl?.trim() || item.originalRepoUrl;
        if (!targetUrl) {
          return {
            projectId: item.projectId,
            status: "skipped" as const,
            error: "Reserved slot without source repository URL.",
          };
        }

        const inspection = await inspectGitHubRepository(
          item.originalRepoUrl ?? targetUrl,
          item.overrideUrl,
          { forceRefresh },
        );

        if (inspection.rateLimited) {
          return {
            projectId: item.projectId,
            status: "failed" as const,
            rateLimited: true,
            rateLimitResetAt: inspection.rateLimitResetAt ?? null,
            error: inspection.error ?? "GitHub rate limit reached.",
          };
        }

        // Network or unexpected failure: preserve existing metadata and report failure
        if (inspection.error && !inspection.verifiedRepoUrl && !inspection.metadata) {
          if (inspection.verificationStatus === "needs-review") {
            return {
              projectId: item.projectId,
              status: "failed" as const,
              error: inspection.error,
            };
          }
        }

        // Authoritative resolution (verified, archived, unavailable, collection-only, incorrect-link)
        try {
          await saveRepositoryVerification(userId, item.projectId, {
            verificationStatus: inspection.verificationStatus,
            verifiedRepoUrl: inspection.verifiedRepoUrl,
            discrepancyNotes: inspection.discrepancyNotes,
            metadata: inspection.metadata,
          });

          return {
            projectId: item.projectId,
            status: "succeeded" as const,
            verificationStatus: inspection.verificationStatus,
            verifiedRepoUrl: inspection.verifiedRepoUrl,
          };
        } catch (dbErr) {
          return {
            projectId: item.projectId,
            status: "failed" as const,
            error:
              dbErr instanceof Error
                ? dbErr.message
                : "Failed to persist repository verification.",
          };
        }
      }),
    );

    for (const res of chunkResults) {
      if (res.status === "succeeded") {
        summary.succeeded++;
        summary.results.push({
          projectId: res.projectId,
          status: "succeeded",
          verificationStatus: res.verificationStatus,
          verifiedRepoUrl: res.verifiedRepoUrl,
        });
      } else if (res.status === "skipped") {
        summary.skipped++;
        summary.results.push({
          projectId: res.projectId,
          status: "skipped",
          error: res.error,
        });
      } else {
        summary.failed++;
        if ("rateLimited" in res && res.rateLimited) {
          summary.rateLimited = true;
          summary.rateLimitResetAt = res.rateLimitResetAt ?? null;
        }
        summary.results.push({
          projectId: res.projectId,
          status: "failed",
          error: res.error,
        });
      }
    }

    if (queue.length > 0 && delayMs > 0 && !summary.rateLimited) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return summary;
}

/* ============================================================================
   GITHUB ACTIONS WORKFLOW RUNS INTELLIGENCE
   ============================================================================ */

export async function fetchRepositoryWorkflowRuns(
  originalUrl: string,
  overrideUrl?: string,
  options?: { limit?: number; timeoutMs?: number },
): Promise<GitHubWorkflowRunsResult> {
  const targetInput = overrideUrl?.trim() || originalUrl;
  const parsed = parseGitHubRepoUrl(targetInput);

  if (!parsed) {
    return {
      available: false,
      totalCount: 0,
      runs: [],
      error: "Invalid GitHub URL format.",
    };
  }

  if (isKnownRateLimited()) {
    return {
      available: false,
      totalCount: 0,
      runs: [],
      rateLimited: true,
      error: "GitHub API rate limit exhausted.",
    };
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 5, 20));
  const timeoutMs = options?.timeoutMs ?? 6000;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Armans-Devspace/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const endpoint = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/actions/runs?per_page=${limit}`;

  try {
    const res = await fetchWithRetry(
      endpoint,
      { headers, cache: "no-store" },
      timeoutMs,
      1,
    );

    if (res.status === 404) {
      // Actions disabled, no workflow runs exist, or repository is unindexed
      return {
        available: false,
        totalCount: 0,
        runs: [],
      };
    }

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        return {
          available: false,
          totalCount: 0,
          runs: [],
          rateLimited: true,
          error: "GitHub API rate limit reached.",
        };
      }
      return {
        available: false,
        totalCount: 0,
        runs: [],
        error: `GitHub API forbidden (${res.status}).`,
      };
    }

    if (!res.ok) {
      return {
        available: false,
        totalCount: 0,
        runs: [],
        error: `GitHub Actions API returned HTTP ${res.status}.`,
      };
    }

    const data = (await res.json()) as {
      total_count?: number;
      workflow_runs?: Array<{
        id: number;
        name: string;
        head_branch: string | null;
        head_sha: string;
        status: string;
        conclusion: string | null;
        html_url: string;
        created_at: string;
        updated_at: string;
        event: string;
        actor: { login: string } | null;
      }>;
    };

    const runs: GitHubWorkflowRun[] = (data.workflow_runs || []).map((r) => ({
      id: r.id,
      name: r.name || "CI Workflow",
      status: r.status,
      conclusion: r.conclusion || null,
      branch: r.head_branch || "main",
      commitSha: r.head_sha,
      commitShortSha: (r.head_sha || "").slice(0, 7),
      url: r.html_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      event: r.event,
      actor: r.actor?.login || "github-actions",
    }));

    return {
      available: runs.length > 0,
      totalCount: data.total_count ?? runs.length,
      runs,
    };
  } catch (err: unknown) {
    return {
      available: false,
      totalCount: 0,
      runs: [],
      error: err instanceof Error ? err.message : "Failed to fetch GitHub Actions runs.",
    };
  }
}
