"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { Hundred, phaseCounts, projectToCellPhase } from "@/components/redesign/Hundred";
import { PhaseGlyph } from "@/components/redesign/glyphs";
import { cx } from "@/components/redesign/ui";
import {
  CATEGORIES,
  PHASES,
  PHASE_LABEL,
  type CellPhase,
} from "@/components/redesign/types";
import { LEARNING_PATHS } from "@/config/workflow";
import { getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
import type { Difficulty, Project, WorkspaceStats } from "@/types/project";

export function CategoriesOverview({
  projects,
  stats,
}: {
  projects: Project[];
  stats: WorkspaceStats;
}) {
  const levels: Difficulty[] = ["beginner", "intermediate", "advanced"];

  return (
    <div className="space-y-12">
      {/* SECTION 1: Six Canonical Categories (From Figma Design) */}
      <section aria-labelledby="canonical-categories-h" className="space-y-4">
        <div>
          <h2
            id="canonical-categories-h"
            className="text-lg font-semibold tracking-tight text-fg"
          >
            Canonical Engineering Categories
          </h2>
          <p className="text-xs text-fg3 sm:text-sm">
            Six architectural disciplines spanning all 100 repositories. Explore phase
            distributions and individual project specifications.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {CATEGORIES.map((category) => {
            const categoryProjects = projects.filter((p) => p.category === category);
            const counts = phaseCounts(categoryProjects);

            return (
              <article
                key={category}
                className="flex flex-col gap-5 rounded-panel border border-line bg-surface p-4 transition-colors hover:border-edge md:flex-row md:items-start md:p-5"
                aria-labelledby={`cat-${category.replace(/\s+/g, "-")}`}
              >
                {/* Compact Hundred visualization for this category */}
                <div className="shrink-0 flex justify-center md:justify-start">
                  <Hundred
                    size="compact"
                    projects={projects}
                    isLit={(p) => p.category === category}
                    label={`${category}: ${categoryProjects.length} of ${projects.length} projects lit`}
                  />
                </div>

                {/* Details & project pills */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                    <h3
                      id={`cat-${category.replace(/\s+/g, "-")}`}
                      className="text-base font-semibold text-fg sm:text-lg"
                    >
                      {category}
                    </h3>
                    <Link
                      href={`/projects?category=${encodeURIComponent(category)}&view=plates`}
                      className="text-xs font-medium text-sodium-text hover:underline"
                    >
                      Open in Explorer →
                    </Link>
                  </div>

                  {/* Summary & phase counts */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg2">
                    <span className="font-mono text-sm font-bold text-fg">
                      {categoryProjects.length}{" "}
                      <span className="text-xs font-normal text-fg3">projects</span>
                    </span>

                    <span className="hidden text-fg3 sm:inline">·</span>

                    <div className="flex flex-wrap items-center gap-2">
                      {PHASES.filter((ph) => counts[ph] > 0).map((ph) => (
                        <span
                          key={ph}
                          className="inline-flex items-center gap-1 text-2xs"
                        >
                          <PhaseGlyph phase={ph} size={10} />
                          <span className="font-mono font-medium text-fg">
                            {counts[ph]}
                          </span>{" "}
                          <span className="text-fg3">
                            {PHASE_LABEL[ph].toLowerCase()}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Project pills */}
                  <ul className="mt-3.5 flex flex-wrap gap-1.5">
                    {categoryProjects.map((p) => {
                      const phase = projectToCellPhase(p);
                      const padNum = String(p.number).padStart(3, "0");
                      return (
                        <li key={p.number}>
                          <Link
                            href={`/projects/${p.slug}`}
                            className="inline-flex h-7 items-center gap-1.5 rounded-ctl border border-line bg-inset px-2 text-2xs text-fg2 transition-colors hover:border-edge hover:bg-elevated hover:text-fg"
                          >
                            <PhaseGlyph phase={phase as CellPhase} size={9} />
                            <span className="font-mono font-semibold text-fg">
                              #{padNum}
                            </span>
                            <span className="max-w-[130px] truncate sm:max-w-[180px]">
                              {p.title}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Structured Skill Progression Tracks */}
      <section aria-labelledby="progression-tracks-h" className="space-y-4">
        <div>
          <h2
            id="progression-tracks-h"
            className="text-lg font-semibold tracking-tight text-fg"
          >
            Engineering Progression Tracks
          </h2>
          <p className="text-xs text-fg3 sm:text-sm">
            Three structured skill tiers dividing #001–#100 based on repository complexity
            and architectural scope.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {levels.map((level) => {
            const spec = LEARNING_PATHS[level];
            const metric = stats.difficultyBreakdown[level] || {
              total: 0,
              completed: 0,
              active: 0,
            };
            const pct =
              metric.total > 0 ? Math.round((metric.completed / metric.total) * 100) : 0;

            return (
              <div
                key={level}
                className="flex flex-col justify-between rounded-panel border border-line bg-surface p-5 transition-colors hover:border-edge"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span
                      className={cx(
                        "rounded px-2 py-0.5 text-xs font-semibold capitalize",
                        getDifficultyBgColor(level),
                        getDifficultyColor(level),
                      )}
                    >
                      {level}
                    </span>
                    <span className="font-mono text-xs text-fg3">{spec.rangeLabel}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-fg">{spec.title}</h3>
                    <p className="mt-1 text-xs text-fg2">{spec.summary}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-fg3">
                        {metric.completed} / {metric.total} completed · {metric.active}{" "}
                        active
                      </span>
                      <span className="font-mono font-medium text-fg">{pct}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${spec.title} completion`}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-inset"
                    >
                      <div
                        className="h-full rounded-full bg-sodium transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div className="space-y-2">
                    <h4 className="text-2xs font-semibold uppercase tracking-wider text-fg3">
                      Learning Outcomes
                    </h4>
                    <ul className="space-y-1.5 text-2xs text-fg2">
                      {spec.outcomes.map((outcome) => (
                        <li key={outcome} className="flex items-start gap-2">
                          <CheckCircle2
                            className="mt-0.5 size-3 shrink-0 text-ship"
                            aria-hidden="true"
                          />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Skills */}
                  <div className="space-y-1.5">
                    <h4 className="text-2xs font-semibold uppercase tracking-wider text-fg3">
                      Recommended Skills
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {spec.recommendedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded border border-line bg-inset px-1.5 py-0.5 font-mono text-[10px] text-fg3"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Complexity review note */}
                  <div className="rounded border border-amber-500/25 bg-amber-500/5 p-3 text-2xs text-fg2">
                    <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-400">
                      <ShieldAlert className="size-3" aria-hidden="true" />
                      <span>Codebase Complexity Review</span>
                    </p>
                    <p className="line-clamp-3">{spec.complexityNote}</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <Link
                    href={`/paths/${level}`}
                    className="inline-flex h-8 w-full items-center justify-between rounded-ctl border border-edge bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-elevated"
                  >
                    <span>Explore Track ({spec.rangeLabel})</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
