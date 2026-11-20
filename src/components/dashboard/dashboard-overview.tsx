"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FolderGit2, NotebookText, Milestone } from "lucide-react";
import { Button } from "@/components/redesign/ui";
import { projectToCellPhase } from "@/components/redesign/Hundred";
import { DashboardMetrics } from "./dashboard-metrics";
import { HundredGridSection } from "./hundred-grid";
import { AttentionQueue } from "./attention-queue";
import { SignalStream } from "./signal-stream";
import { PinnedProjects } from "./pinned-projects";
import { DistributionPanel } from "./distribution-panel";
import { MilestonesPanel } from "./milestones-panel";
import type { Project, SessionUser, WorkspaceStats } from "@/types/project";
import type { ActivityEvent } from "@/types/activity";

function isPastDueDate(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

function getGreeting(userName?: string): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return userName ? `Good ${timeOfDay}, ${userName}.` : `Good ${timeOfDay}.`;
}

export function DashboardOverview({
  user,
  projects,
  stats,
  activities = [],
  milestones = [],
}: {
  user: SessionUser;
  projects: Project[];
  stats: WorkspaceStats;
  activities?: ActivityEvent[];
  milestones?: Array<{
    id: string;
    title: string;
    projectTitle: string;
    projectSlug: string;
    projectNumber: number;
    dueDate: string | null;
  }>;
}) {
  const breakingCount = useMemo(() => {
    return projects.filter((p) => projectToCellPhase(p) === "breaking").length;
  }, [projects]);

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (breakingCount > 0) {
      parts.push(`${breakingCount} projects need attention`);
    } else {
      parts.push("All systems operational");
    }
    parts.push(`${stats.activeProjects} active in pipeline`);
    parts.push(`${stats.completedProjects} shipped`);
    return parts.join(" · ");
  }, [breakingCount, stats.activeProjects, stats.completedProjects]);

  const overdueMilestones = useMemo(() => {
    return milestones.filter((m) => isPastDueDate(m.dueDate));
  }, [milestones]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Workstation Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {getGreeting(user.name)}
          </h1>
          <p className="mt-1 font-mono text-xs text-fg3 sm:text-sm">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projects">
            <Button
              variant="secondary"
              size="s"
              icon={<FolderGit2 size={14} strokeWidth={1.5} />}
            >
              All projects
            </Button>
          </Link>
          <Link href="/activity">
            <Button
              variant="secondary"
              size="s"
              icon={<NotebookText size={14} strokeWidth={1.5} />}
            >
              Activity Center
            </Button>
          </Link>
          <Link href="/kanban">
            <Button
              variant="primary"
              size="s"
              icon={<Milestone size={14} strokeWidth={1.5} />}
            >
              Roadmaps
            </Button>
          </Link>
        </div>
      </header>

      {/* Overview KPI Strip */}
      <div className="mb-6">
        <DashboardMetrics stats={stats} projects={projects} />
      </div>

      {/* Main Grid Composition */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* On mobile: Attention first, then Hundred; On desktop: Hundred (col 7), Attention (col 5) */}
        <div className="order-2 xl:order-1 xl:col-span-7">
          <HundredGridSection projects={projects} className="h-full" />
        </div>

        <div className="order-1 xl:order-2 xl:col-span-5">
          <AttentionQueue
            projects={projects}
            overdueMilestones={overdueMilestones}
            className="h-full"
          />
        </div>

        {/* Middle Row: Signal Stream (col 7) + Pinned Projects (col 5) */}
        <div className="order-3 xl:col-span-7">
          <SignalStream events={activities} className="h-full" />
        </div>

        <div className="order-4 xl:col-span-5">
          <PinnedProjects initialProjects={projects} className="h-full" />
        </div>

        {/* Bottom Row: Distribution (col 4) + Milestones Due (col 8) */}
        <div className="order-5 xl:col-span-4">
          <DistributionPanel projects={projects} className="h-full" />
        </div>

        <div className="order-6 xl:col-span-8">
          <MilestonesPanel milestones={milestones} className="h-full" />
        </div>
      </div>
    </div>
  );
}
