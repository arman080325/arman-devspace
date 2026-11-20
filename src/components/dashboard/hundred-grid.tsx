"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Hundred,
  HundredLegend,
  projectToCellPhase,
  type SortMode,
} from "@/components/redesign/Hundred";
import { Panel, Segmented } from "@/components/redesign/ui";
import type { Phase } from "@/components/redesign/types";
import type { Project } from "@/types/project";

export function HundredGridSection({
  projects,
  className,
}: {
  projects: Project[];
  className?: string;
}) {
  const [sort, setSort] = useState<SortMode>("number");
  const [lens, setLens] = useState<Phase | null>(null);

  return (
    <Panel
      className={className}
      titleId="hundred-h"
      title={
        <div className="flex items-center gap-2">
          <span>The Hundred</span>
          <span className="font-mono text-xs font-normal text-fg3">
            {projects.length} / 100 slots
          </span>
        </div>
      }
      actions={
        <Segmented
          label="Sort the field"
          size="s"
          value={sort}
          onChange={setSort}
          options={[
            { id: "number", label: "Number" },
            { id: "phase", label: "Phase" },
            { id: "category", label: "Category" },
            { id: "activity", label: "Activity" },
          ]}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg3">
          <span>Phases mapped from pipeline, CI and deployment telemetry</span>
          <Link href="/projects" className="text-sodium-text hover:underline">
            View as list &rarr;
          </Link>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-start md:p-5">
        <Hundred
          size="hero"
          projects={projects}
          sort={sort}
          isLit={lens ? (p) => projectToCellPhase(p) === lens : undefined}
          className="sm:w-[min(100%,476px)] max-sm:!w-full"
        />
        <div className="min-w-0 flex-1 sm:pt-1">
          <HundredLegend
            projects={projects}
            lens={lens}
            onLens={setLens}
            layout="column"
          />
          <p className="mt-4 max-w-[34ch] text-2xs text-fg3">
            Click a phase to filter the field. Arrow keys navigate cells; Enter opens the
            project workspace.
          </p>
        </div>
      </div>
    </Panel>
  );
}
