"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  ExternalLink,
  GitBranch,
  ArrowUpRight,
  MoreHorizontal,
  Copy,
  Terminal,
  Check,
  Globe,
} from "lucide-react";
import { Hundred, projectToCellPhase } from "@/components/redesign/Hundred";
import { LoopTrack } from "@/components/redesign/signature";
import { PhaseBadge, HealthTag, DeployTag } from "@/components/redesign/glyphs";
import {
  Button,
  IconButton,
  Popover,
  MenuItem,
  StackChip,
  cx,
} from "@/components/redesign/ui";
import type { CellPhase, DeployState, Health } from "@/components/redesign/types";
import { getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
import type { Project, ProjectProgress } from "@/types/project";

export interface WorkspaceHeaderProps {
  project: Project;
  progress: ProjectProgress | null;
  prevProject: { number: number; title: string; slug: string } | null;
  nextProject: { number: number; title: string; slug: string } | null;
  currentTab?: string;
  isAuthenticated?: boolean;
  onTogglePin: () => void;
  onCopySuccess?: (msg: string) => void;
}

export function WorkspaceHeader({
  project,
  progress,
  prevProject,
  nextProject,
  currentTab = "overview",
  isAuthenticated,
  onTogglePin,
  onCopySuccess,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copiedClone, setCopiedClone] = useState(false);
  const [copiedDeploy, setCopiedDeploy] = useState(false);

  const padNum = String(project.number).padStart(3, "0");
  const phase = projectToCellPhase(project);
  const isBookmarked = progress?.bookmarked ?? project.bookmarked ?? false;
  const repoHref = project.verifiedRepoUrl ?? project.originalRepoUrl ?? null;
  const deployUrl = progress?.deploymentUrl ?? project.deploymentUrl ?? null;

  // Determine health
  let health: Health = "unknown";
  const healthStatus = project.repositoryMetadata?.health?.status;
  if (healthStatus === "healthy") health = "good";
  else if (healthStatus === "needs-review" || healthStatus === "stale") health = "fair";
  else if (healthStatus === "unavailable") health = "poor";

  // Determine deploy status
  let deployState: DeployState = "none";
  if (deployUrl) deployState = "ready";
  else if (project.status === "completed") deployState = "ready";
  else if (project.status === "in-development" || project.status === "testing") {
    deployState = "building";
  }

  // Keyboard shortcut Alt+Left / Alt+Right for Prev/Next project
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        document.querySelector('[aria-modal="true"]')
      ) {
        return;
      }
      if (!e.altKey) return;

      if (e.key === "ArrowLeft" && prevProject) {
        e.preventDefault();
        router.push(`/projects/${prevProject.slug}?tab=${currentTab}`);
      } else if (e.key === "ArrowRight" && nextProject) {
        e.preventDefault();
        router.push(`/projects/${nextProject.slug}?tab=${currentTab}`);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevProject, nextProject, currentTab, router]);

  const handleCopyClone = async () => {
    if (!repoHref) return;
    try {
      await navigator.clipboard.writeText(`git clone ${repoHref}`);
      setCopiedClone(true);
      onCopySuccess?.(`Copied git clone ${repoHref}`);
      setTimeout(() => setCopiedClone(false), 2000);
      setMoreOpen(false);
    } catch {
      // ignore
    }
  };

  const handleCopyDeploy = async () => {
    if (!deployUrl) return;
    try {
      const fullUrl = deployUrl.startsWith("http") ? deployUrl : `https://${deployUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedDeploy(true);
      onCopySuccess?.(`Copied ${fullUrl}`);
      setTimeout(() => setCopiedDeploy(false), 2000);
      setMoreOpen(false);
    } catch {
      // ignore
    }
  };

  return (
    <header className="mb-6 rounded-panel border border-line bg-surface">
      {/* Top section: Identity & Navigation */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-start md:gap-6">
        {/* Left: Project identity */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span
              className="display-num block shrink-0 text-4xl font-bold leading-none text-fg sm:text-5xl"
              aria-label={`Project number ${padNum}`}
            >
              {padNum}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cx(
                    "rounded px-1.5 py-0.5 text-2xs font-semibold capitalize",
                    getDifficultyBgColor(project.difficulty),
                    getDifficultyColor(project.difficulty),
                  )}
                >
                  {project.difficulty}
                </span>
                <span className="font-mono text-2xs text-fg3">{project.category}</span>
              </div>
              <h1 className="display mt-0.5 truncate text-xl font-bold text-fg sm:text-2xl md:text-3xl">
                {project.title}
              </h1>
              <p className="mt-1 line-clamp-2 text-xs text-fg2 sm:text-sm">
                {project.description}
              </p>
            </div>
          </div>

          {/* Phase, LoopTrack & Tech Stack */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <PhaseBadge phase={phase as CellPhase} />
            {phase !== "unknown" && phase !== "archived" && (
              <LoopTrack phase={phase} size="compact" />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {project.technologies?.map((tech) => (
              <StackChip key={tech}>{tech}</StackChip>
            ))}
            {repoHref && (
              <a
                href={repoHref}
                target="_blank"
                rel="noreferrer"
                className="ml-1 inline-flex min-w-0 max-w-full items-center gap-1 font-mono text-2xs text-fg2 hover:text-fg hover:underline"
              >
                <GitBranch size={12} strokeWidth={1.5} aria-hidden />
                <span className="truncate">
                  {repoHref.replace(/^https?:\/\/github\.com\//, "")}
                </span>
                <ArrowUpRight size={11} strokeWidth={1.5} aria-hidden />
              </a>
            )}
            {deployUrl && (
              <a
                href={deployUrl.startsWith("http") ? deployUrl : `https://${deployUrl}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 inline-flex min-w-0 max-w-full items-center gap-1 font-mono text-2xs text-sodium-text hover:underline"
              >
                <Globe size={12} strokeWidth={1.5} aria-hidden />
                <span className="truncate">{deployUrl.replace(/^https?:\/\//, "")}</span>
                <ArrowUpRight size={11} strokeWidth={1.5} aria-hidden />
              </a>
            )}
          </div>
        </div>

        {/* Right: Prev/Next & Mini Hundred Position Map */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line/60 pt-3 md:flex-col md:items-end md:border-t-0 md:pt-0">
          <div className="flex items-center gap-1">
            <IconButton
              label={
                prevProject
                  ? `Previous: #${String(prevProject.number).padStart(3, "0")} ${prevProject.title}`
                  : "No previous project"
              }
              shortcut={["⌥", "←"]}
              size="s"
              disabled={!prevProject}
              onClick={() =>
                prevProject &&
                router.push(`/projects/${prevProject.slug}?tab=${currentTab}`)
              }
            >
              <ChevronLeft size={15} strokeWidth={1.5} />
            </IconButton>

            <span className="font-mono text-2xs text-fg3">#{padNum} / 100</span>

            <IconButton
              label={
                nextProject
                  ? `Next: #${String(nextProject.number).padStart(3, "0")} ${nextProject.title}`
                  : "No next project"
              }
              shortcut={["⌥", "→"]}
              size="s"
              disabled={!nextProject}
              onClick={() =>
                nextProject &&
                router.push(`/projects/${nextProject.slug}?tab=${currentTab}`)
              }
            >
              <ChevronRight size={15} strokeWidth={1.5} />
            </IconButton>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Hundred
              size="mini"
              current={project.number}
              label={`Position of project ${padNum} in the hundred`}
              onOpen={(p) => router.push(`/projects/${p.slug}?tab=${currentTab}`)}
            />
            <span className="font-mono text-[10px] text-fg3">You are here</span>
          </div>
        </div>
      </div>

      {/* Meta bar: Repo Health, Deploy status & Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-line px-4 py-2.5 text-xs sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg3">
          <span className="flex items-center gap-1.5">
            <span>Repo health</span>
            <HealthTag h={health} />
          </span>

          <span className="flex items-center gap-1.5">
            <span>Deploy</span>
            {deployState !== "none" ? (
              <DeployTag d={deployState} />
            ) : (
              <span className="text-fg3">Not deployed</span>
            )}
          </span>

          {project.repositoryMetadata?.stars !== undefined &&
            project.repositoryMetadata.stars > 0 && (
              <span className="font-mono text-fg2">
                ★ {project.repositoryMetadata.stars}
              </span>
            )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            size="s"
            variant={isBookmarked ? "secondary" : "ghost"}
            icon={
              <Pin
                size={13}
                strokeWidth={1.5}
                className={isBookmarked ? "fill-current text-sodium-text" : ""}
              />
            }
            onClick={onTogglePin}
            aria-pressed={isBookmarked}
            title={
              isAuthenticated === false
                ? "Sign in to pin project"
                : isBookmarked
                  ? "Unpin project"
                  : "Pin project"
            }
          >
            {isBookmarked ? "Pinned" : "Pin"}
          </Button>

          {repoHref && (
            <Button
              size="s"
              variant="secondary"
              icon={<ExternalLink size={13} strokeWidth={1.5} />}
              onClick={() => window.open(repoHref, "_blank", "noopener,noreferrer")}
            >
              <span className="hidden sm:inline">Open</span> GitHub
            </Button>
          )}

          {deployUrl && (
            <Button
              size="s"
              variant="secondary"
              icon={<Globe size={13} strokeWidth={1.5} />}
              onClick={() =>
                window.open(
                  deployUrl.startsWith("http") ? deployUrl : `https://${deployUrl}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <span className="hidden sm:inline">Open</span> Live
            </Button>
          )}

          <IconButton
            ref={moreRef}
            label="More workspace options"
            size="s"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={15} strokeWidth={1.5} />
          </IconButton>

          <Popover
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            anchor={moreRef}
            align="end"
            width={240}
          >
            {repoHref && (
              <MenuItem
                icon={
                  copiedClone ? (
                    <Check size={14} className="text-ship" />
                  ) : (
                    <Terminal size={14} strokeWidth={1.5} />
                  )
                }
                onClick={handleCopyClone}
              >
                {copiedClone ? "Copied clone command!" : "Copy git clone command"}
              </MenuItem>
            )}

            {deployUrl && (
              <MenuItem
                icon={
                  copiedDeploy ? (
                    <Check size={14} className="text-ship" />
                  ) : (
                    <Copy size={14} strokeWidth={1.5} />
                  )
                }
                onClick={handleCopyDeploy}
              >
                {copiedDeploy ? "Copied URL!" : "Copy deploy URL"}
              </MenuItem>
            )}

            {prevProject && (
              <MenuItem
                icon={<ChevronLeft size={14} strokeWidth={1.5} />}
                onClick={() => {
                  setMoreOpen(false);
                  router.push(`/projects/${prevProject.slug}?tab=${currentTab}`);
                }}
              >
                Previous: #{String(prevProject.number).padStart(3, "0")}
              </MenuItem>
            )}

            {nextProject && (
              <MenuItem
                icon={<ChevronRight size={14} strokeWidth={1.5} />}
                onClick={() => {
                  setMoreOpen(false);
                  router.push(`/projects/${nextProject.slug}?tab=${currentTab}`);
                }}
              >
                Next: #{String(nextProject.number).padStart(3, "0")}
              </MenuItem>
            )}

            <div className="my-1 border-t border-line" />

            <MenuItem
              icon={<ExternalLink size={14} strokeWidth={1.5} />}
              onClick={() => {
                setMoreOpen(false);
                router.push("/projects");
              }}
            >
              Back to Explorer
            </MenuItem>
          </Popover>
        </div>
      </div>
    </header>
  );
}
