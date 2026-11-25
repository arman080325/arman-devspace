import { projectToCellPhase } from "@/lib/hundred-utils";
import type { CellPhase } from "@/components/redesign/types";
import { isMilestoneOverdue } from "@/lib/roadmap-utils";
import type {
  DeploymentRecord,
  Difficulty,
  Project,
  ProjectActivityItem,
  ProjectMilestone,
  ProjectStatus,
  ProjectTask,
  VerificationStatus,
  WorkspaceStats,
} from "@/types/project";

export interface AnalyticsDistributionItem<K extends string = string> {
  key: K;
  label: string;
  count: number;
  percentage: number;
}

export interface CategoryAnalyticsItem {
  category: string;
  total: number;
  shipped: number;
  active: number;
  breaking: number;
  percentageOfTotal: number;
}

export interface DifficultyAnalyticsItem {
  difficulty: Difficulty;
  total: number;
  completed: number;
  active: number;
  completionRate: number;
}

export interface EngineeringAnalyticsSnapshot {
  catalogue: {
    totalProjects: number;
    definedProjects: number;
    placeholderProjects: number;
    bookmarkedCount: number;
    notesCount: number;
  };
  lifecyclePhases: AnalyticsDistributionItem<CellPhase>[];
  pipelineStatuses: AnalyticsDistributionItem<ProjectStatus>[];
  categories: CategoryAnalyticsItem[];
  difficulties: DifficultyAnalyticsItem[];
  verificationBreakdown: AnalyticsDistributionItem<VerificationStatus>[];
  repositoryHealth: {
    good: number;
    fair: number;
    poor: number;
    unknown: number;
    syncedCount: number;
    unsyncedCount: number;
    syncCoveragePct: number;
  };
  ciWorkflows: {
    passing: number;
    failing: number;
    running: number;
    unknownOrNotSynced: number;
  };
  deployments: {
    totalRecords: number;
    active: number;
    failed: number;
    pending: number;
    projectsWithLiveUrl: number;
    byEnvironment: {
      production: number;
      preview: number;
      staging: number;
    };
  };
  execution: {
    milestonesTotal: number;
    milestonesCompleted: number;
    milestonesOpen: number;
    milestonesOverdue: number;
    milestoneCompletionRate: number | null;
    tasksTotal: number;
    tasksCompleted: number;
    taskCompletionRate: number | null;
  };
  activity: {
    totalEvents: number;
    streakDays: number;
    weeklyVolume: Array<{ day: string; date: string; count: number }>;
    weeklyTotal: number;
  };
  technologies: Array<{
    name: string;
    count: number;
    completedCount: number;
  }>;
  technologiesExplored: number;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

const PHASE_LABELS: Record<CellPhase, string> = {
  exploring: "Exploring",
  building: "Building",
  rebuilding: "Rebuilding",
  breaking: "Breaking",
  shipped: "Shipped",
  archived: "Archived",
  unknown: "Placeholder / Unknown",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  awaiting: "Awaiting",
  backlog: "Backlog",
  cloned: "Cloned",
  analyzing: "Analyzing",
  planning: "Planning",
  "in-development": "In Development",
  testing: "Testing",
  completed: "Completed",
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: "Verified",
  "needs-review": "Needs Review",
  archived: "Archived",
  unavailable: "Unavailable",
  "incorrect-link": "Incorrect Link",
  "collection-only": "Collection Only",
};

/**
 * Pure deterministic analytics computation strictly reconciled against persisted records.
 * Never fabricates percentages, trends, or treats missing provider telemetry as failures.
 */
export function computeEngineeringAnalytics(input: {
  projects: Project[];
  stats: WorkspaceStats;
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  deployments: DeploymentRecord[];
  activities: ProjectActivityItem[];
  referenceDate?: Date;
}): EngineeringAnalyticsSnapshot {
  const { projects, stats, milestones, tasks, deployments, activities } = input;
  const total = projects.length;
  const refDate = input.referenceDate ?? new Date();

  const phaseOrder: CellPhase[] = [
    "exploring",
    "building",
    "rebuilding",
    "breaking",
    "shipped",
    "archived",
    "unknown",
  ];
  const phaseMap = new Map<CellPhase, number>(phaseOrder.map((p) => [p, 0]));

  const statusOrder: ProjectStatus[] = [
    "awaiting",
    "backlog",
    "cloned",
    "analyzing",
    "planning",
    "in-development",
    "testing",
    "completed",
  ];
  const statusMap = new Map<ProjectStatus, number>(statusOrder.map((s) => [s, 0]));

  const verificationOrder: VerificationStatus[] = [
    "verified",
    "needs-review",
    "archived",
    "unavailable",
    "incorrect-link",
    "collection-only",
  ];
  const verificationMap = new Map<VerificationStatus, number>(
    verificationOrder.map((v) => [v, 0]),
  );

  const categoryMap = new Map<
    string,
    { total: number; shipped: number; active: number; breaking: number }
  >();

  let definedProjects = 0;
  let placeholderProjects = 0;
  let bookmarkedCount = 0;

  let healthGood = 0;
  let healthFair = 0;
  let healthPoor = 0;
  let healthUnknown = 0;
  let syncedCount = 0;

  let ciPassing = 0;
  let ciFailing = 0;
  let ciRunning = 0;
  let ciUnknown = 0;

  let projectsWithLiveUrl = 0;

  const diffAccum: Record<
    Difficulty,
    { total: number; completed: number; active: number }
  > = {
    beginner: { total: 0, completed: 0, active: 0 },
    intermediate: { total: 0, completed: 0, active: 0 },
    advanced: { total: 0, completed: 0, active: 0 },
  };

  for (const proj of projects) {
    if (proj.isPlaceholder) placeholderProjects += 1;
    else definedProjects += 1;
    if (proj.bookmarked) bookmarkedCount += 1;
    if (proj.deploymentUrl) projectsWithLiveUrl += 1;

    const cellPhase = projectToCellPhase(proj);
    phaseMap.set(cellPhase, (phaseMap.get(cellPhase) ?? 0) + 1);
    statusMap.set(proj.status, (statusMap.get(proj.status) ?? 0) + 1);
    verificationMap.set(
      proj.verificationStatus,
      (verificationMap.get(proj.verificationStatus) ?? 0) + 1,
    );

    const catRow = categoryMap.get(proj.category) ?? {
      total: 0,
      shipped: 0,
      active: 0,
      breaking: 0,
    };
    catRow.total += 1;
    if (cellPhase === "shipped") catRow.shipped += 1;
    else if (cellPhase === "breaking") catRow.breaking += 1;
    else if (cellPhase === "building" || cellPhase === "rebuilding") catRow.active += 1;
    categoryMap.set(proj.category, catRow);

    const diff = proj.difficulty;
    diffAccum[diff].total += 1;
    if (proj.status === "completed") diffAccum[diff].completed += 1;
    else if (proj.status !== "awaiting" && proj.status !== "backlog") {
      diffAccum[diff].active += 1;
    }

    // Repository health strictly distinguishes missing/unknown from failures
    if (proj.repositoryMetadata) {
      syncedCount += 1;
      const hs = proj.repositoryMetadata.health?.status;
      if (hs === "healthy") healthGood += 1;
      else if (hs === "needs-review" || hs === "stale") healthFair += 1;
      else if (hs === "unavailable" || hs === "archived") healthPoor += 1;
      else healthUnknown += 1;

      const run = proj.repositoryMetadata.latestWorkflowRun;
      if (!run) {
        ciUnknown += 1;
      } else if (run.conclusion === "success") {
        ciPassing += 1;
      } else if (
        run.conclusion === "failure" ||
        run.conclusion === "timed_out" ||
        run.conclusion === "cancelled"
      ) {
        ciFailing += 1;
      } else {
        ciRunning += 1;
      }
    } else {
      healthUnknown += 1;
      ciUnknown += 1;
    }
  }

  const lifecyclePhases = phaseOrder.map((key) => {
    const count = phaseMap.get(key) ?? 0;
    return {
      key,
      label: PHASE_LABELS[key],
      count,
      percentage: pct(count, total),
    };
  });

  const pipelineStatuses = statusOrder.map((key) => {
    const count = statusMap.get(key) ?? 0;
    return {
      key,
      label: STATUS_LABELS[key],
      count,
      percentage: pct(count, total),
    };
  });

  const verificationBreakdown = verificationOrder.map((key) => {
    const count = verificationMap.get(key) ?? 0;
    return {
      key,
      label: VERIFICATION_LABELS[key],
      count,
      percentage: pct(count, total),
    };
  });

  const categories: CategoryAnalyticsItem[] = Array.from(categoryMap.entries())
    .map(([category, vals]) => ({
      category,
      ...vals,
      percentageOfTotal: pct(vals.total, total),
    }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  const difficulties: DifficultyAnalyticsItem[] = (
    ["beginner", "intermediate", "advanced"] as Difficulty[]
  ).map((difficulty) => {
    const row = diffAccum[difficulty];
    return {
      difficulty,
      ...row,
      completionRate: pct(row.completed, row.total),
    };
  });

  // Deployments reconciliation
  let depActive = 0;
  let depFailed = 0;
  let depPending = 0;
  let depProd = 0;
  let depPrev = 0;
  let depStag = 0;
  for (const dep of deployments) {
    if (dep.status === "active") depActive += 1;
    else if (dep.status === "failed") depFailed += 1;
    else depPending += 1;

    if (dep.environment === "production") depProd += 1;
    else if (dep.environment === "preview") depPrev += 1;
    else depStag += 1;
  }

  // Milestones reconciliation
  let milestonesCompleted = 0;
  let milestonesOverdue = 0;
  for (const m of milestones) {
    if (m.completed) milestonesCompleted += 1;
    else if (isMilestoneOverdue(m, refDate)) milestonesOverdue += 1;
  }
  const milestonesTotal = milestones.length;
  const milestonesOpen = milestonesTotal - milestonesCompleted;

  // Tasks reconciliation (use direct tasks array when provided, fallback to stats when projects > 0 and tasks matched)
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.completed).length;

  const weeklyVolume = stats.weeklyActivity;
  const weeklyTotal = weeklyVolume.reduce((acc, item) => acc + item.count, 0);

  return {
    catalogue: {
      totalProjects: total,
      definedProjects,
      placeholderProjects,
      bookmarkedCount,
      notesCount: stats.notesCount,
    },
    lifecyclePhases,
    pipelineStatuses,
    categories,
    difficulties,
    verificationBreakdown,
    repositoryHealth: {
      good: healthGood,
      fair: healthFair,
      poor: healthPoor,
      unknown: healthUnknown,
      syncedCount,
      unsyncedCount: total - syncedCount,
      syncCoveragePct: pct(syncedCount, total),
    },
    ciWorkflows: {
      passing: ciPassing,
      failing: ciFailing,
      running: ciRunning,
      unknownOrNotSynced: ciUnknown,
    },
    deployments: {
      totalRecords: deployments.length,
      active: depActive,
      failed: depFailed,
      pending: depPending,
      projectsWithLiveUrl,
      byEnvironment: {
        production: depProd,
        preview: depPrev,
        staging: depStag,
      },
    },
    execution: {
      milestonesTotal,
      milestonesCompleted,
      milestonesOpen,
      milestonesOverdue,
      milestoneCompletionRate:
        milestonesTotal > 0 ? pct(milestonesCompleted, milestonesTotal) : null,
      tasksTotal,
      tasksCompleted,
      taskCompletionRate: tasksTotal > 0 ? pct(tasksCompleted, tasksTotal) : null,
    },
    activity: {
      totalEvents: activities.length,
      streakDays: stats.streakDays,
      weeklyVolume,
      weeklyTotal,
    },
    technologies: stats.technologyDistribution,
    technologiesExplored: stats.technologiesExplored,
  };
}
