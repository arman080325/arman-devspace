import type { ExplorerViewMode } from "@/components/explorer/explorer-toolbar";
import { getSafeRedirectPath } from "@/lib/validations";

export type LandingRoute = "/dashboard" | "/projects" | "/activity" | "/kanban";
export type MotionPreference = "system" | "reduce";
export type DensityPreference = "comfortable" | "compact";

export interface WorkspacePreferences {
  landingRoute: LandingRoute;
  explorerView: ExplorerViewMode;
  reduceMotion: MotionPreference;
  density: DensityPreference;
}

export const PREFERENCES_STORAGE_KEY = "devspace:prefs:v1";
export const PREFERENCES_CHANGED_EVENT = "devspace:prefs-changed";

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  landingRoute: "/dashboard",
  explorerView: "field",
  reduceMotion: "system",
  density: "comfortable",
};

const VALID_LANDING_ROUTES = new Set<LandingRoute>([
  "/dashboard",
  "/projects",
  "/activity",
  "/kanban",
]);
const VALID_EXPLORER_VIEWS = new Set<ExplorerViewMode>(["field", "plates", "list"]);

let cachedRawJson: string | null = null;
let cachedPreferences: WorkspacePreferences = DEFAULT_WORKSPACE_PREFERENCES;

export function sanitizeWorkspacePreferences(
  input: Partial<WorkspacePreferences> | null | undefined,
): WorkspacePreferences {
  if (!input || typeof input !== "object") {
    return DEFAULT_WORKSPACE_PREFERENCES;
  }

  const landingCandidate =
    typeof input.landingRoute === "string"
      ? getSafeRedirectPath(input.landingRoute, "/dashboard")
      : "/dashboard";
  const landingRoute: LandingRoute = VALID_LANDING_ROUTES.has(
    landingCandidate as LandingRoute,
  )
    ? (landingCandidate as LandingRoute)
    : "/dashboard";

  const explorerView: ExplorerViewMode = VALID_EXPLORER_VIEWS.has(
    input.explorerView as ExplorerViewMode,
  )
    ? (input.explorerView as ExplorerViewMode)
    : "field";

  const reduceMotion: MotionPreference =
    input.reduceMotion === "reduce" ? "reduce" : "system";
  const density: DensityPreference =
    input.density === "compact" ? "compact" : "comfortable";

  return {
    landingRoute,
    explorerView,
    reduceMotion,
    density,
  };
}

export function loadWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_WORKSPACE_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      cachedRawJson = null;
      cachedPreferences = DEFAULT_WORKSPACE_PREFERENCES;
      return DEFAULT_WORKSPACE_PREFERENCES;
    }
    if (raw === cachedRawJson) {
      return cachedPreferences;
    }
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;
    cachedRawJson = raw;
    cachedPreferences = sanitizeWorkspacePreferences(parsed);
    return cachedPreferences;
  } catch {
    return cachedPreferences;
  }
}

export function subscribeWorkspacePreferences(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onChange = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === PREFERENCES_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener(PREFERENCES_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PREFERENCES_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function applyWorkspacePreferences(prefs: WorkspacePreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (prefs.reduceMotion === "reduce") {
    root.setAttribute("data-motion", "reduce");
  } else {
    root.removeAttribute("data-motion");
  }

  if (prefs.density === "compact") {
    root.setAttribute("data-density", "compact");
  } else {
    root.removeAttribute("data-density");
  }
}

export function saveWorkspacePreferences(patch: Partial<WorkspacePreferences>): {
  preferences: WorkspacePreferences;
  persisted: boolean;
} {
  const current = loadWorkspacePreferences();
  const next = sanitizeWorkspacePreferences({ ...current, ...patch });
  const serialized = JSON.stringify(next);
  cachedRawJson = serialized;
  cachedPreferences = next;
  applyWorkspacePreferences(next);

  if (typeof window === "undefined") {
    return { preferences: next, persisted: false };
  }

  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, serialized);
    window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT, { detail: next }));
    return { preferences: next, persisted: true };
  } catch {
    window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT, { detail: next }));
    return { preferences: next, persisted: false };
  }
}
