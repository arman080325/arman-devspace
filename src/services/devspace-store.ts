import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  projects as canonicalProjects,
  getCanonicalProjectBySlug,
} from "@/data/projects";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import type {
  DeploymentRecord,
  Difficulty,
  NoteType,
  Project,
  ProjectActivityItem,
  ProjectMilestone,
  ProjectNote,
  ProjectProgress,
  ProjectRoadmapItem,
  ProjectScreenshot,
  ProjectStatus,
  ProjectTask,
  RepositoryMetadata,
  SessionUser,
  VerificationStatus,
  WorkspaceStats,
} from "@/types/project";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "owner" | "developer";
  createdAt: string;
}

interface StoredProgress {
  userId: string;
  projectId: string;
  status: ProjectStatus;
  completionPercentage: number;
  bookmarked: boolean;
  localClonePath: string | null;
  deploymentUrl: string | null;
  originalArchitecture: string | null;
  modernizationArchitecture: string | null;
  technicalDocumentation: string | null;
  testingSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string;
}

interface StoredRepoOverride {
  verifiedRepoUrl: string | null;
  verificationStatus: VerificationStatus;
  discrepancyNotes: string | null;
  metadata: RepositoryMetadata | null;
}

interface StoreShape {
  users: StoredUser[];
  progress: Record<string, StoredProgress>;
  tasks: ProjectTask[];
  notes: ProjectNote[];
  roadmaps: Record<string, ProjectRoadmapItem[]>;
  milestones: ProjectMilestone[];
  screenshots: ProjectScreenshot[];
  deployments: DeploymentRecord[];
  activities: ProjectActivityItem[];
  repoOverrides: Record<string, StoredRepoOverride>;
}

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "devspace-store.json");

const STANDARD_PHASES: Array<{ phase: number; title: string; description: string }> = [
  {
    phase: 1,
    title: "Acquisition",
    description:
      "Clone original repository, record initial commit hash, inspect branches, preserve upstream source, and create an independent modernization branch.",
  },
  {
    phase: 2,
    title: "Technical Audit",
    description:
      "Inspect directory layout, dependencies, frameworks, database architecture, outdated packages, security vulnerabilities, and technical debt.",
  },
  {
    phase: 3,
    title: "Modernization Planning",
    description:
      "Select appropriate target frameworks, database architecture, and design system tailored to the problem domain.",
  },
  {
    phase: 4,
    title: "UI/UX Redesign",
    description:
      "Build responsive, accessible, consistent interfaces with loading, error, empty, and mobile-optimized states.",
  },
  {
    phase: 5,
    title: "Feature Development",
    description:
      "Implement core parity features, missing critical capabilities, and production-grade enhancements.",
  },
  {
    phase: 6,
    title: "Quality Assurance",
    description:
      "Execute unit, integration, E2E, accessibility, security, and performance audits.",
  },
  {
    phase: 7,
    title: "Deployment",
    description:
      "Configure environments, CI/CD pipelines, production builds, deployment verification, and engineering documentation.",
  },
];

let writeQueue: Promise<void> = Promise.resolve();

function createInitialStore(): StoreShape {
  return {
    users: [],
    progress: {},
    tasks: [],
    notes: [],
    roadmaps: {},
    milestones: [],
    screenshots: [],
    deployments: [],
    activities: [],
    repoOverrides: {},
  };
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      progress: parsed.progress ?? {},
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      roadmaps: parsed.roadmaps ?? {},
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      screenshots: Array.isArray(parsed.screenshots) ? parsed.screenshots : [],
      deployments: Array.isArray(parsed.deployments) ? parsed.deployments : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      repoOverrides: parsed.repoOverrides ?? {},
    };
  } catch {
    return createInitialStore();
  }
}

async function mutateStore<T>(fn: (store: StoreShape) => Promise<T> | T): Promise<T> {
  let result!: T;
  const run = writeQueue.then(async () => {
    const store = await readStore();
    result = await fn(store);
    await fs.mkdir(STORE_DIR, { recursive: true });
    const tmpPath = `${STORE_PATH}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tmpPath, STORE_PATH);
  });
  writeQueue = run.catch(() => {});
  await run;
  return result;
}

function defaultRoadmapForProject(projectId: string): ProjectRoadmapItem[] {
  return STANDARD_PHASES.map((item) => ({
    id: `${projectId}-phase-${item.phase}`,
    projectId,
    phase: item.phase,
    title: item.title,
    description: item.description,
    status: "pending",
    order: item.phase,
  }));
}

function progressKey(userId: string, projectId: string): string {
  return `${userId}:${projectId}`;
}

function mergeProject(
  canonical: Project,
  progress: StoredProgress | undefined,
  override: StoredRepoOverride | undefined,
): Project {
  return {
    ...canonical,
    status: progress?.status ?? canonical.status,
    bookmarked: progress?.bookmarked ?? false,
    completionPercentage: progress?.completionPercentage ?? 0,
    localClonePath: progress?.localClonePath ?? null,
    deploymentUrl: progress?.deploymentUrl ?? null,
    originalArchitecture: progress?.originalArchitecture ?? null,
    modernizationArchitecture: progress?.modernizationArchitecture ?? null,
    technicalDocumentation: progress?.technicalDocumentation ?? null,
    testingSummary: progress?.testingSummary ?? null,
    lastAccessedAt: progress?.lastAccessedAt ?? null,
    verifiedRepoUrl: override?.verifiedRepoUrl ?? canonical.verifiedRepoUrl,
    verificationStatus: override?.verificationStatus ?? canonical.verificationStatus,
    discrepancyNotes: override?.discrepancyNotes ?? canonical.discrepancyNotes ?? null,
    repositoryMetadata: override?.metadata ?? null,
  };
}

function computeCompletionFromStatus(
  status: ProjectStatus,
  tasks: ProjectTask[],
): number {
  if (status === "completed") return 100;
  if (tasks.length > 0) {
    const completedCount = tasks.filter((t) => t.completed).length;
    return Math.round((completedCount / tasks.length) * 100);
  }
  switch (status) {
    case "awaiting":
      return 0;
    case "backlog":
      return 5;
    case "cloned":
      return 15;
    case "analyzing":
      return 30;
    case "planning":
      return 45;
    case "in-development":
      return 65;
    case "testing":
      return 85;
    default:
      return 0;
  }
}

/* ======================== USER & AUTH METHODS ======================== */

export async function hasAnyRegisteredUser(): Promise<boolean> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const count = await prisma.user.count();
      return count > 0;
    } catch {
      // Fall back cleanly if DB is unreachable
    }
  }
  const store = await readStore();
  return store.users.length > 0;
}

export async function registerUserAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);

  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        return { error: "An account with this email already exists." };
      }
      const userCount = await prisma.user.count();
      const created = await prisma.user.create({
        data: {
          name: input.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: userCount === 0 ? "owner" : "developer",
        },
      });
      return {
        user: {
          id: created.id,
          email: created.email,
          name: created.name,
          role: created.role === "owner" ? "owner" : "developer",
        },
      };
    } catch (err) {
      console.warn("Prisma registration fallback to local store:", err);
    }
  }

  return mutateStore((store) => {
    const exists = store.users.some((u) => u.email === normalizedEmail);
    if (exists) {
      return { error: "An account with this email already exists." };
    }
    const newUser: StoredUser = {
      id: `user-${randomUUID()}`,
      email: normalizedEmail,
      name: input.name.trim(),
      passwordHash,
      role: store.users.length === 0 ? "owner" : "developer",
      createdAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    };
  });
}

export async function authenticateUserAccount(input: {
  email: string;
  password: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const found = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (
        !found ||
        !found.passwordHash ||
        !verifyPassword(input.password, found.passwordHash)
      ) {
        return { error: "Invalid email or password." };
      }
      return {
        user: {
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role === "owner" ? "owner" : "developer",
        },
      };
    } catch (err) {
      console.warn("Prisma authentication fallback to local store:", err);
    }
  }

  const store = await readStore();
  const user = store.users.find((u) => u.email === normalizedEmail);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function syncExternalAuthUser(input: {
  email: string;
  name: string;
  supabaseId?: string;
}): Promise<SessionUser> {
  const normalizedEmail = input.email.trim().toLowerCase();

  return mutateStore((store) => {
    const existing = store.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
      };
    }
    const created: StoredUser = {
      id: input.supabaseId ?? `user-${randomUUID()}`,
      email: normalizedEmail,
      name: input.name || "Developer",
      passwordHash: "",
      role: store.users.length === 0 ? "owner" : "developer",
      createdAt: new Date().toISOString(),
    };
    store.users.push(created);
    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    };
  });
}

/* ======================== CATALOGUE & PROGRESS READS ======================== */

async function resolveAggregateUserId(explicitUserId?: string): Promise<string | null> {
  if (explicitUserId) return explicitUserId;
  const store = await readStore();
  const owner = store.users.find((u) => u.role === "owner") ?? store.users[0];
  return owner?.id ?? null;
}

export async function getAllProjects(userId?: string | null): Promise<Project[]> {
  const store = await readStore();
  const targetUserId = userId ?? null;

  return canonicalProjects.map((canonical) => {
    const progress = targetUserId
      ? store.progress[progressKey(targetUserId, canonical.id)]
      : undefined;
    const override = store.repoOverrides[canonical.id];
    return mergeProject(canonical, progress, override);
  });
}

export async function getProjectDetail(
  slug: string,
  userId?: string | null,
): Promise<{
  project: Project;
  progress: ProjectProgress | null;
} | null> {
  const canonical = getCanonicalProjectBySlug(slug);
  if (!canonical) return null;

  const store = await readStore();
  const override = store.repoOverrides[canonical.id];

  if (!userId) {
    return {
      project: mergeProject(canonical, undefined, override),
      progress: null,
    };
  }

  const storedProgress = store.progress[progressKey(userId, canonical.id)];
  const merged = mergeProject(canonical, storedProgress, override);

  const tasks = store.tasks
    .filter((t) => t.projectId === canonical.id && t.userId === userId)
    .sort((a, b) => a.order - b.order);

  const notes = store.notes
    .filter((n) => n.projectId === canonical.id && n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const roadmap =
    store.roadmaps[`${userId}:${canonical.id}`] ?? defaultRoadmapForProject(canonical.id);

  const milestones = store.milestones.filter((m) => m.projectId === canonical.id);

  const screenshots = store.screenshots.filter((s) => s.projectId === canonical.id);

  const deployments = store.deployments
    .filter((d) => d.projectId === canonical.id)
    .sort((a, b) => b.deployedAt.localeCompare(a.deployedAt));

  const activities = store.activities
    .filter((a) => a.projectId === canonical.id && a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25);

  return {
    project: merged,
    progress: {
      projectId: canonical.id,
      userId,
      status: merged.status,
      completionPercentage: merged.completionPercentage ?? 0,
      localClonePath: storedProgress?.localClonePath ?? null,
      deploymentUrl: storedProgress?.deploymentUrl ?? null,
      originalArchitecture: storedProgress?.originalArchitecture ?? null,
      modernizationArchitecture: storedProgress?.modernizationArchitecture ?? null,
      technicalDocumentation: storedProgress?.technicalDocumentation ?? null,
      testingSummary: storedProgress?.testingSummary ?? null,
      startedAt: storedProgress?.startedAt ?? null,
      completedAt: storedProgress?.completedAt ?? null,
      lastAccessedAt: storedProgress?.lastAccessedAt ?? canonical.updatedAt,
      notes,
      tasks,
      roadmap,
      milestones,
      screenshots,
      deployments,
      activities,
      bookmarked: storedProgress?.bookmarked ?? false,
    },
  };
}

export async function getWorkspaceStats(userId?: string | null): Promise<WorkspaceStats> {
  const effectiveUserId = await resolveAggregateUserId(userId ?? undefined);
  const store = await readStore();
  const projects = await getAllProjects(effectiveUserId);

  const statusCounts: Record<ProjectStatus, number> = {
    awaiting: 0,
    backlog: 0,
    cloned: 0,
    analyzing: 0,
    planning: 0,
    "in-development": 0,
    testing: 0,
    completed: 0,
  };

  const difficultyBreakdown = {
    beginner: { total: 0, completed: 0, active: 0 },
    intermediate: { total: 0, completed: 0, active: 0 },
    advanced: { total: 0, completed: 0, active: 0 },
  };

  const techCounts = new Map<string, { count: number; completedCount: number }>();

  let definedProjects = 0;
  let placeholderProjects = 0;
  let bookmarkedCount = 0;

  for (const project of projects) {
    statusCounts[project.status] += 1;
    if (project.isPlaceholder) {
      placeholderProjects += 1;
    } else {
      definedProjects += 1;
    }

    if (project.bookmarked) {
      bookmarkedCount += 1;
    }

    const diff = project.difficulty as Difficulty;
    difficultyBreakdown[diff].total += 1;
    if (project.status === "completed") {
      difficultyBreakdown[diff].completed += 1;
    } else if (project.status !== "awaiting" && project.status !== "backlog") {
      difficultyBreakdown[diff].active += 1;
    }

    for (const tech of project.technologies) {
      const current = techCounts.get(tech) ?? { count: 0, completedCount: 0 };
      current.count += 1;
      if (project.status === "completed") {
        current.completedCount += 1;
      }
      techCounts.set(tech, current);
    }
  }

  const userTasks = effectiveUserId
    ? store.tasks.filter((t) => t.userId === effectiveUserId)
    : [];
  const userNotes = effectiveUserId
    ? store.notes.filter((n) => n.userId === effectiveUserId)
    : [];
  const userActivities = effectiveUserId
    ? store.activities.filter((a) => a.userId === effectiveUserId)
    : [];

  // Weekly activity over last 7 days derived strictly from real persisted activity timestamps
  const today = new Date();
  const weeklyActivity: Array<{ day: string; date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const count = userActivities.filter((a) => a.createdAt.startsWith(isoDate)).length;
    weeklyActivity.push({ day: dayLabel, date: isoDate, count });
  }

  // Consecutive streak days with at least 1 persisted activity
  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    const hasActivity = userActivities.some((a) => a.createdAt.startsWith(isoDate));
    if (hasActivity) {
      streakDays += 1;
    } else if (i > 0) {
      break;
    } else {
      // If no activity yet today, check if streak was active yesterday
      continue;
    }
  }

  const activeProjects =
    statusCounts.cloned +
    statusCounts.analyzing +
    statusCounts.planning +
    statusCounts["in-development"] +
    statusCounts.testing;

  const technologyDistribution = Array.from(techCounts.entries())
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    totalProjects: projects.length,
    definedProjects,
    placeholderProjects,
    completedProjects: statusCounts.completed,
    inDevelopmentProjects: statusCounts["in-development"],
    awaitingProjects: statusCounts.awaiting,
    activeProjects,
    technologiesExplored: techCounts.size,
    bookmarkedCount,
    notesCount: userNotes.length,
    tasksCompleted: userTasks.filter((t) => t.completed).length,
    tasksTotal: userTasks.length,
    overallCompletion: Math.round((statusCounts.completed / projects.length) * 100),
    streakDays,
    difficultyBreakdown,
    statusCounts,
    technologyDistribution,
    weeklyActivity,
  };
}

export async function getUserDashboardFeed(userId: string) {
  const store = await readStore();
  const projects = await getAllProjects(userId);

  const recentlyAccessed = projects
    .filter((p) => Boolean(p.lastAccessedAt))
    .sort((a, b) => (b.lastAccessedAt ?? "").localeCompare(a.lastAccessedAt ?? ""))
    .slice(0, 6);

  const activeProjects = projects
    .filter((p) => p.status !== "awaiting" && p.status !== "completed")
    .slice(0, 8);

  const recentNotes = store.notes
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((note) => {
      const proj = canonicalProjects.find((p) => p.id === note.projectId);
      return {
        ...note,
        projectTitle: proj?.title ?? "Project",
        projectSlug: proj?.slug ?? "",
        projectNumber: proj?.number ?? 0,
      };
    });

  const upcomingMilestones = store.milestones
    .filter((m) => !m.completed)
    .slice(0, 6)
    .map((milestone) => {
      const proj = canonicalProjects.find((p) => p.id === milestone.projectId);
      return {
        ...milestone,
        projectTitle: proj?.title ?? "Project",
        projectSlug: proj?.slug ?? "",
        projectNumber: proj?.number ?? 0,
      };
    });

  const recentActivities = store.activities
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((act) => {
      const proj = canonicalProjects.find((p) => p.id === act.projectId);
      return {
        ...act,
        projectTitle: proj?.title ?? "Project",
        projectSlug: proj?.slug ?? "",
        projectNumber: proj?.number ?? 0,
      };
    });

  return {
    recentlyAccessed,
    activeProjects,
    recentNotes,
    upcomingMilestones,
    recentActivities,
  };
}

export async function getAllNotesForUser(userId: string) {
  const store = await readStore();
  return store.notes
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((note) => {
      const project = canonicalProjects.find((p) => p.id === note.projectId);
      return {
        ...note,
        projectTitle: project?.title ?? "Unknown Project",
        projectSlug: project?.slug ?? "",
        projectNumber: project?.number ?? 0,
      };
    });
}

/* ======================== MUTATIONS (PERSISTED) ======================== */

export async function updateProjectProgress(
  userId: string,
  projectId: string,
  patch: {
    status?: ProjectStatus;
    bookmarked?: boolean;
    completionPercentage?: number;
    localClonePath?: string | null;
    deploymentUrl?: string | null;
    originalArchitecture?: string | null;
    modernizationArchitecture?: string | null;
    technicalDocumentation?: string | null;
    testingSummary?: string | null;
  },
): Promise<StoredProgress> {
  return mutateStore((store) => {
    const key = progressKey(userId, projectId);
    const existing = store.progress[key];
    const now = new Date().toISOString();
    const projectTasks = store.tasks.filter(
      (t) => t.projectId === projectId && t.userId === userId,
    );

    const nextStatus = patch.status ?? existing?.status ?? "awaiting";
    const nextCompletion =
      patch.completionPercentage !== undefined
        ? patch.completionPercentage
        : patch.status !== undefined
          ? computeCompletionFromStatus(nextStatus, projectTasks)
          : (existing?.completionPercentage ?? 0);

    const updated: StoredProgress = {
      userId,
      projectId,
      status: nextStatus,
      completionPercentage: nextCompletion,
      bookmarked: patch.bookmarked ?? existing?.bookmarked ?? false,
      localClonePath:
        patch.localClonePath !== undefined
          ? patch.localClonePath
          : (existing?.localClonePath ?? null),
      deploymentUrl:
        patch.deploymentUrl !== undefined
          ? patch.deploymentUrl
          : (existing?.deploymentUrl ?? null),
      originalArchitecture:
        patch.originalArchitecture !== undefined
          ? patch.originalArchitecture
          : (existing?.originalArchitecture ?? null),
      modernizationArchitecture:
        patch.modernizationArchitecture !== undefined
          ? patch.modernizationArchitecture
          : (existing?.modernizationArchitecture ?? null),
      technicalDocumentation:
        patch.technicalDocumentation !== undefined
          ? patch.technicalDocumentation
          : (existing?.technicalDocumentation ?? null),
      testingSummary:
        patch.testingSummary !== undefined
          ? patch.testingSummary
          : (existing?.testingSummary ?? null),
      startedAt:
        existing?.startedAt ??
        (nextStatus !== "awaiting" && nextStatus !== "backlog" ? now : null),
      completedAt:
        nextStatus === "completed"
          ? (existing?.completedAt ?? now)
          : patch.status !== undefined
            ? null
            : (existing?.completedAt ?? null),
      lastAccessedAt: now,
    };

    store.progress[key] = updated;

    const summaryParts: string[] = [];
    if (patch.status && patch.status !== existing?.status) {
      summaryParts.push(`Updated status to ${patch.status}`);
    }
    if (patch.bookmarked !== undefined && patch.bookmarked !== existing?.bookmarked) {
      summaryParts.push(patch.bookmarked ? "Bookmarked project" : "Removed bookmark");
    }
    if (patch.localClonePath !== undefined) {
      summaryParts.push("Updated local clone path");
    }
    if (patch.deploymentUrl !== undefined) {
      summaryParts.push("Updated deployment URL");
    }
    if (
      patch.originalArchitecture !== undefined ||
      patch.modernizationArchitecture !== undefined ||
      patch.technicalDocumentation !== undefined ||
      patch.testingSummary !== undefined
    ) {
      summaryParts.push("Updated workspace engineering docs");
    }

    if (summaryParts.length > 0) {
      store.activities.push({
        id: randomUUID(),
        projectId,
        userId,
        action: "progress.updated",
        summary: summaryParts.join(" · "),
        createdAt: now,
      });
    }

    return updated;
  });
}

export async function createProjectTask(
  userId: string,
  projectId: string,
  input: { title: string; phase: string },
): Promise<ProjectTask> {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const existingTasks = store.tasks.filter(
      (t) => t.projectId === projectId && t.userId === userId,
    );
    const task: ProjectTask = {
      id: randomUUID(),
      projectId,
      userId,
      title: input.title,
      completed: false,
      phase: input.phase,
      order: existingTasks.length + 1,
      createdAt: now,
      completedAt: null,
    };
    store.tasks.push(task);

    const key = progressKey(userId, projectId);
    const existingProgress = store.progress[key];
    if (existingProgress) {
      existingProgress.completionPercentage = computeCompletionFromStatus(
        existingProgress.status,
        [...existingTasks, task],
      );
      existingProgress.lastAccessedAt = now;
    }

    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: "task.created",
      summary: `Added task: ${task.title}`,
      createdAt: now,
    });

    return task;
  });
}

export async function toggleProjectTask(
  userId: string,
  projectId: string,
  taskId: string,
  completed: boolean,
): Promise<ProjectTask | null> {
  return mutateStore((store) => {
    const task = store.tasks.find(
      (t) => t.id === taskId && t.projectId === projectId && t.userId === userId,
    );
    if (!task) return null;

    const now = new Date().toISOString();
    task.completed = completed;
    task.completedAt = completed ? now : null;

    const projectTasks = store.tasks.filter(
      (t) => t.projectId === projectId && t.userId === userId,
    );
    const key = progressKey(userId, projectId);
    if (store.progress[key]) {
      store.progress[key].completionPercentage = computeCompletionFromStatus(
        store.progress[key].status,
        projectTasks,
      );
      store.progress[key].lastAccessedAt = now;
    }

    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: completed ? "task.completed" : "task.reopened",
      summary: `${completed ? "Completed" : "Reopened"} task: ${task.title}`,
      createdAt: now,
    });

    return task;
  });
}

export async function deleteProjectTask(
  userId: string,
  projectId: string,
  taskId: string,
): Promise<boolean> {
  return mutateStore((store) => {
    const idx = store.tasks.findIndex(
      (t) => t.id === taskId && t.projectId === projectId && t.userId === userId,
    );
    if (idx === -1) return false;
    store.tasks.splice(idx, 1);
    return true;
  });
}

export async function createProjectNote(
  userId: string,
  input: { projectId: string; title: string; content: string; type: NoteType },
): Promise<ProjectNote> {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const note: ProjectNote = {
      id: randomUUID(),
      projectId: input.projectId,
      userId,
      title: input.title,
      content: input.content,
      type: input.type,
      createdAt: now,
      updatedAt: now,
    };
    store.notes.push(note);

    store.activities.push({
      id: randomUUID(),
      projectId: input.projectId,
      userId,
      action: "note.created",
      summary: `Logged ${input.type} note: ${input.title}`,
      createdAt: now,
    });

    return note;
  });
}

export async function deleteProjectNote(
  userId: string,
  noteId: string,
): Promise<boolean> {
  return mutateStore((store) => {
    const idx = store.notes.findIndex((n) => n.id === noteId && n.userId === userId);
    if (idx === -1) return false;
    store.notes.splice(idx, 1);
    return true;
  });
}

export async function updateRoadmapPhaseStatus(
  userId: string,
  projectId: string,
  roadmapId: string,
  status: ProjectRoadmapItem["status"],
): Promise<ProjectRoadmapItem[]> {
  return mutateStore((store) => {
    const key = `${userId}:${projectId}`;
    const current = store.roadmaps[key] ?? defaultRoadmapForProject(projectId);
    const updated = current.map((item) =>
      item.id === roadmapId ? { ...item, status } : item,
    );
    store.roadmaps[key] = updated;

    const changed = updated.find((i) => i.id === roadmapId);
    if (changed) {
      store.activities.push({
        id: randomUUID(),
        projectId,
        userId,
        action: "roadmap.updated",
        summary: `Phase ${changed.phase} (${changed.title}) marked ${status}`,
        createdAt: new Date().toISOString(),
      });
    }

    return updated;
  });
}

export async function createProjectMilestone(
  userId: string,
  projectId: string,
  input: { title: string; dueDate: string | null },
): Promise<ProjectMilestone> {
  return mutateStore((store) => {
    const milestone: ProjectMilestone = {
      id: randomUUID(),
      projectId,
      title: input.title,
      dueDate: input.dueDate,
      completed: false,
      completedAt: null,
    };
    store.milestones.push(milestone);
    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: "milestone.created",
      summary: `Added milestone: ${input.title}`,
      createdAt: new Date().toISOString(),
    });
    return milestone;
  });
}

export async function toggleProjectMilestone(
  userId: string,
  projectId: string,
  milestoneId: string,
  completed: boolean,
): Promise<ProjectMilestone | null> {
  return mutateStore((store) => {
    const found = store.milestones.find(
      (m) => m.id === milestoneId && m.projectId === projectId,
    );
    if (!found) return null;
    const now = new Date().toISOString();
    found.completed = completed;
    found.completedAt = completed ? now : null;
    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: "milestone.updated",
      summary: `${completed ? "Completed" : "Reopened"} milestone: ${found.title}`,
      createdAt: now,
    });
    return found;
  });
}

export async function addDeploymentRecord(
  userId: string,
  projectId: string,
  input: Omit<DeploymentRecord, "id" | "projectId" | "deployedAt">,
): Promise<DeploymentRecord> {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const record: DeploymentRecord = {
      id: randomUUID(),
      projectId,
      ...input,
      deployedAt: now,
    };
    store.deployments.push(record);

    const key = progressKey(userId, projectId);
    if (store.progress[key]) {
      store.progress[key].deploymentUrl = input.url;
      store.progress[key].lastAccessedAt = now;
    }

    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: "deployment.recorded",
      summary: `Recorded ${input.environment} deployment on ${input.provider}`,
      createdAt: now,
    });

    return record;
  });
}

export async function addProjectScreenshot(
  userId: string,
  projectId: string,
  input: { title: string; url: string; caption: string | null },
): Promise<ProjectScreenshot> {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const item: ProjectScreenshot = {
      id: randomUUID(),
      projectId,
      title: input.title,
      url: input.url,
      caption: input.caption,
      createdAt: now,
    };
    store.screenshots.push(item);
    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: "screenshot.added",
      summary: `Added screenshot: ${input.title}`,
      createdAt: now,
    });
    return item;
  });
}

export async function saveRepositoryVerification(
  userId: string,
  projectId: string,
  data: {
    verificationStatus: VerificationStatus;
    verifiedRepoUrl: string | null;
    discrepancyNotes: string | null;
    metadata: Omit<RepositoryMetadata, "projectId"> | null;
  },
): Promise<void> {
  await mutateStore((store) => {
    store.repoOverrides[projectId] = {
      verificationStatus: data.verificationStatus,
      verifiedRepoUrl: data.verifiedRepoUrl,
      discrepancyNotes: data.discrepancyNotes,
      metadata: data.metadata ? { projectId, ...data.metadata } : null,
    };

    store.activities.push({
      id: randomUUID(),
      projectId,
      userId,
      action: "github.verified",
      summary: `Verified repository metadata (${data.verificationStatus})`,
      createdAt: new Date().toISOString(),
    });
  });
}
