"use client";

import { useState } from "react";
import {
  Pencil,
  Check,
  X,
  Globe,
  FileCode2,
  Milestone as MilestoneIcon,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Panel, Button, IconButton, SegBar, Empty } from "@/components/redesign/ui";
import { PhaseLine } from "@/components/redesign/SpecPlate";
import { projectToCellPhase, projectToSpecPlate } from "@/components/redesign/Hundred";
import { HealthTag, GithubIcon } from "@/components/redesign/glyphs";
import { EnvChip } from "@/components/redesign/signature";
import type { Project, ProjectProgress } from "@/types/project";
import type { WorkspaceTabId } from "../workspace-tabs";

export function OverviewTab({
  project,
  progress,
  onNavigateTab,
  onUpdateFocus,
}: {
  project: Project;
  progress: ProjectProgress | null;
  onNavigateTab: (tab: WorkspaceTabId) => void;
  onUpdateFocus: (text: string) => Promise<void>;
}) {
  const spec = projectToSpecPlate(project);
  const phase = projectToCellPhase(project);

  const initialFocus =
    progress?.modernizationArchitecture ??
    project.modernizationArchitecture ??
    progress?.technicalDocumentation ??
    project.technicalDocumentation ??
    "";

  const [focus, setFocus] = useState(initialFocus);
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [draftFocus, setDraftFocus] = useState(initialFocus);
  const [isSavingFocus, setIsSavingFocus] = useState(false);

  const milestones = progress?.milestones ?? [];
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const milestonesPercent =
    milestones.length > 0
      ? Math.round((completedMilestones / milestones.length) * 100)
      : 0;

  const repoHref = project.verifiedRepoUrl ?? project.originalRepoUrl ?? null;
  const deployUrl = progress?.deploymentUrl ?? project.deploymentUrl ?? null;

  const handleSaveFocus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFocus(true);
    try {
      await onUpdateFocus(draftFocus.trim());
      setFocus(draftFocus.trim());
      setIsEditingFocus(false);
    } catch {
      // ignore
    } finally {
      setIsSavingFocus(false);
    }
  };

  const handleCancelFocus = () => {
    setDraftFocus(focus);
    setIsEditingFocus(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left 2 Columns: Summary, Focus, Specification & Milestones Snapshot */}
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        {/* Project Technical Summary */}
        <Panel
          titleId="summary-title"
          title="Technical Summary"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-fg3">
              <span>
                Engineering specification slot #{String(project.number).padStart(3, "0")}
              </span>
              <span className="font-mono">Category: {project.category}</span>
            </div>
          }
        >
          <div className="space-y-4 p-4 sm:p-5">
            <p className="max-w-[75ch] text-sm leading-relaxed text-fg2">
              {project.description}
            </p>

            {(phase === "breaking" || phase === "rebuilding") && (
              <div className="rounded border border-line bg-inset p-3">
                <PhaseLine p={spec} />
              </div>
            )}

            {project.learningObjectives && project.learningObjectives.length > 0 && (
              <div className="border-t border-line/60 pt-3">
                <h4 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg3">
                  Core Engineering Objectives
                </h4>
                <ul className="grid gap-1.5 sm:grid-cols-2 text-xs text-fg2">
                  {project.learningObjectives.slice(0, 4).map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2
                        size={13}
                        className="mt-0.5 shrink-0 text-ship"
                        aria-hidden
                      />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        {/* Current Focus (Editable inline with persistence) */}
        <Panel
          titleId="focus-title"
          title="Current Focus"
          actions={
            !isEditingFocus && (
              <IconButton
                label="Edit current focus"
                size="s"
                onClick={() => {
                  setDraftFocus(focus);
                  setIsEditingFocus(true);
                }}
              >
                <Pencil size={13} strokeWidth={1.5} />
              </IconButton>
            )
          }
        >
          {isEditingFocus ? (
            <form onSubmit={handleSaveFocus} className="space-y-3 p-4 sm:p-5">
              <label
                htmlFor="focus-input"
                className="block text-2xs font-medium text-fg3"
              >
                Update the active modernization focus or current working milestone:
              </label>
              <textarea
                id="focus-input"
                autoFocus
                rows={3}
                value={draftFocus}
                onChange={(e) => setDraftFocus(e.target.value)}
                placeholder="Describe what you are currently modernizing or working on..."
                className="w-full rounded-ctl border border-sodium bg-inset p-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sodium"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="s"
                  loading={isSavingFocus}
                  icon={<Check size={13} strokeWidth={1.5} />}
                >
                  Save Focus
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="s"
                  disabled={isSavingFocus}
                  onClick={handleCancelFocus}
                  icon={<X size={13} strokeWidth={1.5} />}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : focus ? (
            <div className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-fg leading-relaxed">{focus}</p>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <p className="text-xs text-fg3">
                No active focus statement recorded yet. Write one sentence summarizing
                your current technical iteration.
              </p>
              <Button
                variant="secondary"
                size="s"
                className="mt-3"
                onClick={() => setIsEditingFocus(true)}
              >
                Set Current Focus
              </Button>
            </div>
          )}
        </Panel>

        {/* Roadmap & Milestones Snapshot */}
        <Panel
          titleId="milestones-snapshot-title"
          title="Milestone Delivery Progress"
          actions={
            <Button variant="ghost" size="s" onClick={() => onNavigateTab("milestones")}>
              <span>View all</span>
              <ArrowRight size={13} strokeWidth={1.5} className="ml-1" />
            </Button>
          }
        >
          {milestones.length === 0 ? (
            <Empty
              title="No milestones defined yet."
              action={
                <Button
                  size="s"
                  variant="secondary"
                  onClick={() => onNavigateTab("milestones")}
                >
                  Add First Milestone
                </Button>
              }
            >
              Break down this project into deliverable targets on the Milestones tab.
            </Empty>
          ) : (
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-fg2">
                  Completed {completedMilestones} of {milestones.length} milestones
                </span>
                <span className="font-mono text-sm font-bold text-fg">
                  {milestonesPercent}%
                </span>
              </div>
              <SegBar
                value={completedMilestones}
                total={milestones.length}
                label="Milestone completion"
              />

              <ul className="divide-y divide-line/60 pt-2">
                {milestones.slice(0, 4).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <MilestoneIcon
                        size={13}
                        className={m.completed ? "text-ship" : "text-fg3"}
                      />
                      <span className={m.completed ? "line-through text-fg3" : "text-fg"}>
                        {m.title}
                      </span>
                    </div>
                    {m.dueDate && (
                      <span className="font-mono text-2xs text-fg3">
                        Due{" "}
                        {new Date(m.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Right Column: Status Cards, Repository Facts, Links & Environments */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* Progress & Verification Card */}
        <Panel titleId="status-title" title="Workspace Status">
          <div className="space-y-3.5 p-4 sm:p-5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-fg3">Overall Completion</span>
              <span className="font-mono font-bold text-fg">
                {progress?.completionPercentage ?? 0}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progress?.completionPercentage ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Project completion percentage"
              className="h-2 w-full overflow-hidden rounded-full bg-inset"
            >
              <div
                className="h-full rounded-full bg-sodium transition-all duration-300"
                style={{ width: `${progress?.completionPercentage ?? 0}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-line/60 pt-3">
              <div>
                <span className="block text-2xs text-fg3">Verification</span>
                <span className="inline-flex items-center gap-1 font-medium capitalize text-fg">
                  <ShieldCheck size={12} className="text-sodium-text" />
                  {project.verificationStatus ?? "needs-review"}
                </span>
              </div>
              <div>
                <span className="block text-2xs text-fg3">Complexity</span>
                <span className="font-medium capitalize text-fg">
                  {project.difficulty}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Repository Facts */}
        <Panel
          titleId="repo-title"
          title="Repository Intelligence"
          actions={
            <Button variant="ghost" size="s" onClick={() => onNavigateTab("github")}>
              <span>Explore</span>
              <ArrowRight size={12} strokeWidth={1.5} className="ml-1" />
            </Button>
          }
        >
          {repoHref ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 p-4 sm:p-5 text-xs">
              <div>
                <dt className="text-2xs text-fg3">Default Branch</dt>
                <dd className="font-mono text-xs font-semibold text-fg">
                  {project.repositoryMetadata?.defaultBranch ?? "main"}
                </dd>
              </div>
              <div>
                <dt className="text-2xs text-fg3">Repository Health</dt>
                <dd>
                  <HealthTag
                    h={
                      project.repositoryMetadata?.health?.status === "healthy"
                        ? "good"
                        : project.repositoryMetadata?.health?.status === "unavailable"
                          ? "poor"
                          : "fair"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-2xs text-fg3">Stars</dt>
                <dd className="font-mono text-xs font-semibold text-fg">
                  {project.repositoryMetadata?.stars ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-2xs text-fg3">Open Issues</dt>
                <dd className="font-mono text-xs font-semibold text-fg">
                  {project.repositoryMetadata?.openIssues ?? 0}
                </dd>
              </div>
              {project.repositoryMetadata?.latestCommit && (
                <div className="col-span-2 border-t border-line/60 pt-2">
                  <dt className="text-2xs text-fg3">Latest Commit</dt>
                  <dd className="font-mono text-2xs text-fg2 truncate">
                    {project.repositoryMetadata.latestCommit.shortSha} —{" "}
                    {project.repositoryMetadata.latestCommit.message}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <Empty title="No repository linked yet.">
              Link a GitHub repository to track commits, issues, and code health.
            </Empty>
          )}
        </Panel>

        {/* Links Panel */}
        <Panel titleId="links-title" title="Quick Links">
          <ul className="flex flex-col p-2 text-xs">
            {repoHref && (
              <li>
                <a
                  href={repoHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-9 items-center justify-between rounded-ctl px-2.5 transition-colors hover:bg-elevated text-fg2 hover:text-fg"
                >
                  <span className="flex items-center gap-2">
                    <GithubIcon size={14} className="text-fg3" />
                    <span>Source Repository</span>
                  </span>
                  <ArrowUpRight size={13} className="text-fg3" />
                </a>
              </li>
            )}

            {deployUrl && (
              <li>
                <a
                  href={deployUrl.startsWith("http") ? deployUrl : `https://${deployUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-9 items-center justify-between rounded-ctl px-2.5 transition-colors hover:bg-elevated text-fg2 hover:text-fg"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={14} strokeWidth={1.5} className="text-sodium-text" />
                    <span>Production URL</span>
                  </span>
                  <ArrowUpRight size={13} className="text-fg3" />
                </a>
              </li>
            )}

            <li>
              <button
                type="button"
                onClick={() => onNavigateTab("docs")}
                className="flex w-full min-h-9 items-center justify-between rounded-ctl px-2.5 transition-colors hover:bg-elevated text-fg2 hover:text-fg"
              >
                <span className="flex items-center gap-2">
                  <FileCode2 size={14} strokeWidth={1.5} className="text-fg3" />
                  <span>Architecture Documentation</span>
                </span>
                <ArrowRight size={13} className="text-fg3" />
              </button>
            </li>
          </ul>
        </Panel>

        {/* Environments Card */}
        <Panel
          titleId="environments-title"
          title="Environments"
          actions={
            <Button variant="ghost" size="s" onClick={() => onNavigateTab("deployments")}>
              <span>Manage</span>
              <ArrowRight size={12} strokeWidth={1.5} className="ml-1" />
            </Button>
          }
        >
          <div className="divide-y divide-line/60">
            <div className="flex items-center justify-between px-4 py-2.5 text-xs">
              <EnvChip env="Production" />
              {deployUrl ? (
                <span className="font-mono text-2xs text-ship">Live</span>
              ) : (
                <span className="text-2xs text-fg3">Not deployed</span>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-xs">
              <EnvChip env="Preview" />
              <span className="text-2xs text-fg3">No active preview</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
