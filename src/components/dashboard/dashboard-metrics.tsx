"use client";

import { useMemo } from "react";
import { CheckCircle2, Flame, FolderGit2, Layers, OctagonX } from "lucide-react";
import type { Project, WorkspaceStats } from "@/types/project";
import { projectToCellPhase } from "@/components/redesign/Hundred";

export function DashboardMetrics({
  stats,
  projects,
}: {
  stats: WorkspaceStats;
  projects: Project[];
}) {
  const breakingCount = useMemo(() => {
    return projects.filter((p) => projectToCellPhase(p) === "breaking").length;
  }, [projects]);

  const items = [
    {
      label: "Total Projects",
      value: String(stats.totalProjects),
      subtext: "100 canonical slots",
      icon: FolderGit2,
      color: "text-fg",
    },
    {
      label: "Active Pipeline",
      value: String(stats.activeProjects),
      subtext: `${stats.statusCounts["in-development"] || 0} building · ${stats.statusCounts.testing || 0} testing`,
      icon: Flame,
      color: "text-sodium-text",
    },
    {
      label: "Shipped",
      value: String(stats.completedProjects),
      subtext: `${stats.overallCompletion}% overall completion`,
      icon: CheckCircle2,
      color: "text-ship",
    },
    {
      label: "Needs Attention",
      value: String(breakingCount),
      subtext: breakingCount > 0 ? "Failing CI or unavailable" : "All systems healthy",
      icon: OctagonX,
      color: breakingCount > 0 ? "text-break" : "text-fg3",
    },
    {
      label: "Technologies",
      value: String(stats.technologiesExplored),
      subtext: "Across canonical stack",
      icon: Layers,
      color: "text-fg2",
    },
  ];

  return (
    <div
      role="region"
      aria-label="Workspace Metrics"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex flex-col justify-between rounded-panel border border-line bg-surface p-3.5 transition-colors hover:border-edge"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs font-medium text-fg3 uppercase tracking-wider">
                {item.label}
              </span>
              <Icon size={14} strokeWidth={1.5} className={item.color} aria-hidden />
            </div>
            <div className="mt-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-fg">
                {item.value}
              </span>
              <p className="mt-0.5 truncate text-2xs text-fg3">{item.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
