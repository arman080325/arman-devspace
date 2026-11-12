import type {
  Difficulty as PrismaDifficulty,
  NoteType as PrismaNoteType,
  ProjectStatus as PrismaProjectStatus,
  RoadmapStatus as PrismaRoadmapStatus,
  VerificationStatus as PrismaVerificationStatus,
  DeploymentEnvironment as PrismaDeploymentEnvironment,
  DeploymentStatus as PrismaDeploymentStatus,
} from "@prisma/client";
import type {
  Difficulty,
  NoteType,
  ProjectStatus,
  VerificationStatus,
  DeploymentRecord,
  ProjectActivityItem,
  ProjectMilestone,
  ProjectNote,
  ProjectRoadmapItem,
  ProjectScreenshot,
  RepositoryMetadata,
} from "@/types/project";
import { isValidCalendarDate, parseCalendarDateToUtc } from "@/lib/validations";

/* ============================================================================
   ENUM MAPPERS: PRISMA -> APPLICATION DTO
   ============================================================================ */

export function toAppProjectStatus(status: PrismaProjectStatus): ProjectStatus {
  switch (status) {
    case "awaiting":
      return "awaiting";
    case "backlog":
      return "backlog";
    case "cloned":
      return "cloned";
    case "analyzing":
      return "analyzing";
    case "planning":
      return "planning";
    case "in_development":
      return "in-development";
    case "testing":
      return "testing";
    case "completed":
      return "completed";
    default:
      return "awaiting";
  }
}

export function toAppVerificationStatus(
  status: PrismaVerificationStatus,
): VerificationStatus {
  switch (status) {
    case "verified":
      return "verified";
    case "needs_review":
      return "needs-review";
    case "archived":
      return "archived";
    case "unavailable":
      return "unavailable";
    case "incorrect_link":
      return "incorrect-link";
    case "collection_only":
      return "collection-only";
    default:
      return "needs-review";
  }
}

export function toAppRoadmapStatus(
  status: PrismaRoadmapStatus,
): "pending" | "in-progress" | "completed" {
  switch (status) {
    case "pending":
      return "pending";
    case "in_progress":
      return "in-progress";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
}

export function toAppNoteType(type: PrismaNoteType): NoteType {
  return type as NoteType;
}

export function toAppDifficulty(diff: PrismaDifficulty): Difficulty {
  return diff as Difficulty;
}

export function toAppDeploymentEnvironment(
  env: PrismaDeploymentEnvironment,
): "preview" | "staging" | "production" {
  return env as "preview" | "staging" | "production";
}

export function toAppDeploymentStatus(
  status: PrismaDeploymentStatus,
): "active" | "failed" | "pending" {
  return status as "active" | "failed" | "pending";
}

/* ============================================================================
   ENUM MAPPERS: APPLICATION DTO -> PRISMA
   ============================================================================ */

export function toPrismaProjectStatus(status: ProjectStatus): PrismaProjectStatus {
  switch (status) {
    case "awaiting":
      return "awaiting";
    case "backlog":
      return "backlog";
    case "cloned":
      return "cloned";
    case "analyzing":
      return "analyzing";
    case "planning":
      return "planning";
    case "in-development":
      return "in_development";
    case "testing":
      return "testing";
    case "completed":
      return "completed";
    default:
      return "awaiting";
  }
}

export function toPrismaVerificationStatus(
  status: VerificationStatus,
): PrismaVerificationStatus {
  switch (status) {
    case "verified":
      return "verified";
    case "needs-review":
      return "needs_review";
    case "archived":
      return "archived";
    case "unavailable":
      return "unavailable";
    case "incorrect-link":
      return "incorrect_link";
    case "collection-only":
      return "collection_only";
    default:
      return "needs_review";
  }
}

export function toPrismaRoadmapStatus(
  status: "pending" | "in-progress" | "completed",
): PrismaRoadmapStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "in-progress":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
}

/* ============================================================================
   DATE & CALENDAR MAPPERS
   ============================================================================ */

export function toIsoStringOrNull(d?: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export function toIsoString(d: Date): string {
  return d.toISOString();
}

/** Formats a Date as YYYY-MM-DD in UTC without timezone shifting. */
export function toCalendarDateStringOrNull(d?: Date | null): string | null {
  if (!d) return null;
  const iso = d.toISOString();
  return iso.slice(0, 10);
}

export function parseMilestoneDueDate(val?: string | null): Date | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (!isValidCalendarDate(trimmed)) {
      throw new Error(`Invalid calendar milestone dueDate "${val}".`);
    }
    return parseCalendarDateToUtc(trimmed);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid milestone dueDate "${val}".`);
  }
  return d;
}

/* ============================================================================
   RECORD MAPPERS: PRISMA RECORDS -> APPLICATION DTOs
   ============================================================================ */

export function mapPrismaMilestone(raw: {
  id: string;
  projectId: string;
  title: string;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
}): ProjectMilestone {
  return {
    id: raw.id,
    projectId: raw.projectId,
    title: raw.title,
    dueDate: toCalendarDateStringOrNull(raw.dueDate),
    completed: raw.completed,
    completedAt: toIsoStringOrNull(raw.completedAt),
  };
}

export function mapPrismaScreenshot(raw: {
  id: string;
  projectId: string;
  title: string;
  url: string;
  caption: string | null;
  createdAt: Date;
}): ProjectScreenshot {
  return {
    id: raw.id,
    projectId: raw.projectId,
    title: raw.title,
    url: raw.url,
    caption: raw.caption,
    createdAt: toIsoString(raw.createdAt),
  };
}

export function mapPrismaDeployment(raw: {
  id: string;
  projectId: string;
  environment: PrismaDeploymentEnvironment;
  url: string;
  provider: string;
  status: PrismaDeploymentStatus;
  deployedAt: Date;
  notes: string | null;
}): DeploymentRecord {
  return {
    id: raw.id,
    projectId: raw.projectId,
    environment: toAppDeploymentEnvironment(raw.environment),
    url: raw.url,
    provider: raw.provider,
    status: toAppDeploymentStatus(raw.status),
    deployedAt: toIsoString(raw.deployedAt),
    notes: raw.notes,
  };
}

export function mapPrismaActivity(raw: {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  summary: string;
  createdAt: Date;
}): ProjectActivityItem {
  return {
    id: raw.id,
    projectId: raw.projectId,
    userId: raw.userId,
    action: raw.action,
    summary: raw.summary,
    createdAt: toIsoString(raw.createdAt),
  };
}

export function mapPrismaNote(raw: {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  type: PrismaNoteType;
  createdAt: Date;
  updatedAt: Date;
}): ProjectNote {
  return {
    id: raw.id,
    projectId: raw.projectId,
    userId: raw.userId,
    title: raw.title,
    content: raw.content,
    type: toAppNoteType(raw.type),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  };
}

export function mapPrismaRoadmap(raw: {
  id: string;
  projectId: string;
  phase: number;
  title: string;
  description: string;
  status: PrismaRoadmapStatus;
  order: number;
}): ProjectRoadmapItem {
  return {
    id: raw.id,
    projectId: raw.projectId,
    phase: raw.phase,
    title: raw.title,
    description: raw.description,
    status: toAppRoadmapStatus(raw.status),
    order: raw.order,
  };
}

export function mapPrismaRepoMetadata(raw: {
  projectId: string;
  owner: string;
  repoName: string;
  defaultBranch: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  lastUpdated: Date | null;
  isArchived: boolean;
  hasReadme: boolean;
  license: string | null;
  topics: string[];
  frameworkVersions: unknown;
  dependencySummary: string | null;
  activityLevel: string | null;
  verifiedAt: Date | null;
}): RepositoryMetadata {
  return {
    projectId: raw.projectId,
    owner: raw.owner,
    repoName: raw.repoName,
    defaultBranch: raw.defaultBranch,
    description: raw.description,
    primaryLanguage: raw.primaryLanguage,
    stars: raw.stars,
    forks: raw.forks,
    openIssues: raw.openIssues,
    lastUpdated: toIsoStringOrNull(raw.lastUpdated),
    isArchived: raw.isArchived,
    hasReadme: raw.hasReadme,
    license: raw.license,
    topics: raw.topics,
    frameworkVersions: (raw.frameworkVersions as Record<string, string>) ?? undefined,
    dependencySummary: raw.dependencySummary,
    activityLevel:
      (raw.activityLevel as RepositoryMetadata["activityLevel"]) ?? undefined,
    verifiedAt: toIsoStringOrNull(raw.verifiedAt),
  };
}
