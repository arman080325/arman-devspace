"use client";

import Link from "next/link";
import { projects as canonicalProjects } from "@/data/projects";
import { CellFace } from "@/components/redesign/Hundred";
import { type CellPhase } from "@/components/redesign/types";
import { Tooltip, cx } from "@/components/redesign/ui";
import type { ProjectStatus } from "@/types/project";

export function statusToPhase(status: ProjectStatus): CellPhase {
  switch (status) {
    case "awaiting":
    case "backlog":
    case "cloned":
    case "analyzing":
    case "planning":
      return "exploring";
    case "in-development":
    case "testing":
      return "building";
    case "completed":
      return "shipped";
    default:
      return "unknown";
  }
}

export function MiniHundred({
  collapsed,
  activeNumber,
  onNavigate,
}: {
  collapsed?: boolean;
  activeNumber?: number;
  onNavigate?: () => void;
}) {
  const cellSize = collapsed ? 3 : 4;
  const gap = 1;

  return (
    <div
      className={cx(
        "border-b border-line",
        collapsed ? "flex justify-center py-3" : "flex items-end gap-3 px-4 py-3",
      )}
    >
      <div
        role="group"
        aria-label="Mini map of all 100 projects"
        className="grid grid-cols-10"
        style={{
          gap: `${gap}px`,
          width: `${10 * cellSize + 9 * gap}px`,
        }}
      >
        {canonicalProjects.map((p) => {
          const phase = statusToPhase(p.status);
          const isCurrent = p.number === activeNumber;

          return (
            <Tooltip
              key={p.number}
              label={`#${String(p.number).padStart(3, "0")} ${p.title} (${phase})`}
              side="right"
            >
              <Link
                href={`/projects/${p.slug}`}
                onClick={onNavigate}
                aria-label={`Project #${String(p.number).padStart(3, "0")}: ${p.title}`}
                className={cx(
                  "relative block rounded-cell transition-transform duration-75 hover:scale-125 focus-visible:outline-2 focus-visible:outline-sodium",
                  isCurrent && "ring-1 ring-sodium ring-offset-1 ring-offset-base",
                )}
                style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
              >
                <CellFace phase={phase} mini />
              </Link>
            </Tooltip>
          );
        })}
      </div>

      {!collapsed && (
        <div className="min-w-0 pb-px text-2xs text-fg3">
          {activeNumber ? (
            <span>
              You are at{" "}
              <span className="tnum font-medium text-fg">
                #{String(activeNumber).padStart(3, "0")}
              </span>
            </span>
          ) : (
            <span>
              <span className="tnum font-medium text-fg">100</span> projects loaded
            </span>
          )}
        </div>
      )}
    </div>
  );
}
