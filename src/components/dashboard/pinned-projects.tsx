"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, Empty, cx } from "@/components/redesign/ui";
import { SpecPlate } from "@/components/redesign/SpecPlate";
import { projectToSpecPlate } from "@/components/redesign/Hundred";
import type { Project } from "@/types/project";

export function PinnedProjects({
  initialProjects,
  className,
}: {
  initialProjects: Project[];
  className?: string;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Filter bookmarked projects; if none, show top active
  const pinnedList = projects.filter((p) => p.bookmarked).slice(0, 5);

  const handleTogglePin = async (p: Project) => {
    const nextBookmarked = !p.bookmarked;

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((item) =>
        item.number === p.number ? { ...item, bookmarked: nextBookmarked } : item,
      ),
    );

    try {
      await fetch(`/api/projects/${p.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: nextBookmarked }),
      });
    } catch {
      // Revert optimistic update on network error
      setProjects((prev) =>
        prev.map((item) =>
          item.number === p.number ? { ...item, bookmarked: !nextBookmarked } : item,
        ),
      );
    }
  };

  return (
    <Panel
      className={className}
      titleId="pinned-h"
      title={
        <div className="flex items-center gap-2">
          <span>Pinned</span>
          <span className="font-mono text-xs font-normal text-fg3">
            {pinnedList.length} of 5
          </span>
        </div>
      }
      actions={
        <Link
          href="/projects"
          className="inline-flex h-7 items-center rounded-ctl px-2 text-xs text-fg2 hover:bg-elevated hover:text-fg"
        >
          All projects
        </Link>
      }
      footer="Bookmark repositories from any project workspace to pin them to your shelf"
    >
      {pinnedList.length === 0 ? (
        <Empty title="Nothing pinned yet.">
          Pin up to five projects from their workspace header to keep quick shortcuts
          here.
        </Empty>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Pinned project cards"
          className={cx(
            "scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto p-3",
            "sm:grid sm:grid-cols-1 sm:overflow-visible sm:p-4",
          )}
        >
          {pinnedList.map((p) => (
            <div key={p.number} className="w-[280px] shrink-0 snap-start sm:w-full">
              <SpecPlate
                p={projectToSpecPlate(p)}
                pinned
                onTogglePin={() => handleTogglePin(p)}
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
