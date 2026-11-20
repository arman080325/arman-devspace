"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceTabs, type WorkspaceTabId } from "./workspace-tabs";
import { OverviewTab } from "./tabs/overview-tab";
import { RoadmapTab } from "./tabs/roadmap-tab";
import { MilestonesTab } from "./tabs/milestones-tab";
import { GitHubTab } from "./tabs/github-tab";
import { DeploymentsTab } from "./tabs/deployments-tab";
import { ActivityTab } from "./tabs/activity-tab";
import { DocsTab } from "./tabs/docs-tab";
import type {
  DeploymentRecord,
  NoteType,
  Project,
  ProjectMilestone,
  ProjectNote,
  ProjectProgress,
  ProjectScreenshot,
  ProjectTask,
  RoadmapStatus,
} from "@/types/project";

export interface ProjectWorkspaceProps {
  initialProject: Project;
  initialProgress: ProjectProgress | null;
  isAuthenticated: boolean;
  prevProject: { number: number; title: string; slug: string } | null;
  nextProject: { number: number; title: string; slug: string } | null;
  initialTab?: string;
}

const VALID_TABS: WorkspaceTabId[] = [
  "overview",
  "roadmap",
  "milestones",
  "github",
  "deployments",
  "activity",
  "docs",
];

export function ProjectWorkspace({
  initialProject,
  initialProgress,
  isAuthenticated,
  prevProject,
  nextProject,
  initialTab = "overview",
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-driven tab state (render derivation pattern)
  const paramTab = searchParams.get("tab") as WorkspaceTabId | null;
  const validParamTab = paramTab && VALID_TABS.includes(paramTab) ? paramTab : null;

  const [tabState, setTabState] = useState<{
    tab: WorkspaceTabId;
    prevParam: string | null;
  }>({
    tab:
      validParamTab ??
      (VALID_TABS.includes(initialTab as WorkspaceTabId)
        ? (initialTab as WorkspaceTabId)
        : "overview"),
    prevParam: paramTab,
  });

  if (paramTab !== tabState.prevParam) {
    setTabState({
      tab: validParamTab ?? "overview",
      prevParam: paramTab,
    });
  }

  const activeTab = tabState.tab;

  // Workspace Data State
  const [project, setProject] = useState<Project>(initialProject);
  const [progress, setProgress] = useState<ProjectProgress | null>(initialProgress);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Tab change handler with URL sync
  const handleTabChange = useCallback(
    (tab: WorkspaceTabId) => {
      setTabState((prev) => ({ ...prev, tab }));
      const sp = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        sp.delete("tab");
      } else {
        sp.set("tab", tab);
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const requireAuthOrRedirect = useCallback(() => {
    if (!isAuthenticated) {
      setFeedback({
        type: "error",
        text: "Please sign in to save changes to this project workspace.",
      });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return false;
    }
    return true;
  }, [isAuthenticated, pathname, router]);

  // Mutations
  const handleTogglePin = useCallback(async () => {
    if (!requireAuthOrRedirect()) return;
    const nextBookmarked = !progress?.bookmarked;

    // Optimistic UI update
    setProgress((prev) =>
      prev
        ? { ...prev, bookmarked: nextBookmarked }
        : {
            projectId: project.id,
            userId: "",
            status: project.status,
            completionPercentage: 0,
            localClonePath: null,
            deploymentUrl: null,
            originalArchitecture: null,
            modernizationArchitecture: null,
            technicalDocumentation: null,
            testingSummary: null,
            startedAt: null,
            completedAt: null,
            lastAccessedAt: new Date().toISOString(),
            notes: [],
            tasks: [],
            roadmap: [],
            milestones: [],
            screenshots: [],
            deployments: [],
            activities: [],
            bookmarked: nextBookmarked,
          },
    );

    try {
      await fetch(`/api/projects/${project.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: nextBookmarked }),
      });
      setFeedback({
        type: "success",
        text: nextBookmarked ? "Project pinned to dashboard shelf." : "Project unpinned.",
      });
    } catch {
      setProgress((prev) => (prev ? { ...prev, bookmarked: !nextBookmarked } : null));
      setFeedback({ type: "error", text: "Failed to update pinned state." });
    }
  }, [
    progress?.bookmarked,
    project.id,
    project.slug,
    project.status,
    requireAuthOrRedirect,
  ]);

  const handleUpdateFocus = useCallback(
    async (text: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modernizationArchitecture: text }),
        });
        if (!res.ok) throw new Error("Failed to save focus");
        setProgress((prev) =>
          prev ? { ...prev, modernizationArchitecture: text } : null,
        );
        setFeedback({ type: "success", text: "Project focus statement updated." });
      } catch {
        setFeedback({ type: "error", text: "Failed to save focus statement." });
        throw new Error("Failed to save focus");
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleUpdatePhaseStatus = useCallback(
    async (roadmapId: string, status: RoadmapStatus) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/roadmap`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roadmapId, status }),
        });
        if (!res.ok) throw new Error("Failed to update phase");
        const json = await res.json();
        setProgress((prev) => (prev ? { ...prev, roadmap: json.roadmap } : null));
        setFeedback({ type: "success", text: "Workflow phase status updated." });
      } catch {
        setFeedback({ type: "error", text: "Failed to update workflow phase status." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleCreateTask = useCallback(
    async (title: string, phase: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, phase }),
        });
        if (!res.ok) throw new Error("Failed to create task");
        const json = (await res.json()) as { task: ProjectTask };
        setProgress((prev) =>
          prev ? { ...prev, tasks: [...prev.tasks, json.task] } : null,
        );
        setFeedback({ type: "success", text: "Task added to checklist." });
      } catch {
        setFeedback({ type: "error", text: "Failed to add task." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleToggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!requireAuthOrRedirect()) return;
      // Optimistic
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t)),
            }
          : null,
      );

      try {
        const res = await fetch(`/api/projects/${project.slug}/tasks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, completed }),
        });
        if (!res.ok) throw new Error("Failed to toggle task");
      } catch {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId ? { ...t, completed: !completed } : t,
                ),
              }
            : null,
        );
        setFeedback({ type: "error", text: "Failed to update task completion." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/tasks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        if (!res.ok) throw new Error("Failed to delete task");
        setProgress((prev) =>
          prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null,
        );
        setFeedback({ type: "success", text: "Task removed." });
      } catch {
        setFeedback({ type: "error", text: "Failed to delete task." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleCreateMilestone = useCallback(
    async (title: string, dueDate: string | null) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, dueDate }),
        });
        if (!res.ok) throw new Error("Failed to create milestone");
        const json = (await res.json()) as { milestone: ProjectMilestone };
        setProgress((prev) =>
          prev ? { ...prev, milestones: [...prev.milestones, json.milestone] } : null,
        );
        setFeedback({ type: "success", text: "Milestone scheduled." });
      } catch {
        setFeedback({ type: "error", text: "Failed to create milestone." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleToggleMilestone = useCallback(
    async (milestoneId: string, completed: boolean) => {
      if (!requireAuthOrRedirect()) return;
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              milestones: prev.milestones.map((m) =>
                m.id === milestoneId ? { ...m, completed } : m,
              ),
            }
          : null,
      );

      try {
        const res = await fetch(`/api/projects/${project.slug}/milestones`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ milestoneId, completed }),
        });
        if (!res.ok) throw new Error("Failed to toggle milestone");
      } catch {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                milestones: prev.milestones.map((m) =>
                  m.id === milestoneId ? { ...m, completed: !completed } : m,
                ),
              }
            : null,
        );
        setFeedback({ type: "error", text: "Failed to update milestone status." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleSyncGithub = useCallback(async () => {
    if (!requireAuthOrRedirect()) return;
    try {
      const res = await fetch(`/api/github/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: [project.id], forceRefresh: true }),
      });
      if (!res.ok) throw new Error("Sync failed");
      setFeedback({ type: "success", text: "GitHub repository data refreshed." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "Failed to sync GitHub repository data." });
    }
  }, [project.id, requireAuthOrRedirect, router]);

  const handleVerifyOverride = useCallback(
    async (overrideUrl: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/github/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            overrideUrl,
            forceRefresh: true,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Verification failed");
        setProject((prev) => ({
          ...prev,
          verifiedRepoUrl: overrideUrl,
          verificationStatus: "verified",
        }));
        setFeedback({
          type: "success",
          text: "Repository URL verified and updated.",
        });
        router.refresh();
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          text: err instanceof Error ? err.message : "Repository verification failed.",
        });
      }
    },
    [project.id, requireAuthOrRedirect, router],
  );

  const handleAddDeployment = useCallback(
    async (data: {
      environment: "production" | "preview" | "staging";
      provider: string;
      deploymentUrl: string;
      notes?: string;
    }) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/deployments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to add deployment record");
        const json = (await res.json()) as { deployment: DeploymentRecord };
        setProgress((prev) =>
          prev ? { ...prev, deployments: [json.deployment, ...prev.deployments] } : null,
        );
        setFeedback({ type: "success", text: "Deployment record logged." });
      } catch {
        setFeedback({ type: "error", text: "Failed to log deployment." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleDeleteDeployment = useCallback(
    async (deploymentId: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(
          `/api/projects/${project.slug}/deployments?deploymentId=${encodeURIComponent(deploymentId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete deployment");
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                deployments: prev.deployments.filter((d) => d.id !== deploymentId),
              }
            : null,
        );
        setFeedback({ type: "success", text: "Deployment record removed." });
      } catch {
        setFeedback({ type: "error", text: "Failed to delete deployment record." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleSaveArchitectureDocs = useCallback(
    async (docs: {
      localClonePath?: string | null;
      originalArchitecture?: string | null;
      modernizationArchitecture?: string | null;
      technicalDocumentation?: string | null;
      testingSummary?: string | null;
    }) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(docs),
        });
        if (!res.ok) throw new Error("Failed to save architecture docs");
        setProgress((prev) => (prev ? { ...prev, ...docs } : null));
        setFeedback({ type: "success", text: "Architecture blueprint saved." });
      } catch {
        setFeedback({
          type: "error",
          text: "Failed to save architecture documentation.",
        });
        throw new Error("Failed to save docs");
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleCreateNote = useCallback(
    async (title: string, content: string, type: NoteType) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, type }),
        });
        if (!res.ok) throw new Error("Failed to create note");
        const json = (await res.json()) as { note: ProjectNote };
        setProgress((prev) =>
          prev ? { ...prev, notes: [json.note, ...prev.notes] } : null,
        );
        setFeedback({ type: "success", text: "Engineering note added." });
      } catch {
        setFeedback({ type: "error", text: "Failed to add note." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(
          `/api/projects/${project.slug}/notes?noteId=${encodeURIComponent(noteId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete note");
        setProgress((prev) =>
          prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } : null,
        );
        setFeedback({ type: "success", text: "Note removed." });
      } catch {
        setFeedback({ type: "error", text: "Failed to delete note." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleAddScreenshot = useCallback(
    async (title: string, url: string, caption?: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(`/api/projects/${project.slug}/screenshots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, url, caption }),
        });
        if (!res.ok) throw new Error("Failed to add screenshot");
        const json = (await res.json()) as { screenshot: ProjectScreenshot };
        setProgress((prev) =>
          prev ? { ...prev, screenshots: [json.screenshot, ...prev.screenshots] } : null,
        );
        setFeedback({ type: "success", text: "Screenshot artifact registered." });
      } catch {
        setFeedback({ type: "error", text: "Failed to register screenshot." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  const handleDeleteScreenshot = useCallback(
    async (screenshotId: string) => {
      if (!requireAuthOrRedirect()) return;
      try {
        const res = await fetch(
          `/api/projects/${project.slug}/screenshots?screenshotId=${encodeURIComponent(screenshotId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete screenshot");
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                screenshots: prev.screenshots.filter((s) => s.id !== screenshotId),
              }
            : null,
        );
        setFeedback({ type: "success", text: "Screenshot removed." });
      } catch {
        setFeedback({ type: "error", text: "Failed to remove screenshot." });
      }
    },
    [project.slug, requireAuthOrRedirect],
  );

  return (
    <div className="space-y-4">
      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-ctl px-4 py-2.5 text-xs font-medium ${
            feedback.type === "success"
              ? "border border-ship/40 bg-ship/10 text-fg"
              : "border border-break/40 bg-break/10 text-fg"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 size={14} className="text-ship shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-break shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-fg3 hover:text-fg"
            aria-label="Dismiss feedback message"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Shared Workstation Header */}
      <WorkspaceHeader
        project={project}
        progress={progress}
        prevProject={prevProject}
        nextProject={nextProject}
        currentTab={activeTab}
        onTogglePin={handleTogglePin}
        onCopySuccess={(msg) => setFeedback({ type: "success", text: msg })}
      />

      {/* Seven-Tab Navigation */}
      <WorkspaceTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        milestonesCount={progress?.milestones?.length}
        deploymentsCount={progress?.deployments?.length}
        notesCount={progress?.notes?.length}
      />

      {/* Active Tab Content Panel */}
      <main
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="outline-none"
      >
        {activeTab === "overview" && (
          <OverviewTab
            project={project}
            progress={progress}
            onNavigateTab={handleTabChange}
            onUpdateFocus={handleUpdateFocus}
          />
        )}

        {activeTab === "roadmap" && (
          <RoadmapTab
            project={project}
            progress={progress}
            onUpdatePhaseStatus={handleUpdatePhaseStatus}
            onCreateTask={handleCreateTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === "milestones" && (
          <MilestonesTab
            project={project}
            progress={progress}
            onCreateMilestone={handleCreateMilestone}
            onToggleMilestone={handleToggleMilestone}
          />
        )}

        {activeTab === "github" && (
          <GitHubTab
            project={project}
            onSyncGithub={handleSyncGithub}
            onVerifyOverride={handleVerifyOverride}
          />
        )}

        {activeTab === "deployments" && (
          <DeploymentsTab
            project={project}
            progress={progress}
            onAddDeployment={handleAddDeployment}
            onDeleteDeployment={handleDeleteDeployment}
          />
        )}

        {activeTab === "activity" && (
          <ActivityTab project={project} progress={progress} />
        )}

        {activeTab === "docs" && (
          <DocsTab
            project={project}
            progress={progress}
            onSaveArchitectureDocs={handleSaveArchitectureDocs}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onAddScreenshot={handleAddScreenshot}
            onDeleteScreenshot={handleDeleteScreenshot}
          />
        )}
      </main>
    </div>
  );
}
