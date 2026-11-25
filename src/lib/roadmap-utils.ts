import { projectToCellPhase } from "@/components/redesign/Hundred";
import type { CellPhase } from "@/components/redesign/types";
import type {
  Project,
  ProjectMilestone,
  ProjectRoadmapItem,
  ProjectTask,
} from "@/types/project";

export type DueBucket = "overdue" | "next-14-days" | "later" | "undated" | "completed";

export interface GlobalMilestoneItem extends ProjectMilestone {
  projectNumber: number;
  projectTitle: string;
  projectSlug: string;
  projectPhase: CellPhase;
  isOverdue: boolean;
  daysUntilDue: number | null;
  dueBucket: DueBucket;
}

export interface ProjectRoadmapBundle {
  project: Project;
  phase: CellPhase;
  milestones: GlobalMilestoneItem[];
  tasks: ProjectTask[];
  persistedPhases: ProjectRoadmapItem[];
  hasPersistedRoadmap: boolean;
  hasAnyRoadmapData: boolean;
  completedMilestonesCount: number;
  overdueMilestonesCount: number;
  completedTasksCount: number;
}

export interface GlobalRoadmapAggregation {
  bundles: ProjectRoadmapBundle[];
  milestones: GlobalMilestoneItem[];
  summary: {
    totalProjects: number;
    projectsWithData: number;
    projectsWithoutData: number;
    activeProjectsCount: number;
    totalMilestones: number;
    completedMilestones: number;
    openMilestones: number;
    overdueMilestones: number;
    totalTasks: number;
    completedTasks: number;
    totalPersistedPhases: number;
  };
}

/**
 * Extracts a strict UTC calendar date (YYYY-MM-DD) from either YYYY-MM-DD or ISO string.
 */
export function extractUtcDateKey(dateInput: string | Date): string | null {
  if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) return null;
    return dateInput.toISOString().slice(0, 10);
  }
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Computes signed whole days from referenceDate (UTC midnight) to dueDate (UTC midnight).
 * Negative means past due; 0 means due today; positive means future.
 */
export function computeDaysUntilDue(
  dueDate: string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!dueDate) return null;
  const dueKey = extractUtcDateKey(dueDate);
  const refKey = extractUtcDateKey(referenceDate);
  if (!dueKey || !refKey) return null;

  const dueMs = Date.parse(`${dueKey}T00:00:00.000Z`);
  const refMs = Date.parse(`${refKey}T00:00:00.000Z`);
  if (Number.isNaN(dueMs) || Number.isNaN(refMs)) return null;

  return Math.round((dueMs - refMs) / 86_400_000);
}

/**
 * A milestone is overdue only if it is incomplete, has a valid dueDate,
 * and its UTC calendar date is strictly earlier than today's UTC calendar date.
 */
export function isMilestoneOverdue(
  milestone: Pick<ProjectMilestone, "completed" | "dueDate">,
  referenceDate: Date = new Date(),
): boolean {
  if (milestone.completed || !milestone.dueDate) return false;
  const days = computeDaysUntilDue(milestone.dueDate, referenceDate);
  return days !== null && days < 0;
}

export function classifyMilestoneDueBucket(
  milestone: Pick<ProjectMilestone, "completed" | "dueDate">,
  referenceDate: Date = new Date(),
): DueBucket {
  if (milestone.completed) return "completed";
  if (!milestone.dueDate) return "undated";
  const days = computeDaysUntilDue(milestone.dueDate, referenceDate);
  if (days === null) return "undated";
  if (days < 0) return "overdue";
  if (days <= 14) return "next-14-days";
  return "later";
}

/**
 * Aggregates persisted milestones, tasks, and roadmap phases across projects
 * without duplicating records or fabricating missing roadmap data.
 */
export function aggregateGlobalRoadmapData(input: {
  projects: Project[];
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  persistedRoadmaps: ProjectRoadmapItem[];
  referenceDate?: Date;
}): GlobalRoadmapAggregation {
  const refDate = input.referenceDate ?? new Date();

  // Deduplicate by record ID defensively while indexing by projectId
  const milestonesByProject = new Map<string, ProjectMilestone[]>();
  const seenMilestoneIds = new Set<string>();
  for (const m of input.milestones) {
    if (seenMilestoneIds.has(m.id)) continue;
    seenMilestoneIds.add(m.id);
    const list = milestonesByProject.get(m.projectId) ?? [];
    list.push(m);
    milestonesByProject.set(m.projectId, list);
  }

  const tasksByProject = new Map<string, ProjectTask[]>();
  const seenTaskIds = new Set<string>();
  for (const t of input.tasks) {
    if (seenTaskIds.has(t.id)) continue;
    seenTaskIds.add(t.id);
    const list = tasksByProject.get(t.projectId) ?? [];
    list.push(t);
    tasksByProject.set(t.projectId, list);
  }

  const roadmapsByProject = new Map<string, ProjectRoadmapItem[]>();
  const seenRoadmapIds = new Set<string>();
  for (const r of input.persistedRoadmaps) {
    if (seenRoadmapIds.has(r.id)) continue;
    seenRoadmapIds.add(r.id);
    const list = roadmapsByProject.get(r.projectId) ?? [];
    list.push(r);
    roadmapsByProject.set(r.projectId, list);
  }

  const bundles: ProjectRoadmapBundle[] = [];
  const allGlobalMilestones: GlobalMilestoneItem[] = [];

  let projectsWithData = 0;
  let projectsWithoutData = 0;
  let activeProjectsCount = 0;
  let completedMilestones = 0;
  let overdueMilestones = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let totalPersistedPhases = 0;

  for (const proj of input.projects) {
    const phase = projectToCellPhase(proj);
    if (
      proj.status !== "awaiting" &&
      proj.status !== "completed" &&
      !proj.isPlaceholder
    ) {
      activeProjectsCount += 1;
    }

    const rawMilestones = milestonesByProject.get(proj.id) ?? [];
    const projMilestones: GlobalMilestoneItem[] = rawMilestones
      .map((m) => {
        const overdue = isMilestoneOverdue(m, refDate);
        const days = computeDaysUntilDue(m.dueDate, refDate);
        const bucket = classifyMilestoneDueBucket(m, refDate);
        return {
          ...m,
          projectNumber: proj.number,
          projectTitle: proj.title,
          projectSlug: proj.slug,
          projectPhase: phase,
          isOverdue: overdue,
          daysUntilDue: days,
          dueBucket: bucket,
        };
      })
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.title.localeCompare(b.title);
      });

    const projTasks = [...(tasksByProject.get(proj.id) ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const projPhases = [...(roadmapsByProject.get(proj.id) ?? [])].sort(
      (a, b) => a.phase - b.phase,
    );

    const hasPersistedRoadmap = projPhases.length > 0;
    const hasAnyRoadmapData =
      projMilestones.length > 0 || projTasks.length > 0 || hasPersistedRoadmap;

    if (hasAnyRoadmapData) {
      projectsWithData += 1;
    } else if (!proj.isPlaceholder) {
      projectsWithoutData += 1;
    }

    const doneMsCount = projMilestones.filter((m) => m.completed).length;
    const overdueMsCount = projMilestones.filter((m) => m.isOverdue).length;
    const doneTaskCount = projTasks.filter((t) => t.completed).length;

    completedMilestones += doneMsCount;
    overdueMilestones += overdueMsCount;
    totalTasks += projTasks.length;
    completedTasks += doneTaskCount;
    totalPersistedPhases += projPhases.length;

    allGlobalMilestones.push(...projMilestones);

    bundles.push({
      project: proj,
      phase,
      milestones: projMilestones,
      tasks: projTasks,
      persistedPhases: projPhases,
      hasPersistedRoadmap,
      hasAnyRoadmapData,
      completedMilestonesCount: doneMsCount,
      overdueMilestonesCount: overdueMsCount,
      completedTasksCount: doneTaskCount,
    });
  }

  return {
    bundles,
    milestones: allGlobalMilestones,
    summary: {
      totalProjects: input.projects.length,
      projectsWithData,
      projectsWithoutData,
      activeProjectsCount,
      totalMilestones: allGlobalMilestones.length,
      completedMilestones,
      openMilestones: allGlobalMilestones.length - completedMilestones,
      overdueMilestones,
      totalTasks,
      completedTasks,
      totalPersistedPhases,
    },
  };
}
