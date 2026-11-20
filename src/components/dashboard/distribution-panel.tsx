"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Panel, Tooltip } from "@/components/redesign/ui";
import { CATEGORIES } from "@/components/redesign/types";
import type { Project } from "@/types/project";

const CAT_SHADES = [90, 72, 56, 42, 30, 20].map(
  (n) => `color-mix(in srgb, var(--text-primary) ${n}%, var(--bg-surface))`,
);

export function DistributionPanel({
  projects,
  className,
}: {
  projects: Project[];
  className?: string;
}) {
  const byCat = useMemo(() => {
    return CATEGORIES.map((c) => ({
      category: c,
      count: projects.filter((p) => p.category === c).length,
    }));
  }, [projects]);

  const topTech = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      for (const t of p.technologies ?? []) {
        if (t && t !== "To be decided") {
          map.set(t, (map.get(t) ?? 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [projects]);

  const maxTech = topTech[0]?.[1] ?? 1;

  return (
    <Panel
      className={className}
      titleId="dist-h"
      title="Distribution"
      footer="Category weights and canonical stack prevalence across 100 projects"
    >
      <div className="p-4">
        <h3 className="mb-2 text-2xs font-medium text-fg3 uppercase tracking-wider">
          By category, 100 units
        </h3>

        {/* Proportional Category Segment Bar */}
        <div
          role="img"
          aria-label={byCat.map((x) => `${x.category}: ${x.count}`).join(", ")}
          className="flex h-4 gap-px overflow-hidden rounded-cell border border-line bg-surface"
        >
          {byCat.map((x, i) => (
            <Tooltip key={x.category} label={`${x.category}: ${x.count} projects`}>
              <span
                className="h-full transition-opacity hover:opacity-80"
                style={{
                  flex: x.count,
                  background: CAT_SHADES[i % CAT_SHADES.length],
                }}
              />
            </Tooltip>
          ))}
        </div>

        {/* Category Legend List */}
        <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {byCat.map((x, i) => (
            <li key={x.category} className="flex items-center justify-between gap-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[1px]"
                style={{ background: CAT_SHADES[i % CAT_SHADES.length] }}
              />
              <Link
                href={`/projects?category=${encodeURIComponent(x.category)}`}
                className="min-w-0 flex-1 truncate text-fg2 transition-colors hover:text-fg hover:underline"
              >
                {x.category}
              </Link>
              <span className="font-mono text-fg">{x.count}</span>
            </li>
          ))}
        </ul>

        {/* Top Technologies Exposure */}
        <h3 className="mb-2 mt-5 text-2xs font-medium text-fg3 uppercase tracking-wider">
          Most Used Technology
        </h3>
        <ul className="flex flex-col gap-2">
          {topTech.map(([tech, count]) => (
            <li
              key={tech}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-24 shrink-0 truncate text-fg font-medium">{tech}</span>
                <div className="h-1.5 flex-1 rounded-[1px] bg-line overflow-hidden">
                  <div
                    className="h-full rounded-[1px] bg-sodium transition-all"
                    style={{ width: `${(count / maxTech) * 100}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-right text-fg2">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
