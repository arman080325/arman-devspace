/**
 * Core type definitions for Arman's Devspace.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ProjectStatus =
  | "awaiting"
  | "backlog"
  | "cloned"
  | "analyzing"
  | "planning"
  | "in-development"
  | "testing"
  | "completed";

export type VerificationStatus =
  | "verified"
  | "needs-review"
  | "archived"
  | "unavailable"
  | "incorrect-link"
  | "collection-only";

export type NoteType = "general" | "architecture" | "bug" | "solution" | "learning";

export type KanbanColumnId =
  | "backlog"
  | "cloned"
  | "analyzing"
  | "planning"
  | "in-development"
  | "testing"
  | "completed";

export interface ProjectRoadmapItem {
  id: string;
  projectId: string;
  phase: number;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  order: number;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface ProjectScreenshot {
  id: string;
  projectId: string;
  title: string;
  url: string;
  caption: string | null;
  createdAt: string;
}

export interface ProjectActivityItem {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  summary: string;
  createdAt: string;
}

export interface DeploymentRecord {
  id: string;
  projectId: string;
  environment: "preview" | "staging" | "production";
  url: string;
  provider: string;
  status: "active" | "failed" | "pending";
  deployedAt: string;
  notes: string | null;
}

export interface RepositoryMetadata {
  projectId: string;
  owner: string;
  repoName: string;
  defaultBranch: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  lastUpdated: string | null;
  isArchived: boolean;
  hasReadme: boolean;
  license: string | null;
  topics: string[];
  frameworkVersions?: Record<string, string>;
  dependencySummary?: string | null;
  activityLevel?: "active" | "moderate" | "stale" | "archived" | "unknown";
  verifiedAt: string | null;
}

export interface Project {
  id: string;
  number: number;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  complexityReviewed?: Difficulty;
  category: string;
  originalRepoUrl: string | null;
  verifiedRepoUrl: string | null;
  discrepancyNotes?: string | null;
  technologies: string[];
  status: ProjectStatus;
  verificationStatus: VerificationStatus;
  isPlaceholder: boolean;
  learningObjectives: string[];
  existingFeatures: string[];
  missingFeatures: string[];
  recommendedStack: string[];
  originalArchitecture?: string | null;
  modernizationArchitecture?: string | null;
  technicalDocumentation?: string | null;
  testingSummary?: string | null;
  localClonePath?: string | null;
  deploymentUrl?: string | null;
  bookmarked?: boolean;
  completionPercentage?: number;
  lastAccessedAt?: string | null;
  repositoryMetadata?: RepositoryMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  type: NoteType;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  completed: boolean;
  phase: string;
  order: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ProjectProgress {
  projectId: string;
  userId: string;
  status: ProjectStatus;
  completionPercentage: number;
  localClonePath: string | null;
  deploymentUrl: string | null;
  originalArchitecture: string | null;
  modernizationArchitecture: string | null;
  technicalDocumentation: string | null;
  testingSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string;
  notes: ProjectNote[];
  tasks: ProjectTask[];
  roadmap: ProjectRoadmapItem[];
  milestones: ProjectMilestone[];
  screenshots: ProjectScreenshot[];
  deployments: DeploymentRecord[];
  activities: ProjectActivityItem[];
  bookmarked: boolean;
}

export interface DifficultyInfo {
  level: Difficulty;
  label: string;
  range: string;
  count: number;
  description: string;
  outcomes: string[];
  skills: string[];
  color: string;
}

export interface CatalogueFilters {
  search: string;
  difficulty: Difficulty | "all";
  category: string;
  technology: string;
  status: ProjectStatus | "all";
  verification: VerificationStatus | "all";
  bookmarkedOnly: boolean;
  sortBy: "number" | "title" | "difficulty" | "status";
  sortOrder: "asc" | "desc";
  view: "grid" | "list";
}

export interface WorkspaceStats {
  totalProjects: number;
  definedProjects: number;
  placeholderProjects: number;
  completedProjects: number;
  inDevelopmentProjects: number;
  awaitingProjects: number;
  activeProjects: number;
  technologiesExplored: number;
  bookmarkedCount: number;
  notesCount: number;
  tasksCompleted: number;
  tasksTotal: number;
  overallCompletion: number;
  streakDays: number;
  difficultyBreakdown: {
    beginner: { total: number; completed: number; active: number };
    intermediate: { total: number; completed: number; active: number };
    advanced: { total: number; completed: number; active: number };
  };
  statusCounts: Record<ProjectStatus, number>;
  technologyDistribution: Array<{ name: string; count: number; completedCount: number }>;
  weeklyActivity: Array<{ day: string; date: string; count: number }>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "developer";
  avatarUrl?: string | null;
}
