import type { Project } from "@/types/project";
import {
  CATEGORIES,
  LOOP_ORDER,
  type CellPhase,
  type DeployState,
  type Health,
  type Phase,
  type SpecPlateProject,
} from "@/components/redesign/types";

export type SortMode = "number" | "phase" | "category" | "activity";

/**
 * Maps a real production Project to a redesign CellPhase strictly derived from real data.
 */
export function projectToCellPhase(p: Project): CellPhase {
  if (p.isPlaceholder) return "unknown";
  if (p.verificationStatus === "archived" || p.repositoryMetadata?.isArchived) {
    return "archived";
  }
  if (
    p.repositoryMetadata?.latestWorkflowRun?.conclusion === "failure" ||
    p.repositoryMetadata?.health?.status === "unavailable"
  ) {
    return "breaking";
  }
  switch (p.status) {
    case "completed":
      return "shipped";
    case "in-development":
    case "testing":
      return "building";
    case "analyzing":
    case "planning":
      return "rebuilding";
    case "awaiting":
    case "backlog":
    case "cloned":
      return "exploring";
    default:
      return "unknown";
  }
}

/**
 * Maps a canonical Project to the SpecPlate schema for rich hover cards and pinned shelf.
 */
export function projectToSpecPlate(p: Project): SpecPlateProject {
  const phase = projectToCellPhase(p);
  const padNum = String(p.number).padStart(3, "0");

  let health: Health = "unknown";
  if (p.repositoryMetadata?.health?.status === "healthy") health = "good";
  else if (
    p.repositoryMetadata?.health?.status === "needs-review" ||
    p.repositoryMetadata?.health?.status === "stale"
  ) {
    health = "fair";
  } else if (p.repositoryMetadata?.health?.status === "unavailable") {
    health = "poor";
  }

  let deploy: DeployState = "none";
  if (p.deploymentUrl) deploy = "ready";
  else if (p.status === "completed") deploy = "ready";
  else if (p.status === "in-development" || p.status === "testing") deploy = "building";

  return {
    num: p.number,
    id: padNum,
    name: p.title,
    slug: p.slug,
    description: p.description,
    category: p.category,
    stack: p.technologies ?? [],
    phase,
    repo: p.verifiedRepoUrl ?? p.originalRepoUrl ?? null,
    health,
    deploy,
    deployUrl: p.deploymentUrl ?? null,
    stars: p.repositoryMetadata?.stars ?? null,
    forks: p.repositoryMetadata?.forks ?? null,
    reason: p.discrepancyNotes ?? (phase === "breaking" ? "Needs attention" : undefined),
    focus: p.status === "in-development" ? "Active implementation" : undefined,
  };
}

/**
 * Counts projects per phase.
 */
export function phaseCounts(
  projects: Project[],
): Record<Phase | "archived" | "unknown", number> {
  const counts: Record<Phase | "archived" | "unknown", number> = {
    exploring: 0,
    building: 0,
    shipped: 0,
    breaking: 0,
    rebuilding: 0,
    archived: 0,
    unknown: 0,
  };
  for (const p of projects) {
    const phase = projectToCellPhase(p);
    counts[phase] = (counts[phase] ?? 0) + 1;
  }
  return counts;
}

/**
 * Sorts project catalogue according to active sort mode.
 */
export function sortProjects(list: Project[], mode: SortMode): Project[] {
  const copy = [...list];
  if (mode === "number") {
    copy.sort((a, b) => a.number - b.number);
  } else if (mode === "phase") {
    copy.sort((a, b) => {
      const pa = projectToCellPhase(a);
      const pb = projectToCellPhase(b);
      const diff = LOOP_ORDER.indexOf(pa as Phase) - LOOP_ORDER.indexOf(pb as Phase);
      return diff !== 0 ? diff : a.number - b.number;
    });
  } else if (mode === "category") {
    copy.sort((a, b) => {
      const ca = CATEGORIES.indexOf(a.category);
      const cb = CATEGORIES.indexOf(b.category);
      const diff = (ca === -1 ? 999 : ca) - (cb === -1 ? 999 : cb);
      return diff !== 0 ? diff : a.number - b.number;
    });
  } else if (mode === "activity") {
    copy.sort((a, b) => {
      const ta = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const tb = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return tb !== ta ? tb - ta : a.number - b.number;
    });
  }
  return copy;
}
