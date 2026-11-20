"use client";

import { useMemo } from "react";
import Link from "next/link";
import { OctagonX, TriangleAlert, CalendarClock } from "lucide-react";
import { Panel, Empty, cx } from "@/components/redesign/ui";
import type { Project } from "@/types/project";

export interface AttentionItem {
  id: string;
  projectNumber: number;
  projectSlug: string;
  projectName: string;
  reason: string;
  severity: "error" | "warning";
  kind: "breaking" | "warning" | "overdue";
}

export function AttentionQueue({
  projects,
  overdueMilestones = [],
  className,
}: {
  projects: Project[];
  overdueMilestones?: Array<{
    id: string;
    title: string;
    projectTitle: string;
    projectSlug: string;
    projectNumber: number;
  }>;
  className?: string;
}) {
  const items = useMemo<AttentionItem[]>(() => {
    const list: AttentionItem[] = [];

    // 1. Check CI failure and degraded repository health
    for (const p of projects) {
      if (p.repositoryMetadata?.latestWorkflowRun?.conclusion === "failure") {
        list.push({
          id: `ci-${p.id}`,
          projectNumber: p.number,
          projectSlug: p.slug,
          projectName: p.title,
          reason: "CI workflow run failed",
          severity: "error",
          kind: "breaking",
        });
      } else if (p.repositoryMetadata?.health?.status === "unavailable") {
        list.push({
          id: `health-unavail-${p.id}`,
          projectNumber: p.number,
          projectSlug: p.slug,
          projectName: p.title,
          reason: "Repository unreachable or unavailable",
          severity: "error",
          kind: "breaking",
        });
      } else if (p.repositoryMetadata?.health?.status === "needs-review") {
        list.push({
          id: `health-review-${p.id}`,
          projectNumber: p.number,
          projectSlug: p.slug,
          projectName: p.title,
          reason: "Repository health audit recommended",
          severity: "warning",
          kind: "warning",
        });
      } else if (p.discrepancyNotes) {
        list.push({
          id: `disc-${p.id}`,
          projectNumber: p.number,
          projectSlug: p.slug,
          projectName: p.title,
          reason: p.discrepancyNotes,
          severity: "warning",
          kind: "warning",
        });
      }
    }

    // 2. Overdue milestones
    for (const m of overdueMilestones) {
      list.push({
        id: `ms-${m.id}`,
        projectNumber: m.projectNumber,
        projectSlug: m.projectSlug,
        projectName: m.projectTitle,
        reason: `Milestone "${m.title}" is overdue`,
        severity: "warning",
        kind: "overdue",
      });
    }

    // Sort: errors first, then warnings
    return list.sort((a, b) => {
      if (a.severity === "error" && b.severity !== "error") return -1;
      if (a.severity !== "error" && b.severity === "error") return 1;
      return a.projectNumber - b.projectNumber;
    });
  }, [projects, overdueMilestones]);

  return (
    <Panel
      className={className}
      titleId="needs-h"
      title={
        <div className="flex items-center gap-2">
          <span>Needs you</span>
          <span className="font-mono text-xs font-normal text-fg3">{items.length}</span>
        </div>
      }
      footer="Ranked: breaking issues first, followed by warnings and milestone alerts"
    >
      {items.length === 0 ? (
        <Empty title="Nothing needs you right now.">
          All active repositories and deployments are in a healthy state.
        </Empty>
      ) : (
        <ol className="divide-y divide-line">
          {items.slice(0, 7).map((it, i) => {
            const Icon =
              it.kind === "breaking"
                ? OctagonX
                : it.kind === "overdue"
                  ? CalendarClock
                  : TriangleAlert;
            const color = it.severity === "error" ? "text-break" : "text-warn";
            const padNum = String(it.projectNumber).padStart(3, "0");

            return (
              <li
                key={it.id}
                className="group relative flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-elevated"
              >
                <span className="font-mono w-4 shrink-0 pt-0.5 text-right text-2xs text-fg3">
                  {i + 1}
                </span>
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className={cx("mt-[3px] shrink-0", color)}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${it.projectSlug}`}
                    className="flex min-w-0 items-baseline gap-2 text-sm outline-none focus-visible:underline"
                  >
                    <span className="font-mono shrink-0 font-semibold text-fg">
                      #{padNum}
                    </span>
                    <span className="truncate font-medium text-fg">{it.projectName}</span>
                  </Link>
                  <p className="line-clamp-1 text-xs text-fg2">{it.reason}</p>
                </div>
                <span className={cx("shrink-0 pt-0.5 text-2xs font-medium", color)}>
                  {it.severity === "error" ? "Breaking" : "Warning"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
