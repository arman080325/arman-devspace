import "dotenv/config";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  DeploymentEnvironment,
  DeploymentStatus,
  NoteType,
  PrismaClient,
  ProjectStatus,
  RoadmapStatus,
  VerificationStatus,
} from "@prisma/client";
import { isValidCalendarDate, parseCalendarDateToUtc } from "../src/lib/validations";

export interface StoredUserJson {
  id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  role?: string;
  avatarUrl?: string | null;
  supabaseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredProgressJson {
  userId: string;
  projectId: string;
  status?: string;
  completionPercentage?: number;
  bookmarked?: boolean;
  localClonePath?: string | null;
  deploymentUrl?: string | null;
  originalArchitecture?: string | null;
  modernizationArchitecture?: string | null;
  technicalDocumentation?: string | null;
  testingSummary?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredTaskJson {
  id?: string;
  projectId: string;
  userId: string;
  title: string;
  completed?: boolean;
  phase?: string;
  order?: number;
  createdAt?: string;
  completedAt?: string | null;
  updatedAt?: string;
}

export interface StoredNoteJson {
  id?: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredRoadmapItemJson {
  id?: string;
  projectId?: string;
  phase: number;
  title: string;
  description: string;
  status?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredMilestoneJson {
  id?: string;
  projectId: string;
  userId?: string;
  title: string;
  dueDate?: string | null;
  completed?: boolean;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredScreenshotJson {
  id?: string;
  projectId: string;
  userId?: string;
  title: string;
  url: string;
  caption?: string | null;
  createdAt?: string;
}

export interface StoredDeploymentJson {
  id?: string;
  projectId: string;
  userId?: string;
  environment?: string;
  url: string;
  provider?: string;
  status?: string;
  deployedAt?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredActivityJson {
  id?: string;
  projectId: string;
  userId: string;
  action: string;
  summary: string;
  createdAt?: string;
}

export interface StoredRepoOverrideJson {
  verifiedRepoUrl?: string | null;
  verificationStatus?: string;
  discrepancyNotes?: string | null;
  metadata?: {
    owner?: string;
    repoName?: string;
    defaultBranch?: string;
    description?: string | null;
    primaryLanguage?: string | null;
    stars?: number;
    forks?: number;
    openIssues?: number;
    lastUpdated?: string | null;
    isArchived?: boolean;
    hasReadme?: boolean;
    license?: string | null;
    topics?: string[];
    frameworkVersions?: Record<string, string> | null;
    dependencySummary?: string | null;
    activityLevel?: string | null;
    verifiedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export interface StoreShapeJson {
  users?: StoredUserJson[];
  progress?: Record<string, StoredProgressJson> | StoredProgressJson[];
  tasks?: StoredTaskJson[];
  notes?: StoredNoteJson[];
  roadmaps?: Record<string, StoredRoadmapItemJson[]>;
  milestones?: StoredMilestoneJson[];
  screenshots?: StoredScreenshotJson[];
  deployments?: StoredDeploymentJson[];
  activities?: StoredActivityJson[];
  repoOverrides?: Record<string, StoredRepoOverrideJson>;
}

export interface MigrationOptions {
  sourcePath?: string;
  mode: "dry-run" | "apply";
  backupDir?: string;
}

export interface MigrationPlanSummary {
  sourceExists: boolean;
  sourcePath: string;
  backupCreatedPath: string | null;
  mode: "dry-run" | "apply";
  validations: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  resolvedUsers: Record<string, string>; // jsonUserId -> prismaUserId
  counts: {
    users: { toCreate: number; toUpdate: number; skipped: number };
    progress: { toCreate: number; toUpdate: number; skipped: number };
    tasks: { toCreate: number; toUpdate: number; skipped: number };
    notes: { toCreate: number; toUpdate: number; skipped: number };
    roadmaps: { toCreate: number; toUpdate: number; skipped: number };
    milestones: { toCreate: number; toUpdate: number; skipped: number };
    screenshots: { toCreate: number; toUpdate: number; skipped: number };
    deployments: { toCreate: number; toUpdate: number; skipped: number };
    activities: { toCreate: number; toUpdate: number; skipped: number };
    repoOverrides: { toCreate: number; toUpdate: number; skipped: number };
    repoMetadata: { toCreate: number; toUpdate: number; skipped: number };
  };
}

/* ============================================================================
   TRANSFORMATION & ENUM MAPPING HELPERS
   ============================================================================ */

export function mapProjectStatus(status?: string | null): ProjectStatus {
  if (!status) return ProjectStatus.awaiting;
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "awaiting":
      return ProjectStatus.awaiting;
    case "backlog":
      return ProjectStatus.backlog;
    case "cloned":
      return ProjectStatus.cloned;
    case "analyzing":
      return ProjectStatus.analyzing;
    case "planning":
      return ProjectStatus.planning;
    case "in-development":
    case "in_development":
      return ProjectStatus.in_development;
    case "testing":
      return ProjectStatus.testing;
    case "completed":
      return ProjectStatus.completed;
    default:
      throw new Error(`Invalid ProjectStatus "${status}".`);
  }
}

export function mapVerificationStatus(status?: string | null): VerificationStatus {
  if (!status) return VerificationStatus.needs_review;
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "verified":
      return VerificationStatus.verified;
    case "needs-review":
    case "needs_review":
      return VerificationStatus.needs_review;
    case "archived":
      return VerificationStatus.archived;
    case "unavailable":
      return VerificationStatus.unavailable;
    case "incorrect-link":
    case "incorrect_link":
      return VerificationStatus.incorrect_link;
    case "collection-only":
    case "collection_only":
      return VerificationStatus.collection_only;
    default:
      throw new Error(`Invalid VerificationStatus "${status}".`);
  }
}

export function mapNoteType(type?: string | null): NoteType {
  if (!type) return NoteType.general;
  const normalized = type.trim().toLowerCase();
  switch (normalized) {
    case "general":
      return NoteType.general;
    case "architecture":
      return NoteType.architecture;
    case "bug":
      return NoteType.bug;
    case "solution":
      return NoteType.solution;
    case "learning":
      return NoteType.learning;
    default:
      throw new Error(`Invalid NoteType "${type}".`);
  }
}

export function mapRoadmapStatus(status?: string | null): RoadmapStatus {
  if (!status) return RoadmapStatus.pending;
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "pending":
      return RoadmapStatus.pending;
    case "in-progress":
    case "in_progress":
      return RoadmapStatus.in_progress;
    case "completed":
      return RoadmapStatus.completed;
    default:
      throw new Error(`Invalid RoadmapStatus "${status}".`);
  }
}

export function mapDeploymentEnvironment(env?: string | null): DeploymentEnvironment {
  if (!env) return DeploymentEnvironment.production;
  const normalized = env.trim().toLowerCase();
  switch (normalized) {
    case "preview":
      return DeploymentEnvironment.preview;
    case "staging":
      return DeploymentEnvironment.staging;
    case "production":
      return DeploymentEnvironment.production;
    default:
      throw new Error(`Invalid DeploymentEnvironment "${env}".`);
  }
}

export function mapDeploymentStatus(status?: string | null): DeploymentStatus {
  if (!status) return DeploymentStatus.active;
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "active":
      return DeploymentStatus.active;
    case "failed":
      return DeploymentStatus.failed;
    case "pending":
      return DeploymentStatus.pending;
    default:
      throw new Error(`Invalid DeploymentStatus "${status}".`);
  }
}

export function parseIsoDateOrNull(val?: string | null): Date | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid timestamp "${val}".`);
  }
  return d;
}

export function parseMilestoneDueDateOrNull(val?: string | null): Date | null {
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
   BACKUP & FILESYSTEM OPERATIONS
   ============================================================================ */

export async function createStoreBackup(
  sourcePath: string,
  backupDir: string,
): Promise<string | null> {
  if (!fs.existsSync(sourcePath)) {
    return null;
  }
  await fsp.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `devspace-store-${timestamp}.json`;
  const targetPath = path.join(backupDir, backupFileName);

  if (fs.existsSync(targetPath)) {
    throw new Error(`Backup file already exists: ${targetPath}`);
  }

  const content = await fsp.readFile(sourcePath);
  await fsp.writeFile(targetPath, content);

  // Verification read
  const readBack = await fsp.readFile(targetPath);
  if (Buffer.compare(content, readBack) !== 0) {
    throw new Error(`Backup verification failed: ${targetPath} does not match source.`);
  }

  return targetPath;
}

/* ============================================================================
   VALIDATION & RECONCILIATION ENGINE
   ============================================================================ */

export interface DbLookupContext {
  existingUsers: Array<{
    id: string;
    email: string;
    passwordHash: string | null;
    supabaseId: string | null;
    role: string;
  }>;
  existingProjectIds: Set<string>;
}

export async function fetchDbLookupContext(prisma: PrismaClient): Promise<DbLookupContext> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      passwordHash: true,
      supabaseId: true,
      role: true,
    },
  });
  const projects = await prisma.project.findMany({
    select: { id: true },
  });
  return {
    existingUsers: users,
    existingProjectIds: new Set(projects.map((p) => p.id)),
  };
}

export function validateAndPlanMigration(
  store: StoreShapeJson,
  ctx: DbLookupContext,
  options: MigrationOptions,
  backupPath: string | null,
): MigrationPlanSummary {
  const errors: string[] = [];
  const warnings: string[] = [];

  const counts: MigrationPlanSummary["counts"] = {
    users: { toCreate: 0, toUpdate: 0, skipped: 0 },
    progress: { toCreate: 0, toUpdate: 0, skipped: 0 },
    tasks: { toCreate: 0, toUpdate: 0, skipped: 0 },
    notes: { toCreate: 0, toUpdate: 0, skipped: 0 },
    roadmaps: { toCreate: 0, toUpdate: 0, skipped: 0 },
    milestones: { toCreate: 0, toUpdate: 0, skipped: 0 },
    screenshots: { toCreate: 0, toUpdate: 0, skipped: 0 },
    deployments: { toCreate: 0, toUpdate: 0, skipped: 0 },
    activities: { toCreate: 0, toUpdate: 0, skipped: 0 },
    repoOverrides: { toCreate: 0, toUpdate: 0, skipped: 0 },
    repoMetadata: { toCreate: 0, toUpdate: 0, skipped: 0 },
  };

  const resolvedUsers: Record<string, string> = {}; // jsonUserId -> prismaUserId
  const jsonUsers = Array.isArray(store.users) ? store.users : [];

  // Identity reconciliation
  const seenEmails = new Set<string>();
  for (const ju of jsonUsers) {
    if (!ju.email || !ju.id) {
      errors.push(`Malformed user entry without id or email: ${JSON.stringify(ju)}`);
      continue;
    }
    const normalizedEmail = ju.email.trim().toLowerCase();
    if (seenEmails.has(normalizedEmail)) {
      errors.push(`Duplicate email found in source JSON: ${normalizedEmail}`);
      continue;
    }
    seenEmails.add(normalizedEmail);

    // 1. Direct ID match
    const byId = ctx.existingUsers.find((u) => u.id === ju.id);
    if (byId) {
      if (byId.email.toLowerCase() !== normalizedEmail) {
        errors.push(
          `Conflict: JSON user id "${ju.id}" matches DB user id with email "${byId.email}", but JSON has "${normalizedEmail}".`,
        );
        continue;
      }
      resolvedUsers[ju.id] = byId.id;
      if (ju.passwordHash && !byId.passwordHash) {
        counts.users.toUpdate += 1;
      } else {
        counts.users.skipped += 1;
      }
      continue;
    }

    // 2. Email match (e.g., matching reference owner or existing registered user)
    const byEmail = ctx.existingUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (byEmail) {
      resolvedUsers[ju.id] = byEmail.id;
      if (ju.passwordHash && !byEmail.passwordHash) {
        counts.users.toUpdate += 1;
      } else {
        counts.users.skipped += 1;
      }
      continue;
    }

    // 3. Supabase ID match
    if (ju.supabaseId) {
      const bySub = ctx.existingUsers.find((u) => u.supabaseId === ju.supabaseId);
      if (bySub) {
        if (bySub.email.toLowerCase() !== normalizedEmail) {
          errors.push(
            `Conflict: JSON user supabaseId "${ju.supabaseId}" matches DB user with different email.`,
          );
          continue;
        }
        resolvedUsers[ju.id] = bySub.id;
        counts.users.skipped += 1;
        continue;
      }
    }

    // 4. New user to create
    resolvedUsers[ju.id] = ju.id;
    counts.users.toCreate += 1;
  }

  // Helper to resolve user ID for child models
  function resolveUser(jsonUserId: string, entityLabel: string): string | null {
    const resolved = resolvedUsers[jsonUserId];
    if (resolved) return resolved;

    // Fallback: If only one user exists in JSON or DB owner exists, check if jsonUserId matches DB by ID
    const directMatch = ctx.existingUsers.find((u) => u.id === jsonUserId);
    if (directMatch) {
      resolvedUsers[jsonUserId] = directMatch.id;
      return directMatch.id;
    }

    // If store has only 1 user, map to that resolved user
    if (jsonUsers.length === 1 && resolvedUsers[jsonUsers[0].id]) {
      const mapped = resolvedUsers[jsonUsers[0].id];
      warnings.push(
        `${entityLabel} references unmapped user "${jsonUserId}", mapped to single store user "${mapped}".`,
      );
      return mapped;
    }

    // If no user in JSON but user-arman exists in DB and jsonUserId is empty/owner
    if (jsonUsers.length === 0 && ctx.existingUsers.length === 1) {
      return ctx.existingUsers[0].id;
    }

    errors.push(`${entityLabel} references unresolvable user ID "${jsonUserId}".`);
    return null;
  }

  // Validate Project Progress
  const rawProgressList: StoredProgressJson[] = Array.isArray(store.progress)
    ? store.progress
    : store.progress
      ? Object.values(store.progress)
      : [];

  const seenProgressKeys = new Set<string>();
  for (const prog of rawProgressList) {
    if (!prog.projectId) {
      errors.push(`Progress entry missing projectId: ${JSON.stringify(prog)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(prog.projectId)) {
      errors.push(`Progress references unknown projectId "${prog.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(prog.userId, `Progress for ${prog.projectId}`);
    if (!resolvedUid) continue;

    const key = `${resolvedUid}:${prog.projectId}`;
    if (seenProgressKeys.has(key)) {
      errors.push(`Duplicate progress entry for ${key}.`);
      continue;
    }
    seenProgressKeys.add(key);

    try {
      mapProjectStatus(prog.status);
      parseIsoDateOrNull(prog.startedAt);
      parseIsoDateOrNull(prog.completedAt);
      parseIsoDateOrNull(prog.lastAccessedAt);
    } catch (err) {
      errors.push(`Invalid progress fields: ${(err as Error).message}`);
    }
    counts.progress.toCreate += 1;
  }

  // Validate Tasks
  const rawTasks = Array.isArray(store.tasks) ? store.tasks : [];
  for (const task of rawTasks) {
    if (!task.projectId || !task.title) {
      errors.push(`Malformed task without projectId or title: ${JSON.stringify(task)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(task.projectId)) {
      errors.push(`Task references unknown projectId "${task.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(task.userId, `Task "${task.title}"`);
    if (!resolvedUid) continue;

    try {
      parseIsoDateOrNull(task.createdAt);
      parseIsoDateOrNull(task.completedAt);
    } catch (err) {
      errors.push(`Task date error: ${(err as Error).message}`);
    }
    counts.tasks.toCreate += 1;
  }

  // Validate Notes
  const rawNotes = Array.isArray(store.notes) ? store.notes : [];
  for (const note of rawNotes) {
    if (!note.projectId || !note.title || !note.content) {
      errors.push(`Malformed note without projectId/title/content: ${JSON.stringify(note)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(note.projectId)) {
      errors.push(`Note references unknown projectId "${note.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(note.userId, `Note "${note.title}"`);
    if (!resolvedUid) continue;

    try {
      mapNoteType(note.type);
      parseIsoDateOrNull(note.createdAt);
      parseIsoDateOrNull(note.updatedAt);
    } catch (err) {
      errors.push(`Note field error: ${(err as Error).message}`);
    }
    counts.notes.toCreate += 1;
  }

  // Validate Roadmaps
  const rawRoadmaps = store.roadmaps ?? {};
  for (const [key, items] of Object.entries(rawRoadmaps)) {
    // Key is either `${userId}:${projectId}` or `${projectId}`
    let keyUserId: string | null = null;
    let keyProjectId: string = key;
    if (key.includes(":")) {
      const parts = key.split(":");
      keyUserId = parts[0];
      keyProjectId = parts[1];
    }

    if (!ctx.existingProjectIds.has(keyProjectId)) {
      errors.push(`Roadmap references unknown projectId "${keyProjectId}".`);
      continue;
    }

    const resolvedUid = resolveUser(keyUserId || jsonUsers[0]?.id || "", `Roadmap for ${key}`);
    if (!resolvedUid) continue;

    const seenPhases = new Set<number>();
    for (const item of items) {
      if (typeof item.phase !== "number" || !item.title) {
        errors.push(`Roadmap item missing phase or title for ${key}.`);
        continue;
      }
      if (seenPhases.has(item.phase)) {
        errors.push(`Duplicate roadmap phase ${item.phase} for project ${keyProjectId}.`);
        continue;
      }
      seenPhases.add(item.phase);

      try {
        mapRoadmapStatus(item.status);
        parseIsoDateOrNull(item.createdAt);
        parseIsoDateOrNull(item.updatedAt);
      } catch (err) {
        errors.push(`Roadmap field error: ${(err as Error).message}`);
      }
      counts.roadmaps.toCreate += 1;
    }
  }

  // Validate Milestones
  const rawMilestones = Array.isArray(store.milestones) ? store.milestones : [];
  for (const m of rawMilestones) {
    if (!m.projectId || !m.title) {
      errors.push(`Malformed milestone without projectId or title: ${JSON.stringify(m)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(m.projectId)) {
      errors.push(`Milestone references unknown projectId "${m.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(m.userId || jsonUsers[0]?.id || "", `Milestone "${m.title}"`);
    if (!resolvedUid) continue;

    try {
      parseMilestoneDueDateOrNull(m.dueDate);
      parseIsoDateOrNull(m.completedAt);
      parseIsoDateOrNull(m.createdAt);
    } catch (err) {
      errors.push(`Milestone error: ${(err as Error).message}`);
    }
    counts.milestones.toCreate += 1;
  }

  // Validate Screenshots
  const rawScreenshots = Array.isArray(store.screenshots) ? store.screenshots : [];
  for (const s of rawScreenshots) {
    if (!s.projectId || !s.title || !s.url) {
      errors.push(`Malformed screenshot without projectId, title or url: ${JSON.stringify(s)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(s.projectId)) {
      errors.push(`Screenshot references unknown projectId "${s.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(s.userId || jsonUsers[0]?.id || "", `Screenshot "${s.title}"`);
    if (!resolvedUid) continue;

    try {
      parseIsoDateOrNull(s.createdAt);
    } catch (err) {
      errors.push(`Screenshot error: ${(err as Error).message}`);
    }
    counts.screenshots.toCreate += 1;
  }

  // Validate Deployments
  const rawDeployments = Array.isArray(store.deployments) ? store.deployments : [];
  for (const d of rawDeployments) {
    if (!d.projectId || !d.url) {
      errors.push(`Malformed deployment without projectId or url: ${JSON.stringify(d)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(d.projectId)) {
      errors.push(`Deployment references unknown projectId "${d.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(d.userId || jsonUsers[0]?.id || "", `Deployment "${d.url}"`);
    if (!resolvedUid) continue;

    try {
      mapDeploymentEnvironment(d.environment);
      mapDeploymentStatus(d.status);
      parseIsoDateOrNull(d.deployedAt);
      parseIsoDateOrNull(d.createdAt);
    } catch (err) {
      errors.push(`Deployment error: ${(err as Error).message}`);
    }
    counts.deployments.toCreate += 1;
  }

  // Validate Activities
  const rawActivities = Array.isArray(store.activities) ? store.activities : [];
  for (const a of rawActivities) {
    if (!a.projectId || !a.action || !a.summary) {
      errors.push(`Malformed activity without projectId, action or summary: ${JSON.stringify(a)}`);
      continue;
    }
    if (!ctx.existingProjectIds.has(a.projectId)) {
      errors.push(`Activity references unknown projectId "${a.projectId}".`);
      continue;
    }
    const resolvedUid = resolveUser(a.userId, `Activity "${a.action}"`);
    if (!resolvedUid) continue;

    try {
      parseIsoDateOrNull(a.createdAt);
    } catch (err) {
      errors.push(`Activity date error: ${(err as Error).message}`);
    }
    counts.activities.toCreate += 1;
  }

  // Validate Repo Overrides
  const rawOverrides = store.repoOverrides ?? {};
  for (const [projectId, ov] of Object.entries(rawOverrides)) {
    if (!ctx.existingProjectIds.has(projectId)) {
      errors.push(`Repo override references unknown projectId "${projectId}".`);
      continue;
    }
    try {
      if (ov.verificationStatus) {
        mapVerificationStatus(ov.verificationStatus);
      }
      counts.repoOverrides.toUpdate += 1;

      if (ov.metadata) {
        parseIsoDateOrNull(ov.metadata.lastUpdated);
        parseIsoDateOrNull(ov.metadata.verifiedAt);
        counts.repoMetadata.toCreate += 1;
      }
    } catch (err) {
      errors.push(`Repo override error for ${projectId}: ${(err as Error).message}`);
    }
  }

  return {
    sourceExists: true,
    sourcePath: options.sourcePath || "data/devspace-store.json",
    backupCreatedPath: backupPath,
    mode: options.mode,
    validations: {
      passed: errors.length === 0,
      errors,
      warnings,
    },
    resolvedUsers,
    counts,
  };
}

/* ============================================================================
   TRANSACTIONAL EXECUTION (APPLY MODE)
   ============================================================================ */

export async function executeMigrationApply(
  prisma: PrismaClient,
  store: StoreShapeJson,
  plan: MigrationPlanSummary,
): Promise<{ success: boolean; error?: string }> {
  if (!plan.validations.passed) {
    throw new Error(
      `Cannot execute migration: dry-run validation failed with ${plan.validations.errors.length} errors.`,
    );
  }

  const jsonUsers = Array.isArray(store.users) ? store.users : [];
  const rawProgressList: StoredProgressJson[] = Array.isArray(store.progress)
    ? store.progress
    : store.progress
      ? Object.values(store.progress)
      : [];
  const rawTasks = Array.isArray(store.tasks) ? store.tasks : [];
  const rawNotes = Array.isArray(store.notes) ? store.notes : [];
  const rawRoadmaps = store.roadmaps ?? {};
  const rawMilestones = Array.isArray(store.milestones) ? store.milestones : [];
  const rawScreenshots = Array.isArray(store.screenshots) ? store.screenshots : [];
  const rawDeployments = Array.isArray(store.deployments) ? store.deployments : [];
  const rawActivities = Array.isArray(store.activities) ? store.activities : [];
  const rawOverrides = store.repoOverrides ?? {};

  await prisma.$transaction(async (tx) => {
    // 1. Users
    for (const ju of jsonUsers) {
      const resolvedId = plan.resolvedUsers[ju.id];
      const normalizedEmail = ju.email.trim().toLowerCase();
      const existing = await tx.user.findFirst({
        where: { OR: [{ id: resolvedId }, { email: normalizedEmail }] },
      });

      if (existing) {
        if (ju.passwordHash && !existing.passwordHash) {
          await tx.user.update({
            where: { id: existing.id },
            data: { passwordHash: ju.passwordHash },
          });
        }
      } else {
        await tx.user.create({
          data: {
            id: resolvedId,
            email: normalizedEmail,
            name: ju.name.trim(),
            passwordHash: ju.passwordHash || null,
            role: ju.role === "developer" ? "developer" : "owner",
            avatarUrl: ju.avatarUrl || null,
            supabaseId: ju.supabaseId || null,
            createdAt: parseIsoDateOrNull(ju.createdAt) || new Date(),
          },
        });
      }
    }

    // 2. Project Progress
    for (const prog of rawProgressList) {
      const resolvedUid = plan.resolvedUsers[prog.userId] || prog.userId;
      const status = mapProjectStatus(prog.status);
      await tx.userProjectProgress.upsert({
        where: {
          userId_projectId: {
            userId: resolvedUid,
            projectId: prog.projectId,
          },
        },
        update: {
          status,
          completionPercentage: prog.completionPercentage ?? 0,
          bookmarked: prog.bookmarked ?? false,
          localClonePath: prog.localClonePath || null,
          deploymentUrl: prog.deploymentUrl || null,
          originalArchitecture: prog.originalArchitecture || null,
          modernizationArchitecture: prog.modernizationArchitecture || null,
          technicalDocumentation: prog.technicalDocumentation || null,
          testingSummary: prog.testingSummary || null,
          startedAt: parseIsoDateOrNull(prog.startedAt),
          completedAt: parseIsoDateOrNull(prog.completedAt),
          lastAccessedAt: parseIsoDateOrNull(prog.lastAccessedAt) || new Date(),
        },
        create: {
          userId: resolvedUid,
          projectId: prog.projectId,
          status,
          completionPercentage: prog.completionPercentage ?? 0,
          bookmarked: prog.bookmarked ?? false,
          localClonePath: prog.localClonePath || null,
          deploymentUrl: prog.deploymentUrl || null,
          originalArchitecture: prog.originalArchitecture || null,
          modernizationArchitecture: prog.modernizationArchitecture || null,
          technicalDocumentation: prog.technicalDocumentation || null,
          testingSummary: prog.testingSummary || null,
          startedAt: parseIsoDateOrNull(prog.startedAt),
          completedAt: parseIsoDateOrNull(prog.completedAt),
          lastAccessedAt: parseIsoDateOrNull(prog.lastAccessedAt) || new Date(),
        },
      });
    }

    // 3. Tasks
    for (const task of rawTasks) {
      const resolvedUid = plan.resolvedUsers[task.userId] || task.userId;
      if (task.id) {
        const existing = await tx.projectTask.findUnique({ where: { id: task.id } });
        if (existing) continue;
      }
      await tx.projectTask.create({
        data: {
          ...(task.id ? { id: task.id } : {}),
          projectId: task.projectId,
          userId: resolvedUid,
          title: task.title,
          completed: task.completed ?? false,
          phase: task.phase || "Acquisition",
          order: task.order ?? 0,
          createdAt: parseIsoDateOrNull(task.createdAt) || new Date(),
          completedAt: parseIsoDateOrNull(task.completedAt),
        },
      });
    }

    // 4. Notes
    for (const note of rawNotes) {
      const resolvedUid = plan.resolvedUsers[note.userId] || note.userId;
      if (note.id) {
        const existing = await tx.projectNote.findUnique({ where: { id: note.id } });
        if (existing) continue;
      }
      await tx.projectNote.create({
        data: {
          ...(note.id ? { id: note.id } : {}),
          projectId: note.projectId,
          userId: resolvedUid,
          title: note.title,
          content: note.content,
          type: mapNoteType(note.type),
          createdAt: parseIsoDateOrNull(note.createdAt) || new Date(),
          updatedAt: parseIsoDateOrNull(note.updatedAt) || new Date(),
        },
      });
    }

    // 5. Roadmaps
    for (const [key, items] of Object.entries(rawRoadmaps)) {
      let keyUserId: string | null = null;
      let keyProjectId: string = key;
      if (key.includes(":")) {
        const parts = key.split(":");
        keyUserId = parts[0];
        keyProjectId = parts[1];
      }
      const resolvedUid = plan.resolvedUsers[keyUserId || ""] || keyUserId || plan.resolvedUsers[jsonUsers[0]?.id || ""];

      for (const item of items) {
        await tx.projectRoadmap.upsert({
          where: {
            userId_projectId_phase: {
              userId: resolvedUid,
              projectId: keyProjectId,
              phase: item.phase,
            },
          },
          update: {
            title: item.title,
            description: item.description,
            status: mapRoadmapStatus(item.status),
            order: item.order ?? 0,
          },
          create: {
            userId: resolvedUid,
            projectId: keyProjectId,
            phase: item.phase,
            title: item.title,
            description: item.description,
            status: mapRoadmapStatus(item.status),
            order: item.order ?? 0,
            createdAt: parseIsoDateOrNull(item.createdAt) || new Date(),
          },
        });
      }
    }

    // 6. Milestones
    for (const m of rawMilestones) {
      const resolvedUid = plan.resolvedUsers[m.userId || ""] || plan.resolvedUsers[jsonUsers[0]?.id || ""];
      if (m.id) {
        const existing = await tx.projectMilestone.findUnique({ where: { id: m.id } });
        if (existing) continue;
      }
      await tx.projectMilestone.create({
        data: {
          ...(m.id ? { id: m.id } : {}),
          projectId: m.projectId,
          userId: resolvedUid,
          title: m.title,
          dueDate: parseMilestoneDueDateOrNull(m.dueDate),
          completed: m.completed ?? false,
          completedAt: parseIsoDateOrNull(m.completedAt),
          createdAt: parseIsoDateOrNull(m.createdAt) || new Date(),
        },
      });
    }

    // 7. Screenshots
    for (const s of rawScreenshots) {
      const resolvedUid = plan.resolvedUsers[s.userId || ""] || plan.resolvedUsers[jsonUsers[0]?.id || ""];
      if (s.id) {
        const existing = await tx.projectScreenshot.findUnique({ where: { id: s.id } });
        if (existing) continue;
      }
      await tx.projectScreenshot.create({
        data: {
          ...(s.id ? { id: s.id } : {}),
          projectId: s.projectId,
          userId: resolvedUid,
          title: s.title,
          url: s.url,
          caption: s.caption || null,
          createdAt: parseIsoDateOrNull(s.createdAt) || new Date(),
        },
      });
    }

    // 8. Deployments
    for (const d of rawDeployments) {
      const resolvedUid = plan.resolvedUsers[d.userId || ""] || plan.resolvedUsers[jsonUsers[0]?.id || ""];
      if (d.id) {
        const existing = await tx.deploymentRecord.findUnique({ where: { id: d.id } });
        if (existing) continue;
      }
      await tx.deploymentRecord.create({
        data: {
          ...(d.id ? { id: d.id } : {}),
          projectId: d.projectId,
          userId: resolvedUid,
          environment: mapDeploymentEnvironment(d.environment),
          url: d.url,
          provider: d.provider || "Vercel",
          status: mapDeploymentStatus(d.status),
          deployedAt: parseIsoDateOrNull(d.deployedAt) || new Date(),
          notes: d.notes || null,
          createdAt: parseIsoDateOrNull(d.createdAt) || new Date(),
        },
      });
    }

    // 9. Activities
    for (const a of rawActivities) {
      const resolvedUid = plan.resolvedUsers[a.userId] || a.userId;
      if (a.id) {
        const existing = await tx.projectActivity.findUnique({ where: { id: a.id } });
        if (existing) continue;
      }
      await tx.projectActivity.create({
        data: {
          ...(a.id ? { id: a.id } : {}),
          projectId: a.projectId,
          userId: resolvedUid,
          action: a.action,
          summary: a.summary,
          createdAt: parseIsoDateOrNull(a.createdAt) || new Date(),
        },
      });
    }

    // 10. Repo Overrides and Metadata
    for (const [projectId, ov] of Object.entries(rawOverrides)) {
      await tx.project.update({
        where: { id: projectId },
        data: {
          ...(ov.verificationStatus ? { verificationStatus: mapVerificationStatus(ov.verificationStatus) } : {}),
          ...(ov.verifiedRepoUrl !== undefined ? { verifiedRepoUrl: ov.verifiedRepoUrl } : {}),
          ...(ov.discrepancyNotes !== undefined ? { discrepancyNotes: ov.discrepancyNotes } : {}),
        },
      });

      if (ov.metadata) {
        const meta = ov.metadata;
        await tx.repositoryMetadata.upsert({
          where: { projectId },
          update: {
            owner: meta.owner || "unknown",
            repoName: meta.repoName || "unknown",
            defaultBranch: meta.defaultBranch || "main",
            description: meta.description || null,
            primaryLanguage: meta.primaryLanguage || null,
            stars: meta.stars ?? 0,
            forks: meta.forks ?? 0,
            openIssues: meta.openIssues ?? 0,
            lastUpdated: parseIsoDateOrNull(meta.lastUpdated),
            isArchived: meta.isArchived ?? false,
            hasReadme: meta.hasReadme ?? false,
            license: meta.license || null,
            topics: meta.topics || [],
            frameworkVersions: meta.frameworkVersions || undefined,
            dependencySummary: meta.dependencySummary || null,
            activityLevel: meta.activityLevel || null,
            verifiedAt: parseIsoDateOrNull(meta.verifiedAt),
          },
          create: {
            projectId,
            owner: meta.owner || "unknown",
            repoName: meta.repoName || "unknown",
            defaultBranch: meta.defaultBranch || "main",
            description: meta.description || null,
            primaryLanguage: meta.primaryLanguage || null,
            stars: meta.stars ?? 0,
            forks: meta.forks ?? 0,
            openIssues: meta.openIssues ?? 0,
            lastUpdated: parseIsoDateOrNull(meta.lastUpdated),
            isArchived: meta.isArchived ?? false,
            hasReadme: meta.hasReadme ?? false,
            license: meta.license || null,
            topics: meta.topics || [],
            frameworkVersions: meta.frameworkVersions || undefined,
            dependencySummary: meta.dependencySummary || null,
            activityLevel: meta.activityLevel || null,
            verifiedAt: parseIsoDateOrNull(meta.verifiedAt),
          },
        });
      }
    }
  });

  return { success: true };
}

/* ============================================================================
   TOP-LEVEL MIGRATION RUNNER
   ============================================================================ */

export async function runJsonMigration(
  options: MigrationOptions,
  customPrisma?: PrismaClient,
): Promise<MigrationPlanSummary> {
  const sourcePath = path.resolve(process.cwd(), options.sourcePath || "data/devspace-store.json");
  const backupDir = path.resolve(process.cwd(), options.backupDir || "data/backups");
  const prisma = customPrisma || new PrismaClient();

  try {
    if (!fs.existsSync(sourcePath)) {
      return {
        sourceExists: false,
        sourcePath,
        backupCreatedPath: null,
        mode: options.mode,
        validations: {
          passed: true,
          errors: [],
          warnings: ["Source file does not exist. No migration needed."],
        },
        resolvedUsers: {},
        counts: {
          users: { toCreate: 0, toUpdate: 0, skipped: 0 },
          progress: { toCreate: 0, toUpdate: 0, skipped: 0 },
          tasks: { toCreate: 0, toUpdate: 0, skipped: 0 },
          notes: { toCreate: 0, toUpdate: 0, skipped: 0 },
          roadmaps: { toCreate: 0, toUpdate: 0, skipped: 0 },
          milestones: { toCreate: 0, toUpdate: 0, skipped: 0 },
          screenshots: { toCreate: 0, toUpdate: 0, skipped: 0 },
          deployments: { toCreate: 0, toUpdate: 0, skipped: 0 },
          activities: { toCreate: 0, toUpdate: 0, skipped: 0 },
          repoOverrides: { toCreate: 0, toUpdate: 0, skipped: 0 },
          repoMetadata: { toCreate: 0, toUpdate: 0, skipped: 0 },
        },
      };
    }

    // 1. Read source
    const raw = await fsp.readFile(sourcePath, "utf8");
    let store: StoreShapeJson;
    try {
      store = JSON.parse(raw) as StoreShapeJson;
    } catch (err) {
      throw new Error(`Failed to parse source JSON at ${sourcePath}: ${(err as Error).message}`);
    }

    // 2. Lookup DB context
    const dbCtx = await fetchDbLookupContext(prisma);

    // 3. In apply mode, create a verified backup first
    let backupPath: string | null = null;
    if (options.mode === "apply") {
      backupPath = await createStoreBackup(sourcePath, backupDir);
    }

    // 4. Validate & plan
    const plan = validateAndPlanMigration(store, dbCtx, options, backupPath);

    // 5. Execute if apply mode
    if (options.mode === "apply") {
      if (!plan.validations.passed) {
        throw new Error(
          `Migration aborted: Dry-run validation failed with ${plan.validations.errors.length} error(s).`,
        );
      }
      await executeMigrationApply(prisma, store, plan);
    }

    return plan;
  } finally {
    if (!customPrisma) {
      await prisma.$disconnect();
    }
  }
}

/* ============================================================================
   CLI ENTRYPOINT
   ============================================================================ */

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const fileArgIdx = args.indexOf("--file");
  const sourcePath = fileArgIdx !== -1 && args[fileArgIdx + 1] ? args[fileArgIdx + 1] : undefined;

  const mode = isApply ? "apply" : "dry-run";

  console.log(`[migrate-json] Running in ${mode.toUpperCase()} mode...`);
  const result = await runJsonMigration({ mode, sourcePath });

  console.log(`[migrate-json] Source file exists: ${result.sourceExists} (${result.sourcePath})`);
  if (!result.sourceExists) {
    console.log("[migrate-json] No JSON store found at source path. Nothing to import.");
    return;
  }

  if (result.backupCreatedPath) {
    console.log(`[migrate-json] Verified backup created at: ${result.backupCreatedPath}`);
  }

  console.log("[migrate-json] Resolved Users Mapping:", result.resolvedUsers);
  console.log("[migrate-json] Planned Entity Operations:", JSON.stringify(result.counts, null, 2));

  if (result.validations.warnings.length > 0) {
    console.warn(`[migrate-json] Warnings (${result.validations.warnings.length}):`);
    result.validations.warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (!result.validations.passed) {
    console.error(`[migrate-json] Validation ERRORS (${result.validations.errors.length}):`);
    result.validations.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`[migrate-json] Validation successful! (${mode} complete)`);
}

if (process.argv[1] && process.argv[1].includes("migrate-json")) {
  main().catch((err) => {
    console.error("[migrate-json] Fatal error:", err);
    process.exit(1);
  });
}
