"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FolderGit2 } from "lucide-react";
import { PhaseBadge, HealthTag } from "@/components/redesign/glyphs";
import { projectToCellPhase } from "@/components/redesign/Hundred";
import {
  Button,
  Segmented,
  StackChip,
  Tooltip,
  cx,
  Kbd,
  Empty,
} from "@/components/redesign/ui";
import {
  PHASES,
  type CellPhase,
  type Health,
  type Phase,
} from "@/components/redesign/types";
import { getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
import type { Project } from "@/types/project";

type SortKey = "num" | "name" | "category" | "phase" | "difficulty" | "health" | "commit";

const PAGE_SIZE = 50;

function formatTimestamp(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const now = Date.now();
    const diffHours = Math.floor((now - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) return `${Math.max(1, diffHours)}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function ListView({
  projects,
  onClearFilters,
}: {
  projects: Project[];
  searchQuery?: string;
  onClearFilters: () => void;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "num",
    dir: 1,
  });
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [cursor, setCursor] = useState(0);

  const [pageState, setPageState] = useState<{
    page: number;
    sortKey: SortKey;
    sortDir: 1 | -1;
    count: number;
  }>({
    page: 0,
    sortKey: "num",
    sortDir: 1,
    count: projects.length,
  });

  if (
    pageState.sortKey !== sort.key ||
    pageState.sortDir !== sort.dir ||
    pageState.count !== projects.length
  ) {
    setPageState({
      page: 0,
      sortKey: sort.key,
      sortDir: sort.dir,
      count: projects.length,
    });
  }

  const page = pageState.page;
  const setPage = (updater: number | ((prev: number) => number)) => {
    setPageState((prev) => ({
      ...prev,
      page: typeof updater === "function" ? updater(prev.page) : updater,
    }));
  };

  const tableRef = useRef<HTMLDivElement>(null);

  // Sorting logic
  const sorted = useMemo(() => {
    const healthWeight: Record<Health, number> = {
      good: 0,
      fair: 1,
      poor: 2,
      unknown: 3,
    };
    const difficultyWeight = { beginner: 0, intermediate: 1, advanced: 2 };

    const getVal = (p: Project): number | string => {
      switch (sort.key) {
        case "num":
          return p.number;
        case "name":
          return p.title.toLowerCase();
        case "category":
          return p.category.toLowerCase();
        case "phase": {
          const ph = projectToCellPhase(p);
          return PHASES.indexOf(ph as Phase);
        }
        case "difficulty":
          return difficultyWeight[p.difficulty] ?? 99;
        case "health": {
          const s = p.repositoryMetadata?.health?.status;
          let h: Health = "unknown";
          if (s === "healthy") h = "good";
          else if (s === "needs-review" || s === "stale") h = "fair";
          else if (s === "unavailable") h = "poor";
          return healthWeight[h];
        }
        case "commit": {
          const t =
            p.repositoryMetadata?.latestCommit?.date ??
            p.repositoryMetadata?.lastUpdated ??
            p.updatedAt;
          return t ? new Date(t).getTime() : 0;
        }
      }
    };

    return [...projects].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * sort.dir;
      if (va > vb) return 1 * sort.dir;
      return a.number - b.number;
    });
  }, [projects, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pagedRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Keyboard navigation (J/K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        document.querySelector('[aria-modal="true"]')
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(pagedRows.length - 1, c + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter" && pagedRows[cursor]) {
        router.push(`/projects/${pagedRows[cursor].slug}`);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pagedRows, cursor, router]);

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key ? ((prev.dir * -1) as 1 | -1) : 1,
    }));
  };

  const renderSortHeader = (
    key: SortKey,
    label: string,
    align: "left" | "right" = "left",
    cls = "",
  ) => {
    const isActive = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={isActive ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={cx(
          "sticky top-0 z-10 h-9 border-b border-line bg-surface px-3 text-2xs font-medium text-fg2 select-none",
          align === "right" && "text-right",
          cls,
        )}
      >
        <button
          type="button"
          onClick={() => handleSort(key)}
          className={cx(
            "inline-flex h-7 items-center gap-1 rounded-ctl text-2xs font-medium transition-colors hover:text-fg",
            isActive ? "text-fg font-semibold" : "text-fg3",
          )}
        >
          <span>{label}</span>
          {isActive &&
            (sort.dir === 1 ? (
              <ArrowUp size={12} strokeWidth={1.5} />
            ) : (
              <ArrowDown size={12} strokeWidth={1.5} />
            ))}
        </button>
      </th>
    );
  };

  if (projects.length === 0) {
    return (
      <Empty
        title="No projects match this table view"
        action={
          <Button size="s" variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      >
        Try resetting filters or searching with a different keyword.
      </Empty>
    );
  }

  const isCompact = density === "compact";

  return (
    <div className="rounded-panel border border-line bg-surface">
      {/* Table utility bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2 text-2xs text-fg3">
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <Kbd>J</Kbd> <Kbd>K</Kbd> to navigate rows, <Kbd>↵</Kbd> to launch workspace
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-fg3">Row density:</span>
          <Segmented
            label="Row density"
            size="s"
            value={density}
            onChange={setDensity}
            options={[
              { id: "comfortable", label: "Comfortable" },
              { id: "compact", label: "Compact" },
            ]}
          />
        </div>
      </div>

      {/* Desktop & Tablet Table */}
      <div ref={tableRef} className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr>
              {renderSortHeader("num", "No.", "left", "w-16")}
              {renderSortHeader("name", "Project Title & Specification")}
              {renderSortHeader("category", "Category", "left", "w-32")}
              {renderSortHeader("phase", "Phase", "left", "w-28")}
              {renderSortHeader("difficulty", "Complexity", "left", "w-28")}
              <th
                scope="col"
                className="sticky top-0 z-10 hidden h-9 border-b border-line bg-surface px-3 text-2xs font-medium text-fg3 lg:table-cell"
              >
                Technologies
              </th>
              {renderSortHeader("health", "Repo Health", "left", "w-28")}
              {renderSortHeader("commit", "Last Commit", "right", "w-28")}
              <th
                scope="col"
                className="sticky top-0 z-10 w-12 border-b border-line bg-surface text-center text-2xs font-medium text-fg3"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((p, idx) => {
              const phase = projectToCellPhase(p);
              const padNum = String(p.number).padStart(3, "0");
              const isSelected = idx === cursor;

              let health: Health = "unknown";
              const healthStatus = p.repositoryMetadata?.health?.status;
              if (healthStatus === "healthy") health = "good";
              else if (healthStatus === "needs-review" || healthStatus === "stale") {
                health = "fair";
              } else if (healthStatus === "unavailable") {
                health = "poor";
              }

              const commitTime = formatTimestamp(
                p.repositoryMetadata?.latestCommit?.date ??
                  p.repositoryMetadata?.lastUpdated ??
                  p.updatedAt,
              );

              return (
                <tr
                  key={p.number}
                  onClick={() => router.push(`/projects/${p.slug}`)}
                  className={cx(
                    "group cursor-pointer transition-colors duration-[80ms]",
                    "[&>td]:border-b [&>td]:border-line last:[&>td]:border-0",
                    isSelected
                      ? "[&>td]:bg-[color-mix(in_srgb,var(--bg-elevated)_80%,transparent)]"
                      : "hover:[&>td]:bg-[color-mix(in_srgb,var(--bg-elevated)_45%,transparent)]",
                  )}
                >
                  {/* Number */}
                  <td className={cx("px-3", isCompact ? "py-1.5" : "py-2.5")}>
                    <Link
                      href={`/projects/${p.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-xs font-bold text-fg group-hover:text-sodium-text"
                    >
                      #{padNum}
                    </Link>
                  </td>

                  {/* Name & description */}
                  <td
                    className={cx(
                      "max-w-xs px-3 sm:max-w-md",
                      isCompact ? "py-1.5" : "py-2.5",
                    )}
                  >
                    <p className="truncate text-xs font-semibold text-fg group-hover:text-sodium-text">
                      {p.title}
                    </p>
                    {!isCompact && (
                      <p className="line-clamp-1 text-2xs text-fg3" title={p.description}>
                        {p.description}
                      </p>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-3">
                    <span className="font-mono text-2xs text-fg2">{p.category}</span>
                  </td>

                  {/* Phase */}
                  <td className="px-3">
                    <PhaseBadge phase={phase as CellPhase} />
                  </td>

                  {/* Complexity / Difficulty */}
                  <td className="px-3">
                    <span
                      className={cx(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium capitalize",
                        getDifficultyBgColor(p.difficulty),
                        getDifficultyColor(p.difficulty),
                      )}
                    >
                      {p.difficulty}
                    </span>
                  </td>

                  {/* Stack */}
                  <td className="hidden px-3 lg:table-cell">
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {p.technologies?.slice(0, 2).map((t) => (
                        <StackChip key={t}>{t}</StackChip>
                      ))}
                      {(p.technologies?.length ?? 0) > 2 && (
                        <StackChip>+{(p.technologies?.length ?? 0) - 2}</StackChip>
                      )}
                    </div>
                  </td>

                  {/* Health */}
                  <td className="px-3">
                    <HealthTag h={health} />
                  </td>

                  {/* Last Commit */}
                  <td className="font-mono px-3 text-right text-2xs text-fg3">
                    {commitTime}
                  </td>

                  {/* Action Link */}
                  <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip label="Launch workspace">
                      <Link
                        href={`/projects/${p.slug}`}
                        aria-label={`Open workspace for ${p.title}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-ctl text-fg3 hover:bg-elevated hover:text-fg"
                      >
                        <FolderGit2 size={13} strokeWidth={1.5} />
                      </Link>
                    </Tooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-fg2">
        <span className="font-mono text-2xs text-fg3">
          Showing {sorted.length ? page * PAGE_SIZE + 1 : 0}–
          {Math.min(sorted.length, (page + 1) * PAGE_SIZE)} of {sorted.length} projects
        </span>

        <div className="flex items-center gap-1">
          <Button
            size="s"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            icon={<ChevronLeft size={13} strokeWidth={1.5} />}
            aria-label="Previous page"
          >
            Prev
          </Button>

          <span className="font-mono px-2 text-2xs text-fg3">
            {page + 1} / {totalPages}
          </span>

          <Button
            size="s"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={13} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}
