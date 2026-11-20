export type Phase = "exploring" | "building" | "shipped" | "breaking" | "rebuilding";
export type CellPhase = Phase | "archived" | "unknown";
export type Category =
  | "Security"
  | "Web apps"
  | "APIs & backend"
  | "DevOps & tooling"
  | "Data & ML"
  | "Experiments"
  | string;

export type Health = "good" | "fair" | "poor" | "unknown";
export type DeployState = "ready" | "failed" | "building" | "preview" | "none";
export type Severity = "error" | "warning" | "info" | "success";
export type SignalStatus = "success" | "failed" | "running" | "queued" | "canceled";
export type SignalKind = "deploy" | "ci" | "health" | "release" | "workspace";

export const PHASES: Phase[] = [
  "exploring",
  "building",
  "shipped",
  "breaking",
  "rebuilding",
];
export const LOOP_ORDER: Phase[] = [
  "exploring",
  "building",
  "breaking",
  "rebuilding",
  "shipped",
];

export const PHASE_LABEL: Record<CellPhase, string> = {
  exploring: "Exploring",
  building: "Building",
  shipped: "Shipped",
  breaking: "Breaking",
  rebuilding: "Rebuilding",
  archived: "Archived",
  unknown: "Unknown",
};

export const PHASE_MEANING: Record<CellPhase, string> = {
  exploring: "Idea, research or spike. No stable build yet.",
  building: "Active development.",
  shipped: "Live or complete, and healthy.",
  breaking: "Needs attention: failing CI, failed deploy or degraded health.",
  rebuilding: "Refactor, rewrite, v2 or migration.",
  archived: "No longer maintained.",
  unknown: "No data yet.",
};

export const PHASE_COLOR_VAR: Record<CellPhase, string> = {
  exploring: "var(--ph-explore)",
  building: "var(--ph-build)",
  shipped: "var(--ph-ship)",
  breaking: "var(--ph-break)",
  rebuilding: "var(--ph-rebuild)",
  archived: "var(--text-muted)",
  unknown: "var(--border-default)",
};

export const CATEGORIES: string[] = [
  "Security",
  "Web apps",
  "APIs & backend",
  "DevOps & tooling",
  "Data & ML",
  "Experiments",
];

export const HEALTH_LABEL: Record<Health, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  unknown: "Unknown",
};

export const DEPLOY_LABEL: Record<DeployState, string> = {
  ready: "Live",
  failed: "Failed",
  building: "Deploying",
  preview: "Preview only",
  none: "Not deployed",
};

export const STATUS_WORD: Record<SignalStatus, string> = {
  success: "Passed",
  failed: "Failed",
  running: "Running",
  queued: "Queued",
  canceled: "Canceled",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  error: "var(--ph-break)",
  warning: "var(--warn)",
  info: "var(--ph-explore)",
  success: "var(--ph-ship)",
};

export const SEVERITY_WORD: Record<Severity, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
  success: "Success",
};

export interface SpecPlateProject {
  num: number;
  id: string; // "001" to "100"
  name: string;
  slug?: string;
  description: string;
  category?: string;
  stack: string[];
  phase: CellPhase;
  repo?: string | null;
  health?: Health;
  lastCommitH?: number | null;
  lastDeployH?: number | null;
  deploy?: DeployState;
  deployUrl?: string | null;
  stars?: number | null;
  forks?: number | null;
  openIssues?: number | null;
  openPRs?: number | null;
  pinned?: boolean;
  loops?: number;
  reason?: string | null;
  focus?: string | null;
}
