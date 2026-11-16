export type ActivityCategory = "repository" | "deployment" | "ci" | "workspace";

export type ActivitySeverity = "critical" | "warning" | "success" | "info";

export type ActivitySourceProvider = "github" | "vercel" | "workspace" | "system";

export interface ActivityEvent {
  id: string;
  userId: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  projectNumber: number;
  category: ActivityCategory;
  type: string;
  severity: ActivitySeverity;
  title: string;
  description: string;
  sourceProvider: ActivitySourceProvider;
  externalId?: string | null;
  dedupKey: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityPayload {
  title: string;
  description: string;
  category: ActivityCategory;
  severity: ActivitySeverity;
  sourceProvider: ActivitySourceProvider;
  externalId?: string | null;
  dedupKey: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IngestActivityInput {
  userId: string;
  projectId: string;
  category: ActivityCategory;
  type: string;
  severity: ActivitySeverity;
  title: string;
  description: string;
  sourceProvider: ActivitySourceProvider;
  externalId?: string | null;
  dedupKey: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface ActivityFeedFilters {
  page?: number;
  limit?: number;
  category?: ActivityCategory | "all";
  severity?: ActivitySeverity | "all";
  status?: "read" | "unread" | "all";
  projectSlugOrId?: string;
  search?: string;
}

export interface ActivityFeedResult {
  events: ActivityEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface SyncIntelligenceResult {
  synced: boolean;
  projectsChecked: number;
  newEventsCount: number;
  totalEventsCount: number;
  unreadCount: number;
  details?: {
    githubActionsEvents: number;
    vercelEvents: number;
    releaseEvents: number;
    healthEvents: number;
  };
}
