import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import {
  mapPrismaActivity,
  mapPrismaDeployment,
  mapPrismaMilestone,
  mapPrismaNote,
  mapPrismaRepoMetadata,
  mapPrismaRoadmap,
  mapPrismaScreenshot,
  parseMilestoneDueDate,
  toAppDifficulty,
  toAppProjectStatus,
  toAppVerificationStatus,
  toIsoString,
  toIsoStringOrNull,
  toPrismaProjectStatus,
  toPrismaRoadmapStatus,
  toPrismaVerificationStatus,
} from "@/lib/prisma-mappers";
import type {
  DeploymentRecord,
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

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(
      "Database persistence is required, but PrismaClient is not available.",
    );
  }
  return prisma;
}

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

function computeCompletionFromStatus(
  status: ProjectStatus,
  tasks: Array<{ completed: boolean }>,
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

/* ============================================================================
   USER & AUTHENTICATION
   ============================================================================ */

export async function hasAnyRegisteredUser(): Promise<boolean> {
  const prisma = requirePrisma();
  const count = await prisma.user.count({
    where: {
      OR: [{ passwordHash: { not: null } }, { supabaseId: { not: null } }],
    },
  });
  return count > 0;
}

export async function registerUserAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  const prisma = requirePrisma();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const credentialedCount = await prisma.user.count({
    where: {
      OR: [{ passwordHash: { not: null } }, { supabaseId: { not: null } }],
    },
  });

  const created = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: credentialedCount === 0 ? "owner" : "developer",
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
}

export async function authenticateUserAccount(input: {
  email: string;
  password: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  const prisma = requirePrisma();
  const normalizedEmail = input.email.trim().toLowerCase();

  const found = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!found || !found.passwordHash) {
    return { error: "Invalid email or password." };
  }

  const matches = verifyPassword(input.password, found.passwordHash);
  if (!matches) {
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
}

export async function syncExternalAuthUser(input: {
  email: string;
  name: string;
  supabaseId?: string;
}): Promise<SessionUser> {
  const prisma = requirePrisma();
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (input.supabaseId && !existing.supabaseId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { supabaseId: input.supabaseId },
      });
    }
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      role: existing.role === "owner" ? "owner" : "developer",
    };
  }

  const userCount = await prisma.user.count();
  const created = await prisma.user.create({
    data: {
      id: input.supabaseId ?? `user-${randomUUID()}`,
      email: normalizedEmail,
      name: input.name || "Developer",
      supabaseId: input.supabaseId || null,
      role: userCount === 0 ? "owner" : "developer",
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role === "owner" ? "owner" : "developer",
  };
}

/* ============================================================================
   PROJECT CATALOGUE & PROGRESS READS
   ============================================================================ */

export async function getAllProjects(userId?: string | null): Promise<Project[]> {
  const prisma = requirePrisma();

  const dbProjects = await prisma.project.findMany({
    include: {
      category: true,
      technologies: true,
      repositoryMetadata: true,
      progress: userId ? { where: { userId } } : false,
    },
    orderBy: { number: "asc" },
  });

  return dbProjects.map((p) => {
    const userProgress = p.progress && p.progress.length > 0 ? p.progress[0] : null;
    const repoMeta = p.repositoryMetadata
      ? mapPrismaRepoMetadata(p.repositoryMetadata)
      : null;
    const status = userProgress ? toAppProjectStatus(userProgress.status) : "awaiting";

    return {
      id: p.id,
      number: p.number,
      title: p.title,
      slug: p.slug,
      description: p.description,
      difficulty: toAppDifficulty(p.difficulty),
      complexityReviewed: toAppDifficulty(p.complexityReviewed),
      category: p.category.name,
      originalRepoUrl: p.originalRepoUrl,
      verifiedRepoUrl: p.verifiedRepoUrl,
      discrepancyNotes: p.discrepancyNotes,
      technologies: p.technologies.map((t) => t.name),
      status,
      verificationStatus: toAppVerificationStatus(p.verificationStatus),
      isPlaceholder: p.isPlaceholder,
      learningObjectives: p.learningObjectives,
      existingFeatures: p.existingFeatures,
      missingFeatures: p.missingFeatures,
      recommendedStack: p.recommendedStack,
      originalArchitecture: userProgress?.originalArchitecture ?? null,
      modernizationArchitecture: userProgress?.modernizationArchitecture ?? null,
      technicalDocumentation: userProgress?.technicalDocumentation ?? null,
      testingSummary: userProgress?.testingSummary ?? null,
      localClonePath: userProgress?.localClonePath ?? null,
      deploymentUrl: userProgress?.deploymentUrl ?? null,
      bookmarked: userProgress?.bookmarked ?? false,
      completionPercentage: userProgress?.completionPercentage ?? 0,
      lastAccessedAt: toIsoStringOrNull(userProgress?.lastAccessedAt),
      repositoryMetadata: repoMeta,
      createdAt: toIsoString(p.createdAt),
      updatedAt: toIsoString(p.updatedAt),
    };
  });
}

export async function getProjectDetail(
  slug: string,
  userId?: string | null,
): Promise<{
  project: Project;
  progress: ProjectProgress | null;
} | null> {
  const prisma = requirePrisma();

  const p = await prisma.project.findUnique({
    where: { slug },
    include: {
      category: true,
      technologies: true,
      repositoryMetadata: true,
      progress: userId ? { where: { userId } } : false,
      tasks: userId ? { where: { userId }, orderBy: { order: "asc" } } : false,
      notes: userId ? { where: { userId }, orderBy: { createdAt: "desc" } } : false,
      roadmap: userId ? { where: { userId }, orderBy: { phase: "asc" } } : false,
      milestones: userId ? { where: { userId }, orderBy: { createdAt: "asc" } } : false,
      screenshots: userId ? { where: { userId }, orderBy: { createdAt: "desc" } } : false,
      deployments: userId
        ? { where: { userId }, orderBy: { deployedAt: "desc" } }
        : false,
      activities: userId
        ? { where: { userId }, orderBy: { createdAt: "desc" }, take: 25 }
        : false,
    },
  });

  if (!p) return null;

  const userProgress = p.progress && p.progress.length > 0 ? p.progress[0] : null;
  const repoMeta = p.repositoryMetadata
    ? mapPrismaRepoMetadata(p.repositoryMetadata)
    : null;
  const status = userProgress ? toAppProjectStatus(userProgress.status) : "awaiting";

  const projectDto: Project = {
    id: p.id,
    number: p.number,
    title: p.title,
    slug: p.slug,
    description: p.description,
    difficulty: toAppDifficulty(p.difficulty),
    complexityReviewed: toAppDifficulty(p.complexityReviewed),
    category: p.category.name,
    originalRepoUrl: p.originalRepoUrl,
    verifiedRepoUrl: p.verifiedRepoUrl,
    discrepancyNotes: p.discrepancyNotes,
    technologies: p.technologies.map((t) => t.name),
    status,
    verificationStatus: toAppVerificationStatus(p.verificationStatus),
    isPlaceholder: p.isPlaceholder,
    learningObjectives: p.learningObjectives,
    existingFeatures: p.existingFeatures,
    missingFeatures: p.missingFeatures,
    recommendedStack: p.recommendedStack,
    originalArchitecture: userProgress?.originalArchitecture ?? null,
    modernizationArchitecture: userProgress?.modernizationArchitecture ?? null,
    technicalDocumentation: userProgress?.technicalDocumentation ?? null,
    testingSummary: userProgress?.testingSummary ?? null,
    localClonePath: userProgress?.localClonePath ?? null,
    deploymentUrl: userProgress?.deploymentUrl ?? null,
    bookmarked: userProgress?.bookmarked ?? false,
    completionPercentage: userProgress?.completionPercentage ?? 0,
    lastAccessedAt: toIsoStringOrNull(userProgress?.lastAccessedAt),
    repositoryMetadata: repoMeta,
    createdAt: toIsoString(p.createdAt),
    updatedAt: toIsoString(p.updatedAt),
  };

  if (!userId) {
    return {
      project: projectDto,
      progress: null,
    };
  }

  const tasks: ProjectTask[] = (p.tasks || []).map((t) => ({
    id: t.id,
    projectId: t.projectId,
    userId: t.userId,
    title: t.title,
    completed: t.completed,
    phase: t.phase,
    order: t.order,
    createdAt: toIsoString(t.createdAt),
    completedAt: toIsoStringOrNull(t.completedAt),
  }));

  const notes: ProjectNote[] = (p.notes || []).map(mapPrismaNote);
  const rawRoadmaps = p.roadmap || [];
  const roadmap: ProjectRoadmapItem[] =
    rawRoadmaps.length > 0
      ? rawRoadmaps.map(mapPrismaRoadmap)
      : defaultRoadmapForProject(p.id);

  const milestones: ProjectMilestone[] = (p.milestones || []).map(mapPrismaMilestone);
  const screenshots: ProjectScreenshot[] = (p.screenshots || []).map(mapPrismaScreenshot);
  const deployments: DeploymentRecord[] = (p.deployments || []).map(mapPrismaDeployment);
  const activities: ProjectActivityItem[] = (p.activities || []).map(mapPrismaActivity);

  return {
    project: projectDto,
    progress: {
      projectId: p.id,
      userId,
      status,
      completionPercentage: userProgress?.completionPercentage ?? 0,
      localClonePath: userProgress?.localClonePath ?? null,
      deploymentUrl: userProgress?.deploymentUrl ?? null,
      originalArchitecture: userProgress?.originalArchitecture ?? null,
      modernizationArchitecture: userProgress?.modernizationArchitecture ?? null,
      technicalDocumentation: userProgress?.technicalDocumentation ?? null,
      testingSummary: userProgress?.testingSummary ?? null,
      startedAt: toIsoStringOrNull(userProgress?.startedAt),
      completedAt: toIsoStringOrNull(userProgress?.completedAt),
      lastAccessedAt:
        toIsoStringOrNull(userProgress?.lastAccessedAt) ?? toIsoString(p.updatedAt),
      notes,
      tasks,
      roadmap,
      milestones,
      screenshots,
      deployments,
      activities,
      bookmarked: userProgress?.bookmarked ?? false,
    },
  };
}

export async function getWorkspaceStats(userId?: string | null): Promise<WorkspaceStats> {
  const prisma = requirePrisma();
  const projects = await getAllProjects(userId);

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

    const diff = project.difficulty;
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

  let userTasks: Array<{ completed: boolean }> = [];
  let userNotesCount = 0;
  let userActivities: Array<{ createdAt: Date }> = [];

  if (userId) {
    const [tasks, notesCount, activities] = await Promise.all([
      prisma.projectTask.findMany({
        where: { userId },
        select: { completed: true },
      }),
      prisma.projectNote.count({
        where: { userId },
      }),
      prisma.projectActivity.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    userTasks = tasks;
    userNotesCount = notesCount;
    userActivities = activities;
  }

  const today = new Date();
  const weeklyActivity: Array<{ day: string; date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const count = userActivities.filter((a) =>
      a.createdAt.toISOString().startsWith(isoDate),
    ).length;
    weeklyActivity.push({ day: dayLabel, date: isoDate, count });
  }

  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    const hasActivity = userActivities.some((a) =>
      a.createdAt.toISOString().startsWith(isoDate),
    );
    if (hasActivity) {
      streakDays += 1;
    } else if (i > 0) {
      break;
    } else {
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
    notesCount: userNotesCount,
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
  const prisma = requirePrisma();
  const projects = await getAllProjects(userId);

  const recentlyAccessed = projects
    .filter((p) => Boolean(p.lastAccessedAt))
    .sort((a, b) => (b.lastAccessedAt ?? "").localeCompare(a.lastAccessedAt ?? ""))
    .slice(0, 6);

  const activeProjects = projects
    .filter((p) => p.status !== "awaiting" && p.status !== "completed")
    .slice(0, 8);

  const [notes, milestones, activities] = await Promise.all([
    prisma.projectNote.findMany({
      where: { userId },
      include: { project: { select: { title: true, slug: true, number: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.projectMilestone.findMany({
      where: { userId, completed: false },
      include: { project: { select: { title: true, slug: true, number: true } } },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    prisma.projectActivity.findMany({
      where: { userId },
      include: { project: { select: { title: true, slug: true, number: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const recentNotes = notes.map((n) => ({
    ...mapPrismaNote(n),
    projectTitle: n.project.title,
    projectSlug: n.project.slug,
    projectNumber: n.project.number,
  }));

  const upcomingMilestones = milestones.map((m) => ({
    ...mapPrismaMilestone(m),
    projectTitle: m.project.title,
    projectSlug: m.project.slug,
    projectNumber: m.project.number,
  }));

  const recentActivities = activities.map((a) => ({
    ...mapPrismaActivity(a),
    projectTitle: a.project.title,
    projectSlug: a.project.slug,
    projectNumber: a.project.number,
  }));

  return {
    recentlyAccessed,
    activeProjects,
    recentNotes,
    upcomingMilestones,
    recentActivities,
  };
}

export async function getAllNotesForUser(userId: string) {
  const prisma = requirePrisma();
  const notes = await prisma.projectNote.findMany({
    where: { userId },
    include: { project: { select: { title: true, slug: true, number: true } } },
    orderBy: { createdAt: "desc" },
  });

  return notes.map((n) => ({
    ...mapPrismaNote(n),
    projectTitle: n.project.title,
    projectSlug: n.project.slug,
    projectNumber: n.project.number,
  }));
}

/* ============================================================================
   MUTATIONS (TRANSACTIONAL & USER-ISOLATED)
   ============================================================================ */

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
) {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.userProjectProgress.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    const projectTasks = await tx.projectTask.findMany({
      where: { userId, projectId },
      select: { completed: true },
    });

    const currentAppStatus = existing ? toAppProjectStatus(existing.status) : "awaiting";
    const nextAppStatus = patch.status ?? currentAppStatus;
    const nextPrismaStatus = toPrismaProjectStatus(nextAppStatus);

    const nextCompletion =
      patch.completionPercentage !== undefined
        ? patch.completionPercentage
        : patch.status !== undefined
          ? computeCompletionFromStatus(nextAppStatus, projectTasks)
          : (existing?.completionPercentage ?? 0);

    const nextStartedAt =
      existing?.startedAt ??
      (nextAppStatus !== "awaiting" && nextAppStatus !== "backlog" ? now : null);

    const nextCompletedAt =
      nextAppStatus === "completed"
        ? (existing?.completedAt ?? now)
        : patch.status !== undefined
          ? null
          : (existing?.completedAt ?? null);

    const updated = await tx.userProjectProgress.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: {
        status: nextPrismaStatus,
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
        startedAt: nextStartedAt,
        completedAt: nextCompletedAt,
        lastAccessedAt: now,
      },
      create: {
        userId,
        projectId,
        status: nextPrismaStatus,
        completionPercentage: nextCompletion,
        bookmarked: patch.bookmarked ?? false,
        localClonePath: patch.localClonePath ?? null,
        deploymentUrl: patch.deploymentUrl ?? null,
        originalArchitecture: patch.originalArchitecture ?? null,
        modernizationArchitecture: patch.modernizationArchitecture ?? null,
        technicalDocumentation: patch.technicalDocumentation ?? null,
        testingSummary: patch.testingSummary ?? null,
        startedAt: nextStartedAt,
        completedAt: nextCompletedAt,
        lastAccessedAt: now,
      },
    });

    const summaryParts: string[] = [];
    if (patch.status && patch.status !== currentAppStatus) {
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
      await tx.projectActivity.create({
        data: {
          projectId,
          userId,
          action: "progress.updated",
          summary: summaryParts.join(" · "),
          createdAt: now,
        },
      });
    }

    return {
      userId: updated.userId,
      projectId: updated.projectId,
      status: toAppProjectStatus(updated.status),
      completionPercentage: updated.completionPercentage,
      bookmarked: updated.bookmarked,
      localClonePath: updated.localClonePath,
      deploymentUrl: updated.deploymentUrl,
      originalArchitecture: updated.originalArchitecture,
      modernizationArchitecture: updated.modernizationArchitecture,
      technicalDocumentation: updated.technicalDocumentation,
      testingSummary: updated.testingSummary,
      startedAt: toIsoStringOrNull(updated.startedAt),
      completedAt: toIsoStringOrNull(updated.completedAt),
      lastAccessedAt: toIsoString(updated.lastAccessedAt),
    };
  });
}

export async function createProjectTask(
  userId: string,
  projectId: string,
  input: { title: string; phase: string },
): Promise<ProjectTask> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.projectTask.count({
      where: { userId, projectId },
    });

    const created = await tx.projectTask.create({
      data: {
        projectId,
        userId,
        title: input.title,
        completed: false,
        phase: input.phase,
        order: existingCount + 1,
        createdAt: now,
      },
    });

    const allTasks = await tx.projectTask.findMany({
      where: { userId, projectId },
      select: { completed: true },
    });

    const progress = await tx.userProjectProgress.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (progress) {
      const nextCompletion = computeCompletionFromStatus(
        toAppProjectStatus(progress.status),
        allTasks,
      );
      await tx.userProjectProgress.update({
        where: { userId_projectId: { userId, projectId } },
        data: {
          completionPercentage: nextCompletion,
          lastAccessedAt: now,
        },
      });
    }

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: "task.created",
        summary: `Added task: ${created.title}`,
        createdAt: now,
      },
    });

    return {
      id: created.id,
      projectId: created.projectId,
      userId: created.userId,
      title: created.title,
      completed: created.completed,
      phase: created.phase,
      order: created.order,
      createdAt: toIsoString(created.createdAt),
      completedAt: toIsoStringOrNull(created.completedAt),
    };
  });
}

export async function toggleProjectTask(
  userId: string,
  projectId: string,
  taskId: string,
  completed: boolean,
): Promise<ProjectTask | null> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findFirst({
      where: { id: taskId, projectId, userId },
    });
    if (!task) return null;

    const updated = await tx.projectTask.update({
      where: { id: taskId },
      data: {
        completed,
        completedAt: completed ? now : null,
      },
    });

    const allTasks = await tx.projectTask.findMany({
      where: { userId, projectId },
      select: { completed: true },
    });

    const progress = await tx.userProjectProgress.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (progress) {
      const nextCompletion = computeCompletionFromStatus(
        toAppProjectStatus(progress.status),
        allTasks,
      );
      await tx.userProjectProgress.update({
        where: { userId_projectId: { userId, projectId } },
        data: {
          completionPercentage: nextCompletion,
          lastAccessedAt: now,
        },
      });
    }

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: completed ? "task.completed" : "task.reopened",
        summary: `${completed ? "Completed" : "Reopened"} task: ${updated.title}`,
        createdAt: now,
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      userId: updated.userId,
      title: updated.title,
      completed: updated.completed,
      phase: updated.phase,
      order: updated.order,
      createdAt: toIsoString(updated.createdAt),
      completedAt: toIsoStringOrNull(updated.completedAt),
    };
  });
}

export async function deleteProjectTask(
  userId: string,
  projectId: string,
  taskId: string,
): Promise<boolean> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findFirst({
      where: { id: taskId, projectId, userId },
    });
    if (!task) return false;

    await tx.projectTask.delete({ where: { id: taskId } });

    const allTasks = await tx.projectTask.findMany({
      where: { userId, projectId },
      select: { completed: true },
    });

    const progress = await tx.userProjectProgress.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (progress) {
      const nextCompletion = computeCompletionFromStatus(
        toAppProjectStatus(progress.status),
        allTasks,
      );
      await tx.userProjectProgress.update({
        where: { userId_projectId: { userId, projectId } },
        data: {
          completionPercentage: nextCompletion,
          lastAccessedAt: now,
        },
      });
    }

    return true;
  });
}

export async function createProjectNote(
  userId: string,
  input: { projectId: string; title: string; content: string; type: NoteType },
): Promise<ProjectNote> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const created = await tx.projectNote.create({
      data: {
        projectId: input.projectId,
        userId,
        title: input.title,
        content: input.content,
        type: input.type,
        createdAt: now,
      },
    });

    await tx.projectActivity.create({
      data: {
        projectId: input.projectId,
        userId,
        action: "note.created",
        summary: `Logged ${input.type} note: ${input.title}`,
        createdAt: now,
      },
    });

    return mapPrismaNote(created);
  });
}

export async function deleteProjectNote(
  userId: string,
  noteId: string,
): Promise<boolean> {
  const prisma = requirePrisma();
  const note = await prisma.projectNote.findFirst({
    where: { id: noteId, userId },
  });
  if (!note) return false;

  await prisma.projectNote.delete({ where: { id: noteId } });
  return true;
}

export async function updateRoadmapPhaseStatus(
  userId: string,
  projectId: string,
  roadmapId: string,
  status: ProjectRoadmapItem["status"],
): Promise<ProjectRoadmapItem[]> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const currentRoadmap = await tx.projectRoadmap.findMany({
      where: { userId, projectId },
    });

    if (currentRoadmap.length === 0) {
      // Seed default 7 phases for this user & project
      for (const item of STANDARD_PHASES) {
        await tx.projectRoadmap.create({
          data: {
            userId,
            projectId,
            phase: item.phase,
            title: item.title,
            description: item.description,
            status:
              item.phase.toString() === roadmapId ||
              `${projectId}-phase-${item.phase}` === roadmapId
                ? toPrismaRoadmapStatus(status)
                : "pending",
            order: item.phase,
            createdAt: now,
          },
        });
      }
    } else {
      const match = currentRoadmap.find(
        (r) => r.id === roadmapId || `${projectId}-phase-${r.phase}` === roadmapId,
      );
      if (match) {
        await tx.projectRoadmap.update({
          where: { id: match.id },
          data: { status: toPrismaRoadmapStatus(status) },
        });
      }
    }

    const updated = await tx.projectRoadmap.findMany({
      where: { userId, projectId },
      orderBy: { phase: "asc" },
    });

    const changed = updated.find(
      (i) => i.id === roadmapId || `${projectId}-phase-${i.phase}` === roadmapId,
    );
    if (changed) {
      await tx.projectActivity.create({
        data: {
          projectId,
          userId,
          action: "roadmap.updated",
          summary: `Phase ${changed.phase} (${changed.title}) marked ${status}`,
          createdAt: now,
        },
      });
    }

    return updated.map(mapPrismaRoadmap);
  });
}

export async function createProjectMilestone(
  userId: string,
  projectId: string,
  input: { title: string; dueDate: string | null },
): Promise<ProjectMilestone> {
  const prisma = requirePrisma();
  const now = new Date();
  const parsedDueDate = parseMilestoneDueDate(input.dueDate);

  return prisma.$transaction(async (tx) => {
    const created = await tx.projectMilestone.create({
      data: {
        projectId,
        userId,
        title: input.title,
        dueDate: parsedDueDate,
        completed: false,
        createdAt: now,
      },
    });

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: "milestone.created",
        summary: `Added milestone: ${input.title}`,
        createdAt: now,
      },
    });

    return mapPrismaMilestone(created);
  });
}

export async function toggleProjectMilestone(
  userId: string,
  projectId: string,
  milestoneId: string,
  completed: boolean,
): Promise<ProjectMilestone | null> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const found = await tx.projectMilestone.findFirst({
      where: { id: milestoneId, projectId, userId },
    });
    if (!found) return null;

    const updated = await tx.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        completed,
        completedAt: completed ? now : null,
      },
    });

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: "milestone.updated",
        summary: `${completed ? "Completed" : "Reopened"} milestone: ${updated.title}`,
        createdAt: now,
      },
    });

    return mapPrismaMilestone(updated);
  });
}

export async function addDeploymentRecord(
  userId: string,
  projectId: string,
  input: Omit<DeploymentRecord, "id" | "projectId" | "deployedAt">,
): Promise<DeploymentRecord> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const record = await tx.deploymentRecord.create({
      data: {
        projectId,
        userId,
        environment: input.environment,
        url: input.url,
        provider: input.provider || "Vercel",
        status: input.status,
        deployedAt: now,
        notes: input.notes || null,
      },
    });

    await tx.userProjectProgress.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: {
        deploymentUrl: input.url,
        lastAccessedAt: now,
      },
      create: {
        userId,
        projectId,
        deploymentUrl: input.url,
        status: "in_development",
        lastAccessedAt: now,
      },
    });

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: "deployment.recorded",
        summary: `Recorded ${input.environment} deployment on ${input.provider}`,
        createdAt: now,
      },
    });

    return mapPrismaDeployment(record);
  });
}

export async function addProjectScreenshot(
  userId: string,
  projectId: string,
  input: { title: string; url: string; caption: string | null },
): Promise<ProjectScreenshot> {
  const prisma = requirePrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const created = await tx.projectScreenshot.create({
      data: {
        projectId,
        userId,
        title: input.title,
        url: input.url,
        caption: input.caption,
        createdAt: now,
      },
    });

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: "screenshot.added",
        summary: `Added screenshot: ${input.title}`,
        createdAt: now,
      },
    });

    return mapPrismaScreenshot(created);
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
  const prisma = requirePrisma();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        verificationStatus: toPrismaVerificationStatus(data.verificationStatus),
        verifiedRepoUrl: data.verifiedRepoUrl,
        discrepancyNotes: data.discrepancyNotes,
      },
    });

    if (data.metadata) {
      const meta = data.metadata;
      await tx.repositoryMetadata.upsert({
        where: { projectId },
        update: {
          owner: meta.owner,
          repoName: meta.repoName,
          defaultBranch: meta.defaultBranch || "main",
          description: meta.description || null,
          primaryLanguage: meta.primaryLanguage || null,
          stars: meta.stars,
          forks: meta.forks,
          openIssues: meta.openIssues,
          lastUpdated: meta.lastUpdated ? new Date(meta.lastUpdated) : null,
          isArchived: meta.isArchived,
          hasReadme: meta.hasReadme,
          license: meta.license || null,
          topics: meta.topics,
          frameworkVersions: meta.frameworkVersions || undefined,
          dependencySummary: meta.dependencySummary || null,
          activityLevel: meta.activityLevel || null,
          verifiedAt: meta.verifiedAt ? new Date(meta.verifiedAt) : now,
        },
        create: {
          projectId,
          owner: meta.owner,
          repoName: meta.repoName,
          defaultBranch: meta.defaultBranch || "main",
          description: meta.description || null,
          primaryLanguage: meta.primaryLanguage || null,
          stars: meta.stars,
          forks: meta.forks,
          openIssues: meta.openIssues,
          lastUpdated: meta.lastUpdated ? new Date(meta.lastUpdated) : null,
          isArchived: meta.isArchived,
          hasReadme: meta.hasReadme,
          license: meta.license || null,
          topics: meta.topics,
          frameworkVersions: meta.frameworkVersions || undefined,
          dependencySummary: meta.dependencySummary || null,
          activityLevel: meta.activityLevel || null,
          verifiedAt: meta.verifiedAt ? new Date(meta.verifiedAt) : now,
        },
      });
    }

    await tx.projectActivity.create({
      data: {
        projectId,
        userId,
        action: "github.verified",
        summary: `Verified repository metadata (${data.verificationStatus})`,
        createdAt: now,
      },
    });
  });
}
