"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Hundred,
  HundredLegend,
  projectToCellPhase,
} from "@/components/redesign/Hundred";
import { PhaseGlyph } from "@/components/redesign/glyphs";
import { Panel, Empty, Button, Tooltip, StackChip } from "@/components/redesign/ui";
import {
  PHASE_COLOR_VAR,
  PHASE_LABEL,
  type CellPhase,
} from "@/components/redesign/types";
import type { Project } from "@/types/project";

export function FieldView({
  allProjects,
  matchingProjects,
  isFiltered,
  onClearFilters,
}: {
  allProjects: Project[];
  matchingProjects: Project[];
  isFiltered: boolean;
  onClearFilters: () => void;
}) {
  const matchingNumbers = new Set(matchingProjects.map((p) => p.number));
  const isLit = isFiltered ? (p: Project) => matchingNumbers.has(p.number) : undefined;

  return (
    <div className="space-y-6">
      {/* Hero Spatial Hundred Visualization */}
      <Panel
        titleId="field-view-title"
        title={isFiltered ? "Lens on matching projects" : "The 100-Project Field"}
        actions={
          <span className="font-mono text-xs text-fg3">
            {matchingProjects.length} lit
          </span>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-fg3">
            <span>
              Matching cells stay lit, others dim. Hover any cell for spec plate preview,
              click to launch workspace.
            </span>
            <span className="font-mono">Spatial matrix #001 – #100</span>
          </div>
        }
      >
        <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:p-6">
          <div className="flex justify-center md:justify-start">
            <Hundred
              size="hero"
              projects={allProjects}
              isLit={isLit}
              label={`The Hundred matrix: ${matchingProjects.length} of ${allProjects.length} projects lit`}
              className="max-md:!w-full md:w-[min(100%,480px)]"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-panel border border-line bg-surface p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg2">
                Phase Distribution
              </h3>
              <HundredLegend projects={matchingProjects} layout="column" />
            </div>

            {isFiltered && matchingProjects.length === 0 && (
              <Empty
                title="No projects match this lens"
                action={
                  <Button size="s" variant="secondary" onClick={onClearFilters}>
                    Clear filters and show all 100
                  </Button>
                }
              >
                Try broadening your search query or removing some active filters.
              </Empty>
            )}
          </div>
        </div>
      </Panel>

      {/* Spatial Project Card Matrix */}
      {matchingProjects.length > 0 && (
        <section aria-labelledby="matching-cells-h">
          <div className="mb-3 flex items-center justify-between">
            <h3
              id="matching-cells-h"
              className="text-xs font-semibold uppercase tracking-wider text-fg3"
            >
              Active Projects in Field ({matchingProjects.length})
            </h3>
            <span className="font-mono text-2xs text-fg3">Direct Launch Links</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {matchingProjects.map((p) => {
              const phase = projectToCellPhase(p);
              const color = PHASE_COLOR_VAR[phase] ?? "var(--border-default)";
              const padNum = String(p.number).padStart(3, "0");

              return (
                <Tooltip
                  key={p.number}
                  label={
                    <div className="space-y-1">
                      <p className="font-semibold text-fg">
                        #{padNum} {p.title}
                      </p>
                      <p className="text-2xs text-fg2">{p.category}</p>
                      <p className="text-2xs text-fg3">
                        Phase: {PHASE_LABEL[phase as CellPhase]}
                      </p>
                    </div>
                  }
                >
                  <Link
                    href={`/projects/${p.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-ctl border border-line bg-surface p-2.5 transition-all duration-[120ms] hover:border-edge hover:bg-elevated focus-visible:outline-2 focus-visible:outline-sodium"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[2.5px]"
                      style={{ background: color }}
                    />

                    <div className="flex items-center justify-between gap-1 pl-1">
                      <span className="font-mono text-xs font-bold text-fg">
                        #{padNum}
                      </span>
                      <PhaseGlyph phase={phase} size={11} />
                    </div>

                    <div className="my-1.5 min-w-0 pl-1">
                      <p className="truncate text-xs font-medium text-fg group-hover:text-sodium-text">
                        {p.title}
                      </p>
                      <p className="truncate font-mono text-[10px] text-fg3">
                        {p.category}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-1 border-t border-line/60 pt-1.5 pl-1">
                      <span className="truncate text-[10px] text-fg3">
                        {p.technologies?.[0] ? (
                          <StackChip>{p.technologies[0]}</StackChip>
                        ) : (
                          p.difficulty
                        )}
                      </span>
                      <ArrowUpRight
                        size={11}
                        className="text-fg3 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
