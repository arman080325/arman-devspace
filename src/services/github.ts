import "server-only";

import type { RepositoryMetadata, VerificationStatus } from "@/types/project";

export interface GitHubInspectionResult {
  verificationStatus: VerificationStatus;
  verifiedRepoUrl: string | null;
  discrepancyNotes: string | null;
  metadata: Omit<RepositoryMetadata, "projectId"> | null;
  rateLimited?: boolean;
  rateLimitResetAt?: string | null;
  error?: string;
}

interface ParsedGitHubTarget {
  owner: string;
  repo: string;
  hasSpaceInUrl: boolean;
  isSubtreePath: boolean;
  hasFragmentAnchor: boolean;
  isLikelyCollection: boolean;
  normalizedRepoUrl: string;
}

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

function classifyActivity(
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

export async function inspectGitHubRepository(
  originalUrl: string,
  overrideUrl?: string,
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
    const repoRes = await fetch(apiBase, {
      headers,
      cache: "no-store",
    });

    const remaining = repoRes.headers.get("x-ratelimit-remaining");
    const resetEpoch = repoRes.headers.get("x-ratelimit-reset");
    const resetIso = resetEpoch
      ? new Date(Number(resetEpoch) * 1000).toISOString()
      : null;

    if ((repoRes.status === 403 || repoRes.status === 429) && remaining === "0") {
      return {
        verificationStatus: "needs-review",
        verifiedRepoUrl: null,
        discrepancyNotes:
          "GitHub API rate limit reached before inspection could complete.",
        metadata: null,
        rateLimited: true,
        rateLimitResetAt: resetIso,
        error: `GitHub API rate limit reached. Resets at ${resetIso ?? "later"}.`,
      };
    }

    if (repoRes.status === 404) {
      return {
        verificationStatus: "unavailable",
        verifiedRepoUrl: null,
        discrepancyNotes: parsed.hasSpaceInUrl
          ? `Supplied URL had whitespace ('${originalUrl}'); even normalized lookup (${parsed.normalizedRepoUrl}) returned 404.`
          : `Repository ${parsed.owner}/${parsed.repo} returned 404 Not Found on GitHub.`,
        metadata: null,
        error: "Repository not found on GitHub (404).",
      };
    }

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
    };

    let hasReadme = false;
    try {
      const readmeRes = await fetch(`${apiBase}/readme`, {
        method: "HEAD",
        headers,
        cache: "no-store",
      });
      hasReadme = readmeRes.ok;
    } catch {
      hasReadme = false;
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

    return {
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
      },
    };
  } catch (err) {
    return {
      verificationStatus: "needs-review",
      verifiedRepoUrl: null,
      discrepancyNotes: "Network error while querying GitHub API.",
      metadata: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
