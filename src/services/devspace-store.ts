import "server-only";

import { isDatabaseConfigured } from "@/lib/prisma";
import * as jsonStore from "@/services/json-store";
import * as prismaStore from "@/services/prisma-store";
import type {
  DeploymentRecord,
  NoteType,
  Project,
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

/* ============================================================================
   USER & AUTHENTICATION
   ============================================================================ */

export async function hasAnyRegisteredUser(): Promise<boolean> {
  if (isDatabaseConfigured()) {
    return prismaStore.hasAnyRegisteredUser();
  }
  return jsonStore.hasAnyRegisteredUser();
}

export async function registerUserAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  if (isDatabaseConfigured()) {
    return prismaStore.registerUserAccount(input);
  }
  return jsonStore.registerUserAccount(input);
}

export async function authenticateUserAccount(input: {
  email: string;
  password: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  if (isDatabaseConfigured()) {
    return prismaStore.authenticateUserAccount(input);
  }
  return jsonStore.authenticateUserAccount(input);
}

export async function syncExternalAuthUser(input: {
  email: string;
  name: string;
  supabaseId?: string;
}): Promise<SessionUser> {
  if (isDatabaseConfigured()) {
    return prismaStore.syncExternalAuthUser(input);
  }
  return jsonStore.syncExternalAuthUser(input);
}

/* ============================================================================
   PROJECT CATALOGUE & PROGRESS READS
   ============================================================================ */

export async function getAllProjects(userId?: string | null): Promise<Project[]> {
  if (isDatabaseConfigured()) {
    return prismaStore.getAllProjects(userId);
  }
  return jsonStore.getAllProjects(userId);
}

export async function getProjectDetail(
  slug: string,
  userId?: string | null,
): Promise<{
  project: Project;
  progress: ProjectProgress | null;
} | null> {
  if (isDatabaseConfigured()) {
    return prismaStore.getProjectDetail(slug, userId);
  }
  return jsonStore.getProjectDetail(slug, userId);
}

export async function getWorkspaceStats(userId?: string | null): Promise<WorkspaceStats> {
  if (isDatabaseConfigured()) {
    return prismaStore.getWorkspaceStats(userId);
  }
  return jsonStore.getWorkspaceStats(userId);
}

export async function getUserDashboardFeed(userId: string) {
  if (isDatabaseConfigured()) {
    return prismaStore.getUserDashboardFeed(userId);
  }
  return jsonStore.getUserDashboardFeed(userId);
}

export async function getAllNotesForUser(userId: string) {
  if (isDatabaseConfigured()) {
    return prismaStore.getAllNotesForUser(userId);
  }
  return jsonStore.getAllNotesForUser(userId);
}

/* ============================================================================
   MUTATIONS (PERSISTED)
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
  if (isDatabaseConfigured()) {
    return prismaStore.updateProjectProgress(userId, projectId, patch);
  }
  return jsonStore.updateProjectProgress(userId, projectId, patch);
}

export async function createProjectTask(
  userId: string,
  projectId: string,
  input: { title: string; phase: string },
): Promise<ProjectTask> {
  if (isDatabaseConfigured()) {
    return prismaStore.createProjectTask(userId, projectId, input);
  }
  return jsonStore.createProjectTask(userId, projectId, input);
}

export async function toggleProjectTask(
  userId: string,
  projectId: string,
  taskId: string,
  completed: boolean,
): Promise<ProjectTask | null> {
  if (isDatabaseConfigured()) {
    return prismaStore.toggleProjectTask(userId, projectId, taskId, completed);
  }
  return jsonStore.toggleProjectTask(userId, projectId, taskId, completed);
}

export async function deleteProjectTask(
  userId: string,
  projectId: string,
  taskId: string,
): Promise<boolean> {
  if (isDatabaseConfigured()) {
    return prismaStore.deleteProjectTask(userId, projectId, taskId);
  }
  return jsonStore.deleteProjectTask(userId, projectId, taskId);
}

export async function createProjectNote(
  userId: string,
  input: { projectId: string; title: string; content: string; type: NoteType },
): Promise<ProjectNote> {
  if (isDatabaseConfigured()) {
    return prismaStore.createProjectNote(userId, input);
  }
  return jsonStore.createProjectNote(userId, input);
}

export async function deleteProjectNote(
  userId: string,
  noteId: string,
): Promise<boolean> {
  if (isDatabaseConfigured()) {
    return prismaStore.deleteProjectNote(userId, noteId);
  }
  return jsonStore.deleteProjectNote(userId, noteId);
}

export async function updateRoadmapPhaseStatus(
  userId: string,
  projectId: string,
  roadmapId: string,
  status: ProjectRoadmapItem["status"],
): Promise<ProjectRoadmapItem[]> {
  if (isDatabaseConfigured()) {
    return prismaStore.updateRoadmapPhaseStatus(userId, projectId, roadmapId, status);
  }
  return jsonStore.updateRoadmapPhaseStatus(userId, projectId, roadmapId, status);
}

export async function createProjectMilestone(
  userId: string,
  projectId: string,
  input: { title: string; dueDate: string | null },
): Promise<ProjectMilestone> {
  if (isDatabaseConfigured()) {
    return prismaStore.createProjectMilestone(userId, projectId, input);
  }
  return jsonStore.createProjectMilestone(userId, projectId, input);
}

export async function toggleProjectMilestone(
  userId: string,
  projectId: string,
  milestoneId: string,
  completed: boolean,
): Promise<ProjectMilestone | null> {
  if (isDatabaseConfigured()) {
    return prismaStore.toggleProjectMilestone(userId, projectId, milestoneId, completed);
  }
  return jsonStore.toggleProjectMilestone(userId, projectId, milestoneId, completed);
}

export async function addDeploymentRecord(
  userId: string,
  projectId: string,
  input: Omit<DeploymentRecord, "id" | "projectId" | "deployedAt">,
): Promise<DeploymentRecord> {
  if (isDatabaseConfigured()) {
    return prismaStore.addDeploymentRecord(userId, projectId, input);
  }
  return jsonStore.addDeploymentRecord(userId, projectId, input);
}

export async function addProjectScreenshot(
  userId: string,
  projectId: string,
  input: { title: string; url: string; caption: string | null },
): Promise<ProjectScreenshot> {
  if (isDatabaseConfigured()) {
    return prismaStore.addProjectScreenshot(userId, projectId, input);
  }
  return jsonStore.addProjectScreenshot(userId, projectId, input);
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
  if (isDatabaseConfigured()) {
    return prismaStore.saveRepositoryVerification(userId, projectId, data);
  }
  return jsonStore.saveRepositoryVerification(userId, projectId, data);
}
