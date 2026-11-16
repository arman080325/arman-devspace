import "server-only";

import { getCanonicalProjectById } from "@/data/projects";
import {
  createActivityRecord,
  getAllProjects,
  getProjectDetail,
  getUserActivities,
  markAllUserActivitiesRead,
  updateActivitySummary,
} from "@/services/devspace-store";
import { fetchRepositoryWorkflowRuns } from "@/services/github";
import { fetchVercelDeployments, isVercelConfigured } from "@/services/vercel";
import type {
  ActivityCategory,
  ActivityEvent,
  ActivityFeedFilters,
  ActivityFeedResult,
  ActivityPayload,
  ActivitySeverity,
  ActivitySourceProvider,
  IngestActivityInput,
  SyncIntelligenceResult,
} from "@/types/activity";
import type { ProjectActivityItem } from "@/types/project";

/* ============================================================================
   SAFETY & SANITIZATION HELPERS
   ============================================================================ */

const SENSITIVE_KEY_REGEX =
  /(token|password|secret|authorization|cookie|key|credential|bearer)/i;

/**
 * Validates action URLs to prevent arbitrary protocol injection, javascript: execution,
 * or SSRF targeting localhost/internal networks.
 */
export function isValidActionUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  // Allow internal links starting with /
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively sanitizes metadata dictionaries to remove tokens, credentials, and passwords.
 */
export function sanitizeMetadata(
  meta: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta) || depth > 4) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      continue;
    }
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value
        .filter(
          (item) =>
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean",
        )
        .slice(0, 20);
    } else if (typeof value === "object") {
      const sanitizedChild = sanitizeMetadata(
        value as Record<string, unknown>,
        depth + 1,
      );
      if (sanitizedChild && Object.keys(sanitizedChild).length > 0) {
        result[key] = sanitizedChild;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/* ============================================================================
   SERIALIZATION & FALLBACK PARSING
   ============================================================================ */

export function inferCategoryFromAction(action?: string): ActivityCategory {
  if (!action) return "workspace";
  if (action.startsWith("ci.") || action.startsWith("workflow.")) return "ci";
  if (action.startsWith("vercel.") || action.startsWith("deployment."))
    return "deployment";
  if (action.startsWith("github.") || action.startsWith("repo.")) return "repository";
  return "workspace";
}

export function inferSeverityFromAction(action?: string): ActivitySeverity {
  if (!action) return "info";
  const lower = action.toLowerCase();
  if (lower.includes("failed") || lower.includes("failure") || lower.includes("error")) {
    return lower.includes("deployment") ? "critical" : "warning";
  }
  if (
    lower.includes("success") ||
    lower.includes("succeeded") ||
    lower.includes("ready") ||
    lower.includes("completed") ||
    lower.includes("verified")
  ) {
    return "success";
  }
  if (
    lower.includes("warn") ||
    lower.includes("archived") ||
    lower.includes("unavailable")
  ) {
    return "warning";
  }
  return "info";
}

export function inferProviderFromAction(action?: string): ActivitySourceProvider {
  if (!action) return "workspace";
  if (action.startsWith("github.") || action.startsWith("ci.")) return "github";
  if (action.startsWith("vercel.") || action.startsWith("deployment.")) return "vercel";
  return "workspace";
}

export function inferTitleFromAction(action?: string, rawSummary?: string): string {
  switch (action) {
    case "github.verified":
      return "Repository Verified";
    case "progress.updated":
      return "Workspace Progress Updated";
    case "milestone.created":
      return "Milestone Created";
    case "milestone.completed":
      return "Milestone Completed";
    case "task.created":
      return "Task Created";
    case "note.created":
      return "Engineering Note Created";
    case "ci.workflow_run.succeeded":
      return "CI Workflow Run Succeeded";
    case "ci.workflow_run.failed":
      return "CI Workflow Run Failed";
    case "vercel.deployment.ready":
      return "Vercel Deployment Ready";
    case "vercel.deployment.failed":
      return "Vercel Deployment Failed";
    default:
      if (rawSummary && rawSummary.length > 0 && !rawSummary.startsWith("{")) {
        return rawSummary.slice(0, 60);
      }
      return "Workspace Event";
  }
}

export function serializeActivityPayload(payload: ActivityPayload): string {
  return JSON.stringify(payload);
}

export function parseActivityPayload(
  rawSummary: string,
  rawAction?: string,
): ActivityPayload {
  if (rawSummary.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawSummary);
      if (parsed && typeof parsed.title === "string") {
        return {
          title: parsed.title,
          description: typeof parsed.description === "string" ? parsed.description : "",
          category: parsed.category ?? inferCategoryFromAction(rawAction),
          severity: parsed.severity ?? inferSeverityFromAction(rawAction),
          sourceProvider: parsed.sourceProvider ?? inferProviderFromAction(rawAction),
          externalId: parsed.externalId ?? null,
          dedupKey: typeof parsed.dedupKey === "string" ? parsed.dedupKey : "",
          actionUrl: isValidActionUrl(parsed.actionUrl) ? parsed.actionUrl : null,
          isRead: Boolean(parsed.isRead),
          readAt: typeof parsed.readAt === "string" ? parsed.readAt : null,
          metadata: sanitizeMetadata(parsed.metadata),
        };
      }
    } catch {
      // Fall through to plain text parsing
    }
  }

  return {
    title: inferTitleFromAction(rawAction, rawSummary),
    description: rawSummary,
    category: inferCategoryFromAction(rawAction),
    severity: inferSeverityFromAction(rawAction),
    sourceProvider: inferProviderFromAction(rawAction),
    externalId: null,
    dedupKey: "",
    actionUrl: null,
    isRead: false,
    readAt: null,
    metadata: null,
  };
}

function toActivityEvent(
  item: ProjectActivityItem & {
    projectTitle?: string;
    projectSlug?: string;
    projectNumber?: number;
  },
): ActivityEvent {
  const payload = parseActivityPayload(item.summary, item.action);
  const proj = getCanonicalProjectById(item.projectId);

  return {
    id: item.id,
    userId: item.userId,
    projectId: item.projectId,
    projectTitle: item.projectTitle ?? proj?.title ?? "Unknown Project",
    projectSlug: item.projectSlug ?? proj?.slug ?? item.projectId,
    projectNumber: item.projectNumber ?? proj?.number ?? 0,
    category: payload.category,
    type: item.action,
    severity: payload.severity,
    title: payload.title,
    description: payload.description,
    sourceProvider: payload.sourceProvider,
    externalId: payload.externalId,
    dedupKey: payload.dedupKey,
    actionUrl: payload.actionUrl,
    isRead: payload.isRead,
    readAt: payload.readAt,
    metadata: payload.metadata,
    createdAt: item.createdAt,
  };
}

/* ============================================================================
   EVENT INGESTION & DEDUPLICATION SERVICE
   ============================================================================ */

/**
 * Ingests an activity event with validation and deduplication.
 * Returns { created: true, event } if new, or { created: false, event } if duplicate.
 */
export async function ingestActivityEvent(
  input: IngestActivityInput,
): Promise<{ created: boolean; event: ActivityEvent }> {
  if (!input.userId || typeof input.userId !== "string") {
    throw new Error("Activity event requires a valid userId.");
  }
  if (!input.projectId || typeof input.projectId !== "string") {
    throw new Error("Activity event requires a valid projectId.");
  }
  if (!input.title || typeof input.title !== "string") {
    throw new Error("Activity event requires a valid title.");
  }

  // Action URL validation
  const safeActionUrl = isValidActionUrl(input.actionUrl) ? input.actionUrl : null;
  const safeMetadata = sanitizeMetadata(input.metadata);
  const dedupKey = (input.dedupKey || `${input.type}:${input.projectId}`).trim();

  // Deduplication check: inspect existing activities for this user
  const userActivities = await getUserActivities(input.userId);
  const existingItem = userActivities.find((act) => {
    const payload = parseActivityPayload(act.summary, act.action);
    return payload.dedupKey === dedupKey;
  });

  if (existingItem) {
    return {
      created: false,
      event: toActivityEvent(existingItem),
    };
  }

  const payload: ActivityPayload = {
    title: input.title.trim().slice(0, 140),
    description: (input.description || "").trim().slice(0, 600),
    category: input.category,
    severity: input.severity,
    sourceProvider: input.sourceProvider,
    externalId: input.externalId ?? null,
    dedupKey,
    actionUrl: safeActionUrl,
    isRead: false,
    readAt: null,
    metadata: safeMetadata,
  };

  const serialized = serializeActivityPayload(payload);
  const rawRecord = await createActivityRecord({
    userId: input.userId,
    projectId: input.projectId,
    action: input.type,
    summary: serialized,
    createdAt: input.createdAt,
  });

  const proj = getCanonicalProjectById(input.projectId);
  const createdEvent = toActivityEvent({
    ...rawRecord,
    projectTitle: proj?.title,
    projectSlug: proj?.slug,
    projectNumber: proj?.number,
  });

  return {
    created: true,
    event: createdEvent,
  };
}

/* ============================================================================
   FEED QUERIES & FILTERING
   ============================================================================ */

export async function getActivityFeed(
  userId: string,
  filters: ActivityFeedFilters = {},
): Promise<ActivityFeedResult> {
  const rawActivities = await getUserActivities(userId);
  const allEvents = rawActivities.map(toActivityEvent);

  const unreadCount = allEvents.filter((e) => !e.isRead).length;

  let filtered = allEvents;

  if (filters.category && filters.category !== "all") {
    filtered = filtered.filter((e) => e.category === filters.category);
  }

  if (filters.severity && filters.severity !== "all") {
    filtered = filtered.filter((e) => e.severity === filters.severity);
  }

  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((e) =>
      filters.status === "unread" ? !e.isRead : e.isRead,
    );
  }

  if (filters.projectSlugOrId) {
    const target = filters.projectSlugOrId.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.projectId.toLowerCase() === target || e.projectSlug.toLowerCase() === target,
    );
  }

  if (filters.search) {
    const query = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.projectTitle.toLowerCase().includes(query),
    );
  }

  // Sort descending by createdAt
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedEvents = filtered.slice((page - 1) * limit, page * limit);

  return {
    events: paginatedEvents,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    unreadCount,
  };
}

export async function getUnreadActivityCount(userId: string): Promise<number> {
  const raw = await getUserActivities(userId);
  return raw.reduce((acc, curr) => {
    const payload = parseActivityPayload(curr.summary, curr.action);
    return payload.isRead ? acc : acc + 1;
  }, 0);
}

/* ============================================================================
   MUTATIONS (READ / UNREAD)
   ============================================================================ */

export async function markActivityAsRead(
  userId: string,
  activityId: string,
  isRead = true,
): Promise<ActivityEvent | null> {
  const rawActivities = await getUserActivities(userId);
  const target = rawActivities.find((a) => a.id === activityId && a.userId === userId);

  if (!target) {
    return null;
  }

  const payload = parseActivityPayload(target.summary, target.action);
  payload.isRead = isRead;
  payload.readAt = isRead ? new Date().toISOString() : null;

  const nextSummary = serializeActivityPayload(payload);
  const updatedRecord = await updateActivitySummary(userId, activityId, nextSummary);

  if (!updatedRecord) {
    return null;
  }

  return toActivityEvent({
    ...updatedRecord,
    projectTitle: target.projectTitle,
    projectSlug: target.projectSlug,
    projectNumber: target.projectNumber,
  });
}

export async function markAllActivitiesAsRead(
  userId: string,
): Promise<{ count: number }> {
  const now = new Date().toISOString();
  const count = await markAllUserActivitiesRead(userId, (rawSummary) => {
    const payload = parseActivityPayload(rawSummary);
    if (payload.isRead) {
      return null; // already read, no update needed
    }
    payload.isRead = true;
    payload.readAt = now;
    return serializeActivityPayload(payload);
  });

  return { count };
}

/* ============================================================================
   INTELLIGENCE SYNCHRONIZATION
   ============================================================================ */

export async function syncProjectActivityIntelligence(
  userId: string,
  projectSlug?: string,
): Promise<SyncIntelligenceResult> {
  let projectsToCheck: Array<{
    id: string;
    slug: string;
    title: string;
    verifiedRepoUrl: string | null;
    originalRepoUrl: string | null;
    isArchived?: boolean;
    latestReleaseTag?: string | null;
  }> = [];

  if (projectSlug) {
    const detail = await getProjectDetail(projectSlug, userId);
    if (detail) {
      projectsToCheck = [
        {
          id: detail.project.id,
          slug: detail.project.slug,
          title: detail.project.title,
          verifiedRepoUrl: detail.project.verifiedRepoUrl,
          originalRepoUrl: detail.project.originalRepoUrl,
          isArchived: detail.project.repositoryMetadata?.isArchived,
          latestReleaseTag: detail.project.repositoryMetadata?.latestRelease?.tagName,
        },
      ];
    }
  } else {
    const all = await getAllProjects(userId);
    // Sync active projects or top projects (bounded to 10 to avoid rate limits)
    projectsToCheck = all
      .filter((p) => p.status !== "awaiting" || p.repositoryMetadata !== null)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        verifiedRepoUrl: p.verifiedRepoUrl,
        originalRepoUrl: p.originalRepoUrl,
        isArchived: p.repositoryMetadata?.isArchived,
        latestReleaseTag: p.repositoryMetadata?.latestRelease?.tagName,
      }));

    if (projectsToCheck.length === 0) {
      projectsToCheck = all.slice(0, 5).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        verifiedRepoUrl: p.verifiedRepoUrl,
        originalRepoUrl: p.originalRepoUrl,
        isArchived: p.repositoryMetadata?.isArchived,
        latestReleaseTag: p.repositoryMetadata?.latestRelease?.tagName,
      }));
    }
  }

  let newEventsCount = 0;
  let ciEventsCount = 0;
  let releaseEventsCount = 0;
  let healthEventsCount = 0;
  let vercelEventsCount = 0;

  for (const proj of projectsToCheck) {
    const repoUrl = proj.verifiedRepoUrl || proj.originalRepoUrl;
    if (repoUrl) {
      try {
        const wfResult = await fetchRepositoryWorkflowRuns(repoUrl, undefined, {
          limit: 3,
        });
        if (wfResult.available && wfResult.runs.length > 0) {
          const latestRun = wfResult.runs[0];
          let severity: ActivitySeverity = "info";
          let actionType = "ci.workflow_run.running";

          if (latestRun.conclusion === "success") {
            severity = "success";
            actionType = "ci.workflow_run.succeeded";
          } else if (
            latestRun.conclusion === "failure" ||
            latestRun.conclusion === "timed_out"
          ) {
            severity = "warning";
            actionType = "ci.workflow_run.failed";
          }

          const res = await ingestActivityEvent({
            userId,
            projectId: proj.id,
            category: "ci",
            type: actionType,
            severity,
            title: `CI Workflow "${latestRun.name}" ${latestRun.conclusion || latestRun.status}`,
            description: `Run #${latestRun.id} for commit ${latestRun.commitShortSha} on branch ${latestRun.branch}.`,
            sourceProvider: "github",
            externalId: String(latestRun.id),
            dedupKey: `github:run:${latestRun.id}:${latestRun.conclusion || latestRun.status}`,
            actionUrl: latestRun.url,
            metadata: {
              runId: latestRun.id,
              workflowName: latestRun.name,
              branch: latestRun.branch,
              conclusion: latestRun.conclusion,
            },
          });

          if (res.created) {
            newEventsCount++;
            ciEventsCount++;
          }
        }
      } catch {
        // Non-blocking GitHub rate limits or connection errors
      }

      if (proj.isArchived) {
        const res = await ingestActivityEvent({
          userId,
          projectId: proj.id,
          category: "repository",
          type: "repository.archived",
          severity: "warning",
          title: `Repository Archived: ${proj.title}`,
          description: `The GitHub repository for ${proj.title} has been archived.`,
          sourceProvider: "github",
          dedupKey: `repo:archived:${proj.id}`,
          actionUrl: repoUrl,
        });
        if (res.created) {
          newEventsCount++;
          healthEventsCount++;
        }
      }

      if (proj.latestReleaseTag) {
        const res = await ingestActivityEvent({
          userId,
          projectId: proj.id,
          category: "repository",
          type: "github.release.detected",
          severity: "info",
          title: `Release ${proj.latestReleaseTag} Detected: ${proj.title}`,
          description: `A repository release was indexed for ${proj.title}.`,
          sourceProvider: "github",
          dedupKey: `github:release:${proj.id}:${proj.latestReleaseTag}`,
          actionUrl: repoUrl,
        });
        if (res.created) {
          newEventsCount++;
          releaseEventsCount++;
        }
      }
    }
  }

  // Vercel deployment check
  if (isVercelConfigured()) {
    try {
      const vResult = await fetchVercelDeployments({ limit: 8 });
      if (vResult.configured && vResult.deployments.length > 0) {
        for (const dep of vResult.deployments) {
          // Attempt to match deployment to a project by slug/title
          const matchedProj =
            projectsToCheck.find(
              (p) =>
                dep.name.toLowerCase().includes(p.slug.toLowerCase()) ||
                p.slug.toLowerCase().includes(dep.name.toLowerCase()),
            ) || projectsToCheck[0];

          if (matchedProj) {
            let severity: ActivitySeverity = "info";
            let type = "vercel.deployment.ready";
            if (dep.state === "READY") {
              severity = "success";
              type = "vercel.deployment.ready";
            } else if (dep.state === "ERROR") {
              severity = "critical";
              type = "vercel.deployment.failed";
            } else if (dep.state === "CANCELED") {
              severity = "warning";
              type = "vercel.deployment.canceled";
            }

            const res = await ingestActivityEvent({
              userId,
              projectId: matchedProj.id,
              category: "deployment",
              type,
              severity,
              title: `Vercel Deployment ${dep.state.toLowerCase()}: ${dep.name}`,
              description: `Deployment to ${dep.url} is ${dep.state.toLowerCase()}.`,
              sourceProvider: "vercel",
              externalId: dep.uid,
              dedupKey: `vercel:deploy:${dep.uid}:${dep.state}`,
              actionUrl: dep.inspectorUrl || `https://${dep.url}`,
              metadata: {
                uid: dep.uid,
                state: dep.state,
                url: dep.url,
              },
            });

            if (res.created) {
              newEventsCount++;
              vercelEventsCount++;
            }
          }
        }
      }
    } catch {
      // Non-blocking Vercel errors
    }
  }

  const feed = await getActivityFeed(userId, { limit: 1 });

  return {
    synced: true,
    projectsChecked: projectsToCheck.length,
    newEventsCount,
    totalEventsCount: feed.pagination.total,
    unreadCount: feed.unreadCount,
    details: {
      githubActionsEvents: ciEventsCount,
      vercelEvents: vercelEventsCount,
      releaseEvents: releaseEventsCount,
      healthEvents: healthEventsCount,
    },
  };
}
