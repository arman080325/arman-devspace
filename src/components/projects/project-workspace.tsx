"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FolderGit2,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Milestone as MilestoneIcon,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Sparkles,
  StickyNote,
  Terminal,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getVerificationMeta, WORKFLOW_PHASES } from "@/config/workflow";
import {
  cn,
  formatDate,
  getDifficultyBgColor,
  getDifficultyColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import {
  DEPLOYMENT_ENVIRONMENTS,
  NOTE_TYPES,
  PROJECT_STATUSES,
  ROADMAP_STATUSES,
} from "@/lib/validations";
import type {
  DeploymentRecord,
  NoteType,
  Project,
  ProjectProgress,
  ProjectRoadmapItem,
  ProjectStatus,
} from "@/types/project";

type DeploymentEnvironment = DeploymentRecord["environment"];

interface ProjectWorkspaceProps {
  initialProject: Project;
  initialProgress: ProjectProgress | null;
  isAuthenticated: boolean;
  prevProject: { number: number; title: string; slug: string } | null;
  nextProject: { number: number; title: string; slug: string } | null;
}

const SELECT_CLASSES =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const DEFAULT_ROADMAP: ProjectRoadmapItem[] = WORKFLOW_PHASES.map((phase) => ({
  id: `preview-${phase.phase}`,
  projectId: "",
  phase: phase.phase,
  title: phase.title,
  description: phase.description,
  status: "pending",
  order: phase.phase,
}));

export function ProjectWorkspace({
  initialProject,
  initialProgress,
  isAuthenticated,
  prevProject,
  nextProject,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const statusSelectId = React.useId();
  const [project, setProject] = React.useState<Project>(initialProject);
  const [progress, setProgress] = React.useState<ProjectProgress | null>(initialProgress);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedClone, setCopiedClone] = React.useState(false);

  // GitHub Verification form
  const [overrideUrl, setOverrideUrl] = React.useState(
    initialProject.verifiedRepoUrl &&
      initialProject.verifiedRepoUrl !== initialProject.originalRepoUrl
      ? initialProject.verifiedRepoUrl
      : "",
  );
  const [verifyingGithub, setVerifyingGithub] = React.useState(false);

  // Documentation & Paths form
  const [localClonePath, setLocalClonePath] = React.useState(
    initialProgress?.localClonePath ?? initialProject.localClonePath ?? "",
  );
  const [deploymentUrl, setDeploymentUrl] = React.useState(
    initialProgress?.deploymentUrl ?? initialProject.deploymentUrl ?? "",
  );
  const [originalArchitecture, setOriginalArchitecture] = React.useState(
    initialProgress?.originalArchitecture ?? initialProject.originalArchitecture ?? "",
  );
  const [modernizationArchitecture, setModernizationArchitecture] = React.useState(
    initialProgress?.modernizationArchitecture ??
      initialProject.modernizationArchitecture ??
      "",
  );
  const [technicalDocumentation, setTechnicalDocumentation] = React.useState(
    initialProgress?.technicalDocumentation ??
      initialProject.technicalDocumentation ??
      "",
  );
  const [testingSummary, setTestingSummary] = React.useState(
    initialProgress?.testingSummary ?? initialProject.testingSummary ?? "",
  );
  const [savingDocs, setSavingDocs] = React.useState(false);

  // Checklist form
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskPhase, setTaskPhase] = React.useState("Core Implementation");
  const [submittingTask, setSubmittingTask] = React.useState(false);

  // Milestone form
  const [milestoneTitle, setMilestoneTitle] = React.useState("");
  const [milestoneDue, setMilestoneDue] = React.useState("");
  const [submittingMilestone, setSubmittingMilestone] = React.useState(false);

  // Note form
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteContent, setNoteContent] = React.useState("");
  const [noteType, setNoteType] = React.useState<NoteType>("architecture");
  const [submittingNote, setSubmittingNote] = React.useState(false);

  // Deployment record form
  const [deployEnv, setDeployEnv] = React.useState<DeploymentEnvironment>("production");
  const [deployProvider, setDeployProvider] = React.useState("Vercel");
  const [deployRecordUrl, setDeployRecordUrl] = React.useState("");
  const [deployNotes, setDeployNotes] = React.useState("");
  const [submittingDeploy, setSubmittingDeploy] = React.useState(false);

  // Screenshot form
  const [shotTitle, setShotTitle] = React.useState("");
  const [shotUrl, setShotUrl] = React.useState("");
  const [shotCaption, setShotCaption] = React.useState("");
  const [submittingShot, setSubmittingShot] = React.useState(false);

  const paddedNumber = String(project.number).padStart(3, "0");
  const verificationMeta = getVerificationMeta(project.verificationStatus);
  const repoHref = project.verifiedRepoUrl ?? project.originalRepoUrl?.trim() ?? null;
  const roadmapItems = progress?.roadmap ?? DEFAULT_ROADMAP;
  const tasks = progress?.tasks ?? [];
  const notes = progress?.notes ?? [];
  const milestones = progress?.milestones ?? [];
  const deployments = progress?.deployments ?? [];
  const screenshots = progress?.screenshots ?? [];
  const activities = progress?.activities ?? [];

  const handleUnauthorized = () => {
    setFeedback({
      type: "error",
      text: "Sign in to persist workspace changes. Redirecting to login...",
    });
    router.push(`/login?redirect=${encodeURIComponent(`/projects/${project.slug}`)}`);
  };

  const handleCopyClone = async () => {
    if (!repoHref) return;
    try {
      await navigator.clipboard.writeText(`git clone ${repoHref}`);
      setCopiedClone(true);
      setTimeout(() => setCopiedClone(false), 1800);
    } catch {
      setFeedback({
        type: "error",
        text: "Clipboard access was denied by browser.",
      });
    }
  };

  const patchProgress = async (
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await response.json()) as {
        error?: string;
        progress?: {
          status: ProjectStatus;
          completionPercentage: number;
          bookmarked: boolean;
          localClonePath: string | null;
          deploymentUrl: string | null;
        };
      };
      if (!response.ok || !json.progress) {
        setFeedback({
          type: "error",
          text: json.error ?? "Failed to update project workspace.",
        });
        return;
      }

      setProject((prev) => ({
        ...prev,
        status: json.progress!.status,
        completionPercentage: json.progress!.completionPercentage,
        bookmarked: json.progress!.bookmarked,
        localClonePath: json.progress!.localClonePath,
        deploymentUrl: json.progress!.deploymentUrl,
      }));
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: json.progress!.status,
              completionPercentage: json.progress!.completionPercentage,
              bookmarked: json.progress!.bookmarked,
            }
          : prev,
      );
      setFeedback({ type: "success", text: successMessage });
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while saving workspace progress.",
      });
    }
  };

  const handleSaveDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDocs(true);
    await patchProgress(
      {
        localClonePath,
        deploymentUrl,
        originalArchitecture,
        modernizationArchitecture,
        technicalDocumentation,
        testingSummary,
      },
      "Saved documentation, clone path, and testing report.",
    );
    setSavingDocs(false);
  };

  const handleVerifyGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    setVerifyingGithub(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/github/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          overrideUrl: overrideUrl.trim(),
        }),
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await response.json()) as {
        error?: string;
        verification?: {
          verificationStatus: Project["verificationStatus"];
          verifiedRepoUrl: string | null;
          discrepancyNotes: string | null;
          metadata: Project["repositoryMetadata"];
        };
      };

      if (!response.ok || !json.verification) {
        setFeedback({
          type: "error",
          text: json.error ?? "Repository verification failed.",
        });
        return;
      }

      setProject((prev) => ({
        ...prev,
        verificationStatus: json.verification!.verificationStatus,
        verifiedRepoUrl: json.verification!.verifiedRepoUrl,
        discrepancyNotes: json.verification!.discrepancyNotes,
        repositoryMetadata: json.verification!.metadata
          ? { ...json.verification!.metadata, projectId: project.id }
          : null,
      }));
      setFeedback({
        type: "success",
        text: `GitHub verification completed (${json.verification.verificationStatus}).`,
      });
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Failed to contact GitHub verification service.",
      });
    } finally {
      setVerifyingGithub(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    if (!taskTitle.trim()) return;
    setSubmittingTask(true);

    try {
      const res = await fetch(`/api/projects/${project.slug}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle, phase: taskPhase }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await res.json()) as {
        error?: string;
        task?: ProjectProgress["tasks"][number];
      };
      if (!res.ok || !json.task) {
        setFeedback({ type: "error", text: json.error ?? "Could not add task." });
        return;
      }
      setProgress((prev) => {
        if (!prev) return prev;
        const nextTasks = [...prev.tasks, json.task!];
        const done = nextTasks.filter((t) => t.completed).length;
        return {
          ...prev,
          tasks: nextTasks,
          completionPercentage: Math.round((done / nextTasks.length) * 100),
        };
      });
      setTaskTitle("");
      setFeedback({ type: "success", text: "Checklist task added." });
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleToggleTask = async (taskId: string, nextCompleted: boolean) => {
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    const res = await fetch(`/api/projects/${project.slug}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, completed: nextCompleted }),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = (await res.json()) as {
      task?: ProjectProgress["tasks"][number];
    };
    if (res.ok && json.task) {
      setProgress((prev) => {
        if (!prev) return prev;
        const nextTasks = prev.tasks.map((t) => (t.id === taskId ? json.task! : t));
        const done = nextTasks.filter((t) => t.completed).length;
        const pct = Math.round((done / Math.max(nextTasks.length, 1)) * 100);
        setProject((p) => ({ ...p, completionPercentage: pct }));
        return { ...prev, tasks: nextTasks, completionPercentage: pct };
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    const res = await fetch(
      `/api/projects/${project.slug}/tasks?taskId=${encodeURIComponent(taskId)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setProgress((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : prev,
      );
      setFeedback({ type: "success", text: "Task removed." });
    }
  };

  const handleRoadmapChange = async (
    roadmapId: string,
    nextStatus: ProjectRoadmapItem["status"],
  ) => {
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    const res = await fetch(`/api/projects/${project.slug}/roadmap`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roadmapId, status: nextStatus }),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = (await res.json()) as { roadmap?: ProjectRoadmapItem[] };
    if (res.ok && json.roadmap) {
      setProgress((prev) => (prev ? { ...prev, roadmap: json.roadmap! } : prev));
      setFeedback({ type: "success", text: "Roadmap phase updated." });
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    if (!milestoneTitle.trim()) return;
    setSubmittingMilestone(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: milestoneTitle,
          dueDate: milestoneDue || null,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await res.json()) as {
        error?: string;
        milestone?: ProjectProgress["milestones"][number];
      };
      if (!res.ok || !json.milestone) {
        setFeedback({
          type: "error",
          text: json.error ?? "Failed to create milestone.",
        });
        return;
      }
      setProgress((prev) =>
        prev ? { ...prev, milestones: [...prev.milestones, json.milestone!] } : prev,
      );
      setMilestoneTitle("");
      setMilestoneDue("");
      setFeedback({ type: "success", text: "Milestone added." });
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: string, completed: boolean) => {
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    const res = await fetch(`/api/projects/${project.slug}/milestones`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestoneId, completed }),
    });
    const json = (await res.json()) as {
      milestone?: ProjectProgress["milestones"][number];
    };
    if (res.ok && json.milestone) {
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              milestones: prev.milestones.map((m) =>
                m.id === milestoneId ? json.milestone! : m,
              ),
            }
          : prev,
      );
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          type: noteType,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await res.json()) as {
        error?: string;
        note?: ProjectProgress["notes"][number];
      };
      if (!res.ok || !json.note) {
        setFeedback({ type: "error", text: json.error ?? "Failed to save note." });
        return;
      }
      setProgress((prev) =>
        prev ? { ...prev, notes: [json.note!, ...prev.notes] } : prev,
      );
      setNoteTitle("");
      setNoteContent("");
      setFeedback({ type: "success", text: "Engineering note recorded." });
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    const res = await fetch(
      `/api/projects/${project.slug}/notes?noteId=${encodeURIComponent(noteId)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setProgress((prev) =>
        prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } : prev,
      );
      setFeedback({ type: "success", text: "Note deleted." });
    }
  };

  const handleAddDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    setSubmittingDeploy(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: deployEnv,
          provider: deployProvider,
          url: deployRecordUrl,
          status: "active",
          notes: deployNotes || null,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await res.json()) as {
        error?: string;
        deployment?: ProjectProgress["deployments"][number];
      };
      if (!res.ok || !json.deployment) {
        setFeedback({
          type: "error",
          text: json.error ?? "Failed to record deployment.",
        });
        return;
      }
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              deployments: [json.deployment!, ...prev.deployments],
            }
          : prev,
      );
      setDeploymentUrl(json.deployment.url);
      setDeployRecordUrl("");
      setDeployNotes("");
      setFeedback({ type: "success", text: "Deployment record added." });
    } finally {
      setSubmittingDeploy(false);
    }
  };

  const handleAddScreenshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleUnauthorized();
      return;
    }
    setSubmittingShot(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/screenshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: shotTitle,
          url: shotUrl,
          caption: shotCaption || null,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = (await res.json()) as {
        error?: string;
        screenshot?: ProjectProgress["screenshots"][number];
      };
      if (!res.ok || !json.screenshot) {
        setFeedback({
          type: "error",
          text: json.error ?? "Failed to add screenshot.",
        });
        return;
      }
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              screenshots: [json.screenshot!, ...prev.screenshots],
            }
          : prev,
      );
      setShotTitle("");
      setShotUrl("");
      setShotCaption("");
      setFeedback({ type: "success", text: "Screenshot reference added." });
    } finally {
      setSubmittingShot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top sequential nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-xs"
          render={<Link href="/projects" />}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Back to Project Explorer</span>
        </Button>

        <div className="flex items-center gap-2">
          {prevProject ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              render={<Link href={`/projects/${prevProject.slug}`} />}
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span className="font-mono">
                #{String(prevProject.number).padStart(3, "0")}
              </span>
            </Button>
          ) : null}
          {nextProject ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              render={<Link href={`/projects/${nextProject.slug}`} />}
            >
              <span className="font-mono">
                #{String(nextProject.number).padStart(3, "0")}
              </span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Section 1: Project Overview Header */}
      <Card className="border-border/80 bg-card/95">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded border border-border bg-muted px-2.5 py-0.5 font-mono text-xs font-semibold">
                  #{paddedNumber}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    getDifficultyBgColor(project.difficulty),
                    getDifficultyColor(project.difficulty),
                  )}
                >
                  {project.difficulty}
                </Badge>
                <Badge variant="outline" className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <Badge variant="outline" className={verificationMeta.classes}>
                  {verificationMeta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{project.category}</span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {project.title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor={statusSelectId} className="sr-only">
                  Project Status
                </Label>
                <select
                  id={statusSelectId}
                  aria-label="Project workspace status"
                  value={project.status}
                  onChange={(e) =>
                    void patchProgress(
                      { status: e.target.value },
                      `Status updated to ${getStatusLabel(e.target.value as ProjectStatus)}.`,
                    )
                  }
                  className={cn(SELECT_CLASSES, "w-44")}
                >
                  {PROJECT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {getStatusLabel(st)}
                    </option>
                  ))}
                </select>
              </div>

              {!project.isPlaceholder ? (
                <Button
                  type="button"
                  variant={project.bookmarked ? "default" : "outline"}
                  size="sm"
                  aria-pressed={Boolean(project.bookmarked)}
                  onClick={() =>
                    void patchProgress(
                      { bookmarked: !project.bookmarked },
                      !project.bookmarked ? "Project bookmarked." : "Bookmark removed.",
                    )
                  }
                  className="h-9 gap-1.5"
                >
                  <Bookmark
                    className={cn("size-4", project.bookmarked && "fill-current")}
                    aria-hidden="true"
                  />
                  <span>{project.bookmarked ? "Bookmarked" : "Bookmark"}</span>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Independent Workspace Completion</span>
              <span className="font-mono font-semibold text-foreground">
                {project.completionPercentage ?? 0}%
              </span>
            </div>
            <Progress
              value={project.completionPercentage ?? 0}
              aria-label="Workspace completion progress"
            />
          </div>
        </CardHeader>
      </Card>

      {!isAuthenticated ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2.5 text-foreground">
            <Lock className="size-4 shrink-0 text-violet-400" aria-hidden="true" />
            <span>
              Viewing public project specification. Sign in to save checklists,
              architecture docs, notes, deployments, and live GitHub verification results.
            </span>
          </div>
          <Button
            size="sm"
            render={
              <Link
                href={`/login?redirect=${encodeURIComponent(`/projects/${project.slug}`)}`}
              />
            }
          >
            Sign in to edit workspace
          </Button>
        </div>
      ) : null}

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm",
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-red-300",
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      {/* Workspace Tabs */}
      <Tabs defaultValue="overview" className="space-y-5">
        <div className="overflow-x-auto pb-1">
          <TabsList
            variant="line"
            className="w-max min-w-full justify-start border-b border-border/70"
          >
            <TabsTrigger value="overview" className="gap-1.5 px-3 py-2">
              <Code2 className="size-4" aria-hidden="true" />
              <span>Overview & Repository</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-1.5 px-3 py-2">
              <Sparkles className="size-4" aria-hidden="true" />
              <span>Modernization Roadmap ({roadmapItems.length})</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1.5 px-3 py-2">
              <ClipboardCheck className="size-4" aria-hidden="true" />
              <span>Development Checklist ({tasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5 px-3 py-2">
              <StickyNote className="size-4" aria-hidden="true" />
              <span>Docs & Notes ({notes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-1.5 px-3 py-2">
              <Rocket className="size-4" aria-hidden="true" />
              <span>Deployment & Testing ({deployments.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Sections 2, 3, 4, 5, 6, 7, 8, 13 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Section 2 & 3: Original GitHub Repository & Verification */}
            <Card className="border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderGit2 className="size-4 text-violet-400" aria-hidden="true" />
                  <span>Original Repository & Verification</span>
                </CardTitle>
                <CardDescription>
                  Canonical source address preserved verbatim alongside live verification
                  telemetry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-xs">
                  <p className="mb-1 text-muted-foreground">Canonical Repository URL</p>
                  {project.originalRepoUrl ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <code className="break-all font-mono text-foreground">
                        {project.originalRepoUrl}
                      </code>
                      <div className="flex items-center gap-1.5">
                        {repoHref ? (
                          <a
                            href={repoHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-medium text-violet-400 hover:bg-muted"
                          >
                            <span>Open GitHub</span>
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyClone}
                          className="h-7 gap-1 px-2 text-[11px]"
                        >
                          {copiedClone ? (
                            <>
                              <Check
                                className="size-3 text-emerald-400"
                                aria-hidden="true"
                              />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" aria-hidden="true" />
                              <span>git clone</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-mono text-muted-foreground">
                      Reserved slot — Awaiting source repository URL.
                    </p>
                  )}
                </div>

                {project.verifiedRepoUrl &&
                project.verifiedRepoUrl !== project.originalRepoUrl ? (
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
                    <p className="mb-1 font-medium text-emerald-400">
                      Normalized / Verified Repository URL
                    </p>
                    <a
                      href={project.verifiedRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all font-mono text-foreground hover:underline"
                    >
                      <span>{project.verifiedRepoUrl}</span>
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </div>
                ) : null}

                {project.discrepancyNotes ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                    <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-400">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      <span>Discrepancy / Audit Finding</span>
                    </p>
                    <p>{project.discrepancyNotes}</p>
                  </div>
                ) : null}

                <form
                  onSubmit={handleVerifyGithub}
                  className="space-y-3 border-t border-border/60 pt-3"
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="override-repo-url"
                      className="text-xs text-muted-foreground"
                    >
                      Optional Override / Fork Repository URL
                    </Label>
                    <Input
                      id="override-repo-url"
                      type="url"
                      value={overrideUrl}
                      onChange={(e) => setOverrideUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      spellCheck={false}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={verifyingGithub}
                    className="gap-1.5"
                  >
                    {verifyingGithub ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                    )}
                    <span>Verify via GitHub REST API</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Section 13: GitHub Information */}
            <Card className="border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="size-4 text-sky-400" aria-hidden="true" />
                  <span>GitHub Repository Intelligence</span>
                </CardTitle>
                <CardDescription>
                  Live API snapshot populated when verified (never fabricated).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.repositoryMetadata ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Stars</p>
                        <p className="mt-1 font-mono text-lg font-semibold">
                          {project.repositoryMetadata.stars.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Forks</p>
                        <p className="mt-1 font-mono text-lg font-semibold">
                          {project.repositoryMetadata.forks.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Open Issues</p>
                        <p className="mt-1 font-mono text-lg font-semibold">
                          {project.repositoryMetadata.openIssues.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Primary Language</dt>
                        <dd className="font-mono font-medium">
                          {project.repositoryMetadata.primaryLanguage ?? "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Activity</dt>
                        <dd className="font-mono font-medium capitalize">
                          {project.repositoryMetadata.activityLevel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Default Branch</dt>
                        <dd className="font-mono font-medium">
                          {project.repositoryMetadata.defaultBranch ?? "main"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Last Verified</dt>
                        <dd className="font-medium">
                          {project.repositoryMetadata.verifiedAt
                            ? formatDate(project.repositoryMetadata.verifiedAt)
                            : "Unverified"}
                        </dd>
                      </div>
                    </dl>

                    {project.repositoryMetadata.topics.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {project.repositoryMetadata.topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                          >
                            #{topic}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    <p>No live GitHub telemetry cached for this project yet.</p>
                    <p className="mt-1">
                      Trigger <strong>Verify via GitHub REST API</strong> to fetch live
                      stars, language breakdown, license, issues, and commit freshness.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sections 4 & 5: Original Stack vs Recommended Modern Stack */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="size-4 text-amber-400" aria-hidden="true" />
                  <span>Original Technology Stack</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {project.technologies.length > 0 ? (
                  project.technologies.map((tech) => (
                    <Badge key={tech} variant="secondary" className="font-mono text-xs">
                      {tech}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Awaiting repository source assignment.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-violet-400" aria-hidden="true" />
                  <span>Recommended Modern Stack</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {project.recommendedStack.map((tech) => (
                  <Badge
                    key={tech}
                    variant="outline"
                    className="border-violet-500/30 bg-violet-500/10 font-mono text-xs text-violet-300"
                  >
                    {tech}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sections 6, 7, 8: Learning Objectives, Existing Features, Missing Features */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Learning Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {project.learningObjectives.map((obj) => (
                    <li key={obj} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-sky-400"
                        aria-hidden="true"
                      />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Existing Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {project.existingFeatures.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Missing Modernization Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {project.missingFeatures.map((gap) => (
                    <li key={gap} className="flex items-start gap-2">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-amber-400"
                        aria-hidden="true"
                      />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Section 9 — Modernization Roadmap & Milestones */}
        <TabsContent value="roadmap" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/80 bg-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">7-Phase Modernization Roadmap</CardTitle>
                <CardDescription>
                  Update each engineering phase independently from Pending to Completed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roadmapItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-background/60 p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-violet-400">
                          Phase {item.phase}
                        </span>
                        <h3 className="text-sm font-medium text-foreground">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="shrink-0">
                      <Label htmlFor={`roadmap-${item.id}`} className="sr-only">
                        Phase {item.phase} status
                      </Label>
                      <select
                        id={`roadmap-${item.id}`}
                        value={item.status}
                        onChange={(e) =>
                          void handleRoadmapChange(
                            item.id,
                            e.target.value as ProjectRoadmapItem["status"],
                          )
                        }
                        className={cn(SELECT_CLASSES, "w-36")}
                      >
                        {ROADMAP_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st === "in-progress"
                              ? "In Progress"
                              : st.charAt(0).toUpperCase() + st.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MilestoneIcon className="size-4 text-violet-400" aria-hidden="true" />
                  <span>Project Milestones</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddMilestone} className="space-y-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="milestone-title" className="text-xs">
                      Milestone Title
                    </Label>
                    <Input
                      id="milestone-title"
                      value={milestoneTitle}
                      onChange={(e) => setMilestoneTitle(e.target.value)}
                      placeholder="Complete Prisma schema migration"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="milestone-due" className="text-xs">
                      Target Date (Optional)
                    </Label>
                    <Input
                      id="milestone-due"
                      type="date"
                      value={milestoneDue}
                      onChange={(e) => setMilestoneDue(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingMilestone}
                    className="w-full gap-1.5"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>Add Milestone</span>
                  </Button>
                </form>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  {milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No milestones defined yet.
                    </p>
                  ) : (
                    milestones.map((m) => (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/60 p-2.5 text-xs hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={m.completed}
                          onChange={(e) =>
                            void handleToggleMilestone(m.id, e.target.checked)
                          }
                          className="mt-0.5 size-4 accent-violet-500"
                        />
                        <div className="space-y-0.5">
                          <p
                            className={cn(
                              "font-medium text-foreground",
                              m.completed && "line-through opacity-60",
                            )}
                          >
                            {m.title}
                          </p>
                          {m.dueDate ? (
                            <p className="font-mono text-[11px] text-muted-foreground">
                              Due {m.dueDate}
                            </p>
                          ) : null}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Section 10 — Development Checklist */}
        <TabsContent value="checklist" className="space-y-6">
          <Card className="border-border/80 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Development Checklist</CardTitle>
              <CardDescription>
                Checking tasks automatically updates workspace completion telemetry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form
                onSubmit={handleAddTask}
                className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/60 p-3.5 sm:flex-row sm:items-end"
              >
                <div className="flex-1 space-y-1">
                  <Label htmlFor="new-task-title" className="text-xs">
                    Task Description
                  </Label>
                  <Input
                    id="new-task-title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Add Vitest coverage for API route validation..."
                    required
                  />
                </div>
                <div className="space-y-1 sm:w-48">
                  <Label htmlFor="new-task-phase" className="text-xs">
                    Phase
                  </Label>
                  <select
                    id="new-task-phase"
                    value={taskPhase}
                    onChange={(e) => setTaskPhase(e.target.value)}
                    className={SELECT_CLASSES}
                  >
                    {WORKFLOW_PHASES.map((p) => (
                      <option key={p.phase} value={p.title}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={submittingTask} className="gap-1.5">
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Add Task</span>
                </Button>
              </form>

              {tasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No checklist tasks recorded yet. Add your first task above to track
                  progress.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-3.5 py-2.5"
                    >
                      <label className="flex flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) =>
                            void handleToggleTask(task.id, e.target.checked)
                          }
                          className="size-4 accent-violet-500"
                        />
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              task.completed && "text-muted-foreground line-through",
                            )}
                          >
                            {task.title}
                          </p>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {task.phase}
                          </span>
                        </div>
                      </label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete task ${task.title}`}
                        onClick={() => void handleDeleteTask(task.id)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Sections 11 & 12 — Technical Documentation & Personal Notes */}
        <TabsContent value="docs" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="border-border/80 bg-card lg:col-span-7">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCode2 className="size-4 text-violet-400" aria-hidden="true" />
                  <span>Architecture, Local Clone & Technical Documentation</span>
                </CardTitle>
                <CardDescription>
                  Persist your workspace clone location, legacy vs. modernized
                  architecture notes, and full technical documentation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveDocs} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="local-clone-path" className="text-xs">
                        Local Clone Directory Path (Metadata Reference)
                      </Label>
                      <Input
                        id="local-clone-path"
                        value={localClonePath}
                        onChange={(e) => setLocalClonePath(e.target.value)}
                        placeholder={`D:\\Workspaces\\${project.slug}`}
                        spellCheck={false}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="primary-deploy-url" className="text-xs">
                        Primary Deployment URL
                      </Label>
                      <Input
                        id="primary-deploy-url"
                        type="url"
                        value={deploymentUrl}
                        onChange={(e) => setDeploymentUrl(e.target.value)}
                        placeholder="https://project-preview.vercel.app"
                        spellCheck={false}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="original-arch" className="text-xs">
                      Original Architecture Analysis
                    </Label>
                    <Textarea
                      id="original-arch"
                      rows={3}
                      value={originalArchitecture}
                      onChange={(e) => setOriginalArchitecture(e.target.value)}
                      placeholder="Summarize entry points, routing, DB schema, state management, and legacy technical debt..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modern-arch" className="text-xs">
                      Target Modernization Architecture
                    </Label>
                    <Textarea
                      id="modern-arch"
                      rows={3}
                      value={modernizationArchitecture}
                      onChange={(e) => setModernizationArchitecture(e.target.value)}
                      placeholder="Outline App Router structure, TypeScript strict contracts, Postgres schema, auth isolation..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tech-docs" className="text-xs">
                      Technical Documentation & Setup Notes
                    </Label>
                    <Textarea
                      id="tech-docs"
                      rows={5}
                      value={technicalDocumentation}
                      onChange={(e) => setTechnicalDocumentation(e.target.value)}
                      placeholder="Record setup commands, environment variables, schema decisions, and API endpoints..."
                    />
                  </div>

                  <Button type="submit" disabled={savingDocs} className="gap-1.5">
                    {savingDocs ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                    <span>Save Architecture & Docs</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card lg:col-span-5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="size-4 text-sky-400" aria-hidden="true" />
                  <span>Personal Engineering Notes</span>
                </CardTitle>
                <CardDescription>
                  Log bugs, design insights, or fixes directly into your persisted
                  journal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form onSubmit={handleAddNote} className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="note-title" className="text-xs">
                        Title
                      </Label>
                      <Input
                        id="note-title"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="Resolved N+1 Prisma query"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="note-type" className="text-xs">
                        Category
                      </Label>
                      <select
                        id="note-type"
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value as NoteType)}
                        className={SELECT_CLASSES}
                      >
                        {NOTE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="note-content" className="text-xs">
                      Content
                    </Label>
                    <Textarea
                      id="note-content"
                      rows={3}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Describe implementation context, trade-offs, or debugging details..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingNote}
                    className="w-full gap-1.5"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>Save Engineering Note</span>
                  </Button>
                </form>

                <div className="space-y-2.5 border-t border-border/60 pt-3">
                  {notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No project notes recorded yet.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <article
                        key={note.id}
                        className="space-y-1.5 rounded-lg border border-border/70 bg-background/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {note.type}
                            </Badge>
                            <h3 className="text-sm font-medium text-foreground">
                              {note.title}
                            </h3>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Delete note ${note.title}`}
                            onClick={() => void handleDeleteNote(note.id)}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                          {note.content}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: Sections 14 & 15 — Deployment, Screenshots, Testing Results & Activity */}
        <TabsContent value="delivery" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Section 14: Deployments & Screenshots */}
            <Card className="border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="size-4 text-emerald-400" aria-hidden="true" />
                  <span>Deployment History & Environment Links</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <form onSubmit={handleAddDeployment} className="space-y-3">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="deploy-env" className="text-xs">
                        Environment
                      </Label>
                      <select
                        id="deploy-env"
                        value={deployEnv}
                        onChange={(e) =>
                          setDeployEnv(e.target.value as DeploymentEnvironment)
                        }
                        className={SELECT_CLASSES}
                      >
                        {DEPLOYMENT_ENVIRONMENTS.map((env) => (
                          <option key={env} value={env}>
                            {env.charAt(0).toUpperCase() + env.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="deploy-provider" className="text-xs">
                        Hosting Provider
                      </Label>
                      <Input
                        id="deploy-provider"
                        value={deployProvider}
                        onChange={(e) => setDeployProvider(e.target.value)}
                        placeholder="Vercel / Docker / Railway"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deploy-record-url" className="text-xs">
                      Live URL
                    </Label>
                    <Input
                      id="deploy-record-url"
                      type="url"
                      value={deployRecordUrl}
                      onChange={(e) => setDeployRecordUrl(e.target.value)}
                      placeholder="https://my-app.vercel.app"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deploy-notes" className="text-xs">
                      Release Notes (Optional)
                    </Label>
                    <Input
                      id="deploy-notes"
                      value={deployNotes}
                      onChange={(e) => setDeployNotes(e.target.value)}
                      placeholder="v1.0 production deploy with Postgres pooler"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingDeploy}
                    className="gap-1.5"
                  >
                    <Rocket className="size-3.5" aria-hidden="true" />
                    <span>Log Deployment</span>
                  </Button>
                </form>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  {deployments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No deployment logs recorded yet.
                    </p>
                  ) : (
                    deployments.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-background/60 p-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {dep.environment}
                            </Badge>
                            <span className="font-medium text-foreground">
                              {dep.provider}
                            </span>
                          </div>
                          <a
                            href={dep.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all font-mono text-violet-400 hover:underline"
                          >
                            <span>{dep.url}</span>
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                          {dep.notes ? (
                            <p className="text-muted-foreground">{dep.notes}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {formatDate(dep.deployedAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 15: Testing Results */}
            <Card className="border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="size-4 text-sky-400" aria-hidden="true" />
                  <span>Testing Results & QA Verification</span>
                </CardTitle>
                <CardDescription>
                  Document unit, component, integration, and E2E test outputs for this
                  repository.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveDocs} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="testing-summary" className="text-xs">
                      Verification & Test Suite Log
                    </Label>
                    <Textarea
                      id="testing-summary"
                      rows={6}
                      value={testingSummary}
                      onChange={(e) => setTestingSummary(e.target.value)}
                      placeholder="Vitest: 18 passed · Playwright: auth & checkout passed · Lighthouse A11y: 100..."
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingDocs}
                    className="gap-1.5"
                  >
                    <Save className="size-3.5" aria-hidden="true" />
                    <span>Save Testing Report</span>
                  </Button>
                </form>

                <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    <Activity className="size-3.5" aria-hidden="true" />
                    <span>Recent Project Activity</span>
                  </h3>
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No workspace events recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {activities.slice(0, 8).map((act) => (
                        <li
                          key={act.id}
                          className="flex items-center justify-between gap-2 rounded border border-border/50 bg-background/40 px-2.5 py-1.5"
                        >
                          <span className="text-foreground">{act.summary}</span>
                          <span className="shrink-0 font-mono text-[10px]">
                            {formatDate(act.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Screenshots Registry */}
          <Card className="border-border/80 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="size-4 text-violet-400" aria-hidden="true" />
                <span>UI & Architecture Screenshots</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleAddScreenshot}
                className="grid gap-3 sm:grid-cols-4 sm:items-end"
              >
                <div className="space-y-1">
                  <Label htmlFor="shot-title" className="text-xs">
                    Title
                  </Label>
                  <Input
                    id="shot-title"
                    value={shotTitle}
                    onChange={(e) => setShotTitle(e.target.value)}
                    placeholder="Dashboard Light Theme"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shot-url" className="text-xs">
                    Image URL
                  </Label>
                  <Input
                    id="shot-url"
                    type="url"
                    value={shotUrl}
                    onChange={(e) => setShotUrl(e.target.value)}
                    placeholder="https://example.com/preview.png"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shot-caption" className="text-xs">
                    Caption (Optional)
                  </Label>
                  <Input
                    id="shot-caption"
                    value={shotCaption}
                    onChange={(e) => setShotCaption(e.target.value)}
                    placeholder="Responsive 1440px breakpoint"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingShot}
                  className="h-8 gap-1.5"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Add Screenshot</span>
                </Button>
              </form>

              {screenshots.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {screenshots.map((shot) => (
                    <div
                      key={shot.id}
                      className="rounded-lg border border-border/70 bg-background/60 p-3 text-xs"
                    >
                      <p className="font-medium text-foreground">{shot.title}</p>
                      <a
                        href={shot.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 break-all font-mono text-violet-400 hover:underline"
                      >
                        <span>{shot.url}</span>
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                      {shot.caption ? (
                        <p className="mt-1 text-muted-foreground">{shot.caption}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
