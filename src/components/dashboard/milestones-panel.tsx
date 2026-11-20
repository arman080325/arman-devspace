"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar, TriangleAlert } from "lucide-react";
import { Panel, Empty, cx } from "@/components/redesign/ui";

export interface MilestoneItem {
  id: string;
  title: string;
  projectTitle: string;
  projectSlug: string;
  projectNumber: number;
  dueDate: string | null;
}

function isOverdueDate(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function MilestonesPanel({
  milestones = [],
  className,
}: {
  milestones: MilestoneItem[];
  className?: string;
}) {
  return (
    <Panel
      className={className}
      titleId="ms-h"
      title={
        <div className="flex items-center gap-2">
          <span>Milestones Due</span>
          <span className="font-mono text-xs font-normal text-fg3">
            {milestones.length}
          </span>
        </div>
      }
      actions={
        <Link
          href="/kanban"
          className="inline-flex h-7 items-center gap-1 rounded-ctl px-2 text-xs text-fg2 hover:bg-elevated hover:text-fg"
        >
          <span>Roadmaps</span>
          <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden />
        </Link>
      }
      footer="Target delivery checkpoints across project engineering workspaces"
    >
      {milestones.length === 0 ? (
        <Empty title="No upcoming milestones.">
          Plan the next milestone from any project workspace to track checkpoints here.
        </Empty>
      ) : (
        <ul className="divide-y divide-line">
          {milestones.slice(0, 8).map((m) => {
            const overdue = isOverdueDate(m.dueDate);
            const padNum = String(m.projectNumber).padStart(3, "0");

            return (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-elevated sm:grid-cols-[minmax(0,1fr)_160px_100px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{m.title}</p>
                  <Link
                    href={`/projects/${m.projectSlug}`}
                    className="flex items-center gap-1.5 truncate text-2xs text-fg2 hover:underline"
                  >
                    <span className="font-mono font-medium text-fg">#{padNum}</span>
                    <span className="truncate">{m.projectTitle}</span>
                  </Link>
                </div>

                <div className="hidden items-center gap-1.5 text-2xs text-fg3 sm:flex">
                  <Calendar size={13} strokeWidth={1.5} />
                  <span>
                    {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "No date"}
                  </span>
                </div>

                <span
                  className={cx(
                    "font-mono text-right text-xs",
                    overdue
                      ? "font-semibold text-warn flex items-center justify-end gap-1"
                      : "text-fg3",
                  )}
                >
                  {overdue ? (
                    <>
                      <TriangleAlert size={12} strokeWidth={1.5} aria-hidden />
                      <span>Overdue</span>
                    </>
                  ) : m.dueDate ? (
                    new Date(m.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  ) : (
                    "Planned"
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
