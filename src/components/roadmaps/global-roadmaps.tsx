"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Diamond,
  GanttChart,
  GripVertical,
  Kanban,
  List,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  Button,
  Checkbox,
  Empty,
  ErrorBanner,
  Popover,
  SegBar,
  Segmented,
  cx,
} from "@/components/redesign/ui";
import { PhaseGlyph } from "@/components/redesign/glyphs";
import { PHASE_LABEL, type CellPhase } from "@/components/redesign/types";
import { KANBAN_COLUMNS } from "@/config/workflow";
import {
  aggregateGlobalRoadmapData,
  type DueBucket,
  type GlobalMilestoneItem,
  type ProjectRoadmapBundle,
} from "@/lib/roadmap-utils";
import { getStatusLabel } from "@/lib/utils";
import { PROJECT_STATUSES } from "@/lib/validations";
import type {
  Project,
  ProjectMilestone,
  ProjectRoadmapItem,
  ProjectStatus,
  ProjectTask,
} from "@/types/project";

export interface GlobalRoadmapsClientProps {
  initialProjects: Project[];
  initialMilestones: ProjectMilestone[];
  initialTasks: ProjectTask[];
  initialPersistedRoadmaps: ProjectRoadmapItem[];
}

type ViewMode = "timeline" | "list" | "pipeline";
type ZoomMode = "week" | "month" | "quarter";
type GroupMode = "project" | "due";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatUtcDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  return dateStr.slice(0, 10);
}

export function GlobalRoadmapsClient({
  initialProjects,
  initialMilestones,
  initialTasks,
  initialPersistedRoadmaps,
}: GlobalRoadmapsClientProps) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [milestones, setMilestones] =
    React.useState<ProjectMilestone[]>(initialMilestones);
  const [tasks, setTasks] = React.useState<ProjectTask[]>(initialTasks);
  const [persistedRoadmaps] = React.useState<ProjectRoadmapItem[]>(
    initialPersistedRoadmaps,
  );

  const [view, setView] = React.useState<ViewMode>("timeline");
  const [zoom, setZoom] = React.useState<ZoomMode>("month");
  const [groupBy, setGroupBy] = React.useState<GroupMode>("project");
  const [search, setSearch] = React.useState("");
  const [phaseFilter, setPhaseFilter] = React.useState<CellPhase | "all">("all");
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const aggregation = React.useMemo(
    () =>
      aggregateGlobalRoadmapData({
        projects,
        milestones,
        tasks,
        persistedRoadmaps,
      }),
    [projects, milestones, tasks, persistedRoadmaps],
  );

  // Default selected project IDs: projects with roadmap/milestone/task data or active status
  const defaultSelectedIds = React.useMemo(() => {
    const ids = aggregation.bundles
      .filter(
        (b) =>
          b.hasAnyRoadmapData ||
          (b.project.status !== "awaiting" &&
            b.project.status !== "completed" &&
            !b.project.isPlaceholder),
      )
      .map((b) => b.project.id);
    return ids;
  }, [aggregation.bundles]);

  const [customSelectedIds, setCustomSelectedIds] = React.useState<string[] | null>(null);
  const selectedIds = customSelectedIds ?? defaultSelectedIds;

  const filteredBundles = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return aggregation.bundles.filter((b) => {
      if (!selectedIds.includes(b.project.id)) return false;
      if (phaseFilter !== "all" && b.phase !== phaseFilter) return false;
      if (!q) return true;
      const padded = String(b.project.number).padStart(3, "0");
      return (
        b.project.title.toLowerCase().includes(q) ||
        padded.includes(q.replace(/^#/, "")) ||
        String(b.project.number) === q.replace(/^#/, "") ||
        b.milestones.some((m) => m.title.toLowerCase().includes(q)) ||
        b.tasks.some((t) => t.title.toLowerCase().includes(q))
      );
    });
  }, [aggregation.bundles, selectedIds, phaseFilter, search]);

  const handleToggleMilestone = async (ms: GlobalMilestoneItem) => {
    const nextCompleted = !ms.completed;
    setMutationError(null);
    setUpdatingId(ms.id);

    // Optimistic update
    const prevSnapshot = milestones;
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === ms.id
          ? {
              ...m,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : m,
      ),
    );

    try {
      const res = await fetch(`/api/projects/${ms.projectSlug}/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: ms.id,
          completed: nextCompleted,
        }),
      });
      if (!res.ok) {
        throw new Error("Could not update milestone status.");
      }
    } catch (err) {
      setMilestones(prevSnapshot);
      setMutationError(
        err instanceof Error ? err.message : "Failed to persist milestone update.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleTask = async (projectSlug: string, task: ProjectTask) => {
    const nextCompleted = !task.completed;
    setMutationError(null);
    setUpdatingId(task.id);

    const prevSnapshot = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : t,
      ),
    );

    try {
      const res = await fetch(`/api/projects/${projectSlug}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          completed: nextCompleted,
        }),
      });
      if (!res.ok) {
        throw new Error("Could not update task completion.");
      }
    } catch (err) {
      setTasks(prevSnapshot);
      setMutationError(
        err instanceof Error ? err.message : "Failed to persist task update.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMoveProjectStatus = async (project: Project, nextStatus: ProjectStatus) => {
    if (project.status === nextStatus) return;
    setMutationError(null);
    setUpdatingId(project.id);
    const prevProjects = projects;

    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              status: nextStatus,
              completionPercentage:
                nextStatus === "completed" ? 100 : (p.completionPercentage ?? 0),
            }
          : p,
      ),
    );

    try {
      const res = await fetch(`/api/projects/${project.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        throw new Error(`Failed to move ${project.title}.`);
      }
      const json = (await res.json()) as {
        progress?: { status: ProjectStatus; completionPercentage: number };
      };
      if (json.progress) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  status: json.progress!.status,
                  completionPercentage: json.progress!.completionPercentage,
                }
              : p,
          ),
        );
      }
    } catch (err) {
      setProjects(prevProjects);
      setMutationError(
        err instanceof Error ? err.message : "Network error updating project status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const { summary } = aggregation;
  const selectableBundles = React.useMemo(
    () =>
      aggregation.bundles.filter((b) => !b.project.isPlaceholder || b.hasAnyRoadmapData),
    [aggregation.bundles],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="display text-2xl leading-tight text-fg sm:text-3xl">Roadmaps</h1>
          <p className="tnum mt-1 font-mono text-xs text-fg2 sm:text-sm">
            {summary.projectsWithData} tracked projects · {summary.totalMilestones}{" "}
            milestones ({summary.overdueMilestones} overdue) · {summary.completedTasks}/
            {summary.totalTasks} tasks resolved
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Roadmap presentation mode"
            value={view}
            onChange={setView}
            options={[
              {
                id: "timeline",
                label: "Timeline",
                icon: <GanttChart size={14} strokeWidth={1.5} />,
              },
              {
                id: "list",
                label: "List",
                icon: <List size={14} strokeWidth={1.5} />,
              },
              {
                id: "pipeline",
                label: "Pipeline",
                icon: <Kanban size={14} strokeWidth={1.5} />,
              },
            ]}
          />

          {view === "timeline" && (
            <Segmented
              label="Timeline zoom"
              value={zoom}
              onChange={setZoom}
              options={[
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "quarter", label: "Quarter" },
              ]}
            />
          )}

          {view === "list" && (
            <Segmented
              label="Group milestones by"
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { id: "project", label: "By project" },
                { id: "due", label: "By due date" },
              ]}
            />
          )}
        </div>
      </header>

      {mutationError && (
        <div className="mb-4">
          <ErrorBanner
            action={
              <Button size="s" onClick={() => setMutationError(null)}>
                Dismiss
              </Button>
            }
          >
            {mutationError}
          </ErrorBanner>
        </div>
      )}

      {/* Filter Bar (for Timeline & List) */}
      {view !== "pipeline" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-panel border border-line bg-surface px-3 py-2.5">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg3"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter projects, milestones, or tasks..."
              aria-label="Search roadmaps"
              className="h-9 w-full rounded-ctl border border-edge bg-inset pl-8 pr-2 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40 md:h-8"
            />
          </div>

          <ProjectPicker
            bundles={selectableBundles}
            selectedIds={selectedIds}
            defaultIds={defaultSelectedIds}
            onChange={(next) => setCustomSelectedIds(next)}
          />

          <select
            aria-label="Filter by phase"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as CellPhase | "all")}
            className="h-9 rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none md:h-8"
          >
            <option value="all">All phases</option>
            <option value="exploring">Exploring</option>
            <option value="building">Building</option>
            <option value="rebuilding">Rebuilding</option>
            <option value="breaking">Breaking</option>
            <option value="shipped">Shipped</option>
          </select>

          <span className="ml-auto hidden font-mono text-2xs text-fg3 lg:inline">
            {summary.projectsWithoutData} projects without persisted roadmap records
          </span>
        </div>
      )}

      {/* Active View */}
      {view === "pipeline" ? (
        <PipelineBoardView
          projects={projects}
          search={search}
          onSearchChange={setSearch}
          updatingId={updatingId}
          onMoveStatus={handleMoveProjectStatus}
        />
      ) : filteredBundles.length === 0 ? (
        <section className="rounded-panel border border-line bg-surface">
          <Empty
            title={
              summary.projectsWithData === 0 && selectedIds.length === 0
                ? "No persisted roadmaps or milestones yet."
                : "No projects match the current selection."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  size="s"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setPhaseFilter("all");
                    setCustomSelectedIds(
                      selectableBundles.slice(0, 20).map((b) => b.project.id),
                    );
                  }}
                >
                  Show top 20 defined projects
                </Button>
                <Link href="/projects">
                  <Button size="s" variant="primary">
                    Open Project Explorer
                  </Button>
                </Link>
              </div>
            }
          >
            Milestones, tasks, and custom phase statuses are created inside each project
            workspace so every repository keeps an independent lifecycle.
          </Empty>
        </section>
      ) : view === "timeline" ? (
        <TimelineView
          bundles={filteredBundles}
          zoom={zoom}
          onToggleMilestone={handleToggleMilestone}
        />
      ) : (
        <ListView
          bundles={filteredBundles}
          groupBy={groupBy}
          updatingId={updatingId}
          onToggleMilestone={handleToggleMilestone}
          onToggleTask={handleToggleTask}
        />
      )}
    </div>
  );
}

/* ============================================================================
   PROJECT PICKER POPOVER
   ============================================================================ */

function ProjectPicker({
  bundles,
  selectedIds,
  defaultIds,
  onChange,
}: {
  bundles: ProjectRoadmapBundle[];
  selectedIds: string[];
  defaultIds: string[];
  onChange: (next: string[]) => void;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const withDataIds = React.useMemo(
    () => bundles.filter((b) => b.hasAnyRoadmapData).map((b) => b.project.id),
    [bundles],
  );

  const visible = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return bundles
      .filter((b) => {
        if (!query) return true;
        const padded = String(b.project.number).padStart(3, "0");
        return (
          b.project.title.toLowerCase().includes(query) ||
          padded.includes(query.replace(/^#/, ""))
        );
      })
      .slice(0, 40);
  }, [bundles, q]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg hover:bg-elevated md:h-8"
      >
        <span className="tnum font-medium">{selectedIds.length} projects</span>
        <ChevronDown size={14} strokeWidth={1.5} className="text-fg3" />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} width={320}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search # or project name..."
          aria-label="Filter project picker"
          className="mb-1.5 h-8 w-full rounded-ctl border border-edge bg-inset px-2 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
        />
        <div className="flex flex-wrap gap-1 px-1 pb-1.5">
          <Button
            size="s"
            variant="ghost"
            onClick={() => onChange(withDataIds)}
            disabled={withDataIds.length === 0}
          >
            With data ({withDataIds.length})
          </Button>
          <Button size="s" variant="ghost" onClick={() => onChange(defaultIds)}>
            Active ({defaultIds.length})
          </Button>
          <Button size="s" variant="ghost" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
        <div className="my-1 h-px bg-line" />
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Projects"
          className="max-h-60 overflow-y-auto"
        >
          {visible.map((b) => {
            const p = b.project;
            const checked = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex h-8 items-center justify-between rounded-ctl px-2 hover:bg-base"
              >
                <Checkbox
                  checked={checked}
                  onChange={(next) =>
                    onChange(
                      next
                        ? [...selectedIds, p.id]
                        : selectedIds.filter((id) => id !== p.id),
                    )
                  }
                  label={
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-fg">
                      <PhaseGlyph phase={b.phase} size={11} />
                      <span className="tnum font-mono font-medium">
                        {String(p.number).padStart(3, "0")}
                      </span>
                      <span className="max-w-[165px] truncate">{p.title}</span>
                    </span>
                  }
                />
                {b.milestones.length > 0 && (
                  <span className="font-mono text-[10px] text-fg3">
                    {b.milestones.length}m
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}

/* ============================================================================
   TIMELINE VIEW
   ============================================================================ */

function TimelineView({
  bundles,
  zoom,
  onToggleMilestone,
}: {
  bundles: ProjectRoadmapBundle[];
  zoom: ZoomMode;
  onToggleMilestone: (ms: GlobalMilestoneItem) => void;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const pxDay = zoom === "week" ? 20 : zoom === "month" ? 8 : 3;

  const allDatedMilestones = React.useMemo(
    () => bundles.flatMap((b) => b.milestones).filter((m) => m.daysUntilDue !== null),
    [bundles],
  );

  const startDay = React.useMemo(() => {
    const minDue = allDatedMilestones.reduce(
      (min, m) => Math.min(min, m.daysUntilDue ?? 0),
      -14,
    );
    return Math.max(-180, Math.min(-14, minDue - 7));
  }, [allDatedMilestones]);

  const endDay = React.useMemo(() => {
    const maxDue = allDatedMilestones.reduce(
      (max, m) => Math.max(max, m.daysUntilDue ?? 0),
      35,
    );
    return Math.min(365, Math.max(35, maxDue + 14));
  }, [allDatedMilestones]);

  const width = (endDay - startDay) * pxDay;
  const xForDay = React.useCallback(
    (day: number) => (day - startDay) * pxDay,
    [startDay, pxDay],
  );
  const labelWidth = 220;

  React.useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = Math.max(
        0,
        xForDay(0) - Math.max(80, (scrollerRef.current.clientWidth - labelWidth) / 2),
      );
    }
  }, [zoom, xForDay]);

  const ticks = React.useMemo(() => {
    const out: Array<{ label: string; x: number; major: boolean }> = [];
    const today = new Date();
    const baseUtcMs = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    for (let d = startDay; d <= endDay; d++) {
      const dt = new Date(baseUtcMs + d * 86_400_000);
      if (zoom === "week" && dt.getUTCDay() === 1) {
        out.push({
          label: `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`,
          x: xForDay(d),
          major: dt.getUTCDate() <= 7,
        });
      } else if (zoom === "month" && dt.getUTCDate() === 1) {
        out.push({
          label: `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`,
          x: xForDay(d),
          major: true,
        });
      } else if (
        zoom === "quarter" &&
        dt.getUTCDate() === 1 &&
        dt.getUTCMonth() % 3 === 0
      ) {
        out.push({
          label: `Q${Math.floor(dt.getUTCMonth() / 3) + 1} ${dt.getUTCFullYear()}`,
          x: xForDay(d),
          major: true,
        });
      }
    }
    return out;
  }, [startDay, endDay, zoom, xForDay]);

  return (
    <section
      className="rounded-panel border border-line bg-surface"
      aria-label="Cross-project roadmap timeline"
    >
      <div
        ref={scrollerRef}
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Timeline, scroll horizontally"
      >
        <div style={{ width: labelWidth + width }} className="relative min-w-full">
          {/* Date Axis */}
          <div className="sticky top-0 z-10 flex h-9 border-b border-line bg-surface">
            <div
              style={{ width: labelWidth }}
              className="sticky left-0 z-20 flex shrink-0 items-center border-r border-line bg-surface px-4 text-2xs font-medium text-fg3"
            >
              Project
            </div>
            <div className="relative flex-1">
              {ticks.map((t) => (
                <span
                  key={`${t.label}-${t.x}`}
                  className={cx(
                    "absolute top-0 h-full whitespace-nowrap border-l pl-1.5 pt-2.5 font-mono text-2xs",
                    t.major ? "border-edge text-fg2" : "border-line text-fg3",
                  )}
                  style={{ left: t.x }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Today Vertical Marker */}
          <div
            className="pointer-events-none absolute bottom-0 top-9 z-[5] w-0.5 bg-sodium"
            style={{ left: labelWidth + xForDay(0) }}
          >
            <span className="absolute left-1 top-1 rounded-cell bg-sodium px-1 text-[10px] font-semibold text-on-sodium">
              Today
            </span>
          </div>

          {/* Project Lanes */}
          {bundles.map((b) => {
            const p = b.project;
            const dated = b.milestones.filter((m) => m.daysUntilDue !== null);
            const undatedCount = b.milestones.length - dated.length;
            return (
              <div key={p.id} className="flex border-b border-line last:border-0">
                <div
                  style={{ width: labelWidth }}
                  className="sticky left-0 z-[6] shrink-0 border-r border-line bg-surface px-3 py-2.5 md:px-4"
                >
                  <Link
                    href={`/projects/${p.slug}?tab=roadmap`}
                    className="flex items-center gap-1.5 text-sm hover:underline"
                  >
                    <PhaseGlyph phase={b.phase} />
                    <span className="tnum font-mono font-semibold text-fg">
                      {String(p.number).padStart(3, "0")}
                    </span>
                    <span className="truncate text-fg">{p.title}</span>
                  </Link>

                  <p className="tnum mt-1 text-2xs text-fg3">
                    {b.milestones.length > 0
                      ? `${b.completedMilestonesCount} of ${b.milestones.length} milestones done`
                      : b.tasks.length > 0
                        ? `${b.completedTasksCount}/${b.tasks.length} tasks · no milestones`
                        : "No milestones recorded"}
                  </p>

                  {b.milestones.length > 0 && (
                    <SegBar
                      value={b.completedMilestonesCount}
                      total={b.milestones.length}
                      className="mt-1.5"
                      label={`${p.title}: ${b.completedMilestonesCount} of ${b.milestones.length} milestones done`}
                    />
                  )}
                </div>

                <div className="relative h-[80px] flex-1">
                  {dated.length > 1 && (
                    <span
                      aria-hidden
                      className="absolute top-[40px] h-px bg-edge"
                      style={{
                        left: xForDay(
                          Math.max(startDay, Math.min(endDay, dated[0].daysUntilDue!)),
                        ),
                        width: Math.max(
                          0,
                          xForDay(
                            Math.max(
                              startDay,
                              Math.min(endDay, dated[dated.length - 1].daysUntilDue!),
                            ),
                          ) -
                            xForDay(
                              Math.max(
                                startDay,
                                Math.min(endDay, dated[0].daysUntilDue!),
                              ),
                            ),
                        ),
                      }}
                    />
                  )}

                  {dated.map((m, idx) => {
                    const clampedDay = Math.max(
                      startDay + 2,
                      Math.min(endDay - 2, m.daysUntilDue!),
                    );
                    const left = xForDay(clampedDay);
                    const above = idx % 2 === 0;
                    return (
                      <div
                        key={m.id}
                        className="group absolute top-[40px]"
                        style={{ left }}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleMilestone(m)}
                          aria-label={`${m.title}, due ${formatUtcDate(m.dueDate)}, ${m.completed ? "completed" : m.isOverdue ? "overdue" : "open"}`}
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-cell bg-surface p-0.5 focus-visible:outline-2 focus-visible:outline-sodium"
                        >
                          {m.completed ? (
                            <Diamond
                              size={13}
                              className="fill-ship text-ship"
                              aria-hidden
                            />
                          ) : m.isOverdue ? (
                            <TriangleAlert size={13} className="text-warn" aria-hidden />
                          ) : (
                            <Circle size={13} className="text-sodium-text" aria-hidden />
                          )}
                        </button>

                        <span
                          className={cx(
                            "absolute left-2.5 max-w-[155px] truncate whitespace-nowrap text-[11px]",
                            above ? "-top-[28px]" : "top-[12px]",
                            m.isOverdue
                              ? "font-medium text-warn"
                              : m.completed
                                ? "text-fg3 line-through"
                                : "text-fg2",
                          )}
                        >
                          {m.isOverdue ? "Overdue · " : ""}
                          {m.title}
                        </span>

                        {/* Hover/Focus Inspection Popover */}
                        <div className="pointer-events-none absolute left-3 top-3 z-30 hidden w-[230px] rounded-panel border border-edge bg-elevated p-2.5 text-xs shadow-pop group-hover:block group-focus-within:block">
                          <p className="font-medium text-fg">{m.title}</p>
                          <p className="mt-1 font-mono text-2xs text-fg3">
                            Due {formatUtcDate(m.dueDate)} ·{" "}
                            {m.completed ? "Completed" : m.isOverdue ? "Overdue" : "Open"}
                          </p>
                          <p className="mt-1 text-[10px] text-fg3">
                            Click marker to toggle completion
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {undatedCount > 0 && (
                    <span className="absolute right-3 top-2 rounded-ctl border border-line bg-inset px-2 py-0.5 font-mono text-[10px] text-fg3">
                      +{undatedCount} undated milestone{undatedCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-line px-4 py-2.5 text-2xs text-fg3">
        Diamond completed · circle open · triangle overdue · amber line today. Plotted
        strictly from persisted milestone due dates.
      </p>
    </section>
  );
}

/* ============================================================================
   RESPONSIVE LIST / GROUPED VIEW
   ============================================================================ */

function ListView({
  bundles,
  groupBy,
  updatingId,
  onToggleMilestone,
  onToggleTask,
}: {
  bundles: ProjectRoadmapBundle[];
  groupBy: GroupMode;
  updatingId: string | null;
  onToggleMilestone: (ms: GlobalMilestoneItem) => void;
  onToggleTask: (projectSlug: string, task: ProjectTask) => void;
}) {
  if (groupBy === "project") {
    return (
      <div className="flex flex-col gap-4">
        {bundles.map((b) => {
          const p = b.project;
          return (
            <section
              key={p.id}
              className="rounded-panel border border-line bg-surface"
              aria-label={`Roadmap for ${p.title}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/projects/${p.slug}?tab=roadmap`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-fg hover:underline"
                  >
                    <PhaseGlyph phase={b.phase} />
                    <span className="tnum font-mono">
                      #{String(p.number).padStart(3, "0")}
                    </span>
                    <span className="truncate">{p.title}</span>
                  </Link>
                  <span className="rounded-ctl border border-line bg-inset px-2 py-0.5 text-[11px] text-fg2">
                    {PHASE_LABEL[b.phase]}
                  </span>
                  <span className="tnum font-mono text-2xs text-fg3">
                    {b.completedMilestonesCount}/{b.milestones.length} milestones ·{" "}
                    {b.completedTasksCount}/{b.tasks.length} tasks
                  </span>
                </div>

                <Link
                  href={`/projects/${p.slug}?tab=milestones`}
                  className="inline-flex items-center gap-1 text-xs text-sodium-text hover:underline"
                >
                  <span>Open workspace</span>
                  <ArrowUpRight size={13} strokeWidth={1.5} />
                </Link>
              </header>

              {/* Persisted Workflow Phase Progress */}
              {b.hasPersistedRoadmap && (
                <div className="flex flex-wrap gap-1.5 border-b border-line/60 bg-inset/40 px-4 py-2">
                  {b.persistedPhases.map((rp) => (
                    <span
                      key={rp.id}
                      className={cx(
                        "inline-flex items-center gap-1 rounded-ctl border px-2 py-0.5 text-[11px]",
                        rp.status === "completed"
                          ? "border-ship/40 bg-ship/10 text-ship"
                          : rp.status === "in-progress"
                            ? "border-sodium/40 bg-sodium/10 text-sodium-text"
                            : "border-line bg-surface text-fg3",
                      )}
                    >
                      <span className="font-mono">P{rp.phase}</span>
                      <span>{rp.title}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Milestones List */}
              {b.milestones.length === 0 && b.tasks.length === 0 ? (
                <div className="px-4 py-5 text-xs text-fg3">
                  No milestones or tasks persisted for this project yet.
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {b.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
                    >
                      <button
                        type="button"
                        disabled={updatingId === m.id}
                        onClick={() => onToggleMilestone(m)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {m.completed ? (
                          <CheckCircle2 size={15} className="shrink-0 text-ship" />
                        ) : (
                          <Circle size={15} className="shrink-0 text-fg3" />
                        )}
                        <span
                          className={cx(
                            "truncate text-sm",
                            m.completed ? "text-fg3 line-through" : "text-fg",
                          )}
                        >
                          {m.title}
                        </span>
                      </button>

                      <div className="flex items-center gap-2">
                        {m.isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn">
                            <TriangleAlert size={11} />
                            Overdue ({formatUtcDate(m.dueDate)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-2xs text-fg3">
                            <Calendar size={11} />
                            {formatUtcDate(m.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {b.tasks.slice(0, 6).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 bg-inset/30 px-4 py-2 text-xs"
                    >
                      <button
                        type="button"
                        disabled={updatingId === t.id}
                        onClick={() => onToggleTask(p.slug, t)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {t.completed ? (
                          <CheckCircle2 size={13} className="shrink-0 text-ship" />
                        ) : (
                          <Circle size={13} className="shrink-0 text-fg3" />
                        )}
                        <span
                          className={cx(
                            "truncate",
                            t.completed ? "text-fg3 line-through" : "text-fg2",
                          )}
                        >
                          {t.title}
                        </span>
                      </button>
                      <span className="font-mono text-[10px] text-fg3">{t.phase}</span>
                    </div>
                  ))}
                  {b.tasks.length > 6 && (
                    <div className="px-4 py-2 text-2xs text-fg3">
                      +{b.tasks.length - 6} more tasks in workspace
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  // Group by due-date buckets
  const allMilestones = bundles.flatMap((b) => b.milestones);
  const buckets: Array<{ key: DueBucket; label: string; warn?: boolean }> = [
    { key: "overdue", label: "Overdue", warn: true },
    { key: "next-14-days", label: "Next 14 days" },
    { key: "later", label: "Later" },
    { key: "undated", label: "No due date" },
    { key: "completed", label: "Completed" },
  ];

  const nonEmptyBuckets = buckets
    .map((bucket) => ({
      ...bucket,
      items: allMilestones.filter((m) => m.dueBucket === bucket.key),
    }))
    .filter((b) => b.items.length > 0);

  if (nonEmptyBuckets.length === 0) {
    return (
      <section className="rounded-panel border border-line bg-surface">
        <Empty title="No milestones persisted across selected projects.">
          Open any project workspace to add due-dated milestones, or switch to List by
          project to view tasks.
        </Empty>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {nonEmptyBuckets.map((bucket) => (
        <section key={bucket.key} className="rounded-panel border border-line bg-surface">
          <h2
            className={cx(
              "flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold",
              bucket.warn ? "text-warn" : "text-fg",
            )}
          >
            {bucket.warn && <TriangleAlert size={14} strokeWidth={1.5} aria-hidden />}
            <span>{bucket.label}</span>
            <span className="tnum font-mono text-2xs font-normal text-fg3">
              {bucket.items.length}
            </span>
          </h2>
          <ul className="divide-y divide-line">
            {bucket.items.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <button
                    type="button"
                    disabled={updatingId === m.id}
                    onClick={() => onToggleMilestone(m)}
                    aria-label={`Toggle milestone ${m.title}`}
                    className="shrink-0"
                  >
                    {m.completed ? (
                      <CheckCircle2 size={15} className="text-ship" />
                    ) : (
                      <Circle size={15} className="text-fg3" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={cx(
                        "truncate text-sm",
                        m.completed ? "text-fg3 line-through" : "text-fg",
                      )}
                    >
                      {m.title}
                    </p>
                    <Link
                      href={`/projects/${m.projectSlug}?tab=milestones`}
                      className="inline-flex items-center gap-1 text-2xs text-fg3 hover:text-fg hover:underline"
                    >
                      <PhaseGlyph phase={m.projectPhase} size={10} />
                      <span className="tnum font-mono font-medium">
                        #{String(m.projectNumber).padStart(3, "0")}
                      </span>
                      <span className="truncate">{m.projectTitle}</span>
                    </Link>
                  </div>
                </div>

                <span
                  className={cx(
                    "tnum font-mono text-2xs",
                    m.isOverdue ? "font-semibold text-warn" : "text-fg2",
                  )}
                >
                  {formatUtcDate(m.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ============================================================================
   7-STAGE PIPELINE VIEW (PRESERVES /KANBAN STAGE CONTROL)
   ============================================================================ */

function PipelineBoardView({
  projects,
  search,
  onSearchChange,
  updatingId,
  onMoveStatus,
}: {
  projects: Project[];
  search: string;
  onSearchChange: (q: string) => void;
  updatingId: string | null;
  onMoveStatus: (project: Project, status: ProjectStatus) => void;
}) {
  const [draggedProject, setDraggedProject] = React.useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<ProjectStatus | null>(null);
  const [showAwaitingTray, setShowAwaitingTray] = React.useState(true);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((proj) => {
      if (proj.isPlaceholder) return false;
      if (!q) return true;
      return (
        proj.title.toLowerCase().includes(q) ||
        String(proj.number) === q.replace(/^#/, "") ||
        proj.technologies.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projects, search]);

  const awaitingProjects = React.useMemo(
    () => filtered.filter((p) => p.status === "awaiting"),
    [filtered],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg3"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Filter pipeline cards"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by #number, title, or stack..."
            className="h-8 w-full rounded-ctl border border-edge bg-inset pl-8 pr-2 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
          />
        </div>

        <Button
          size="s"
          variant="secondary"
          onClick={() => setShowAwaitingTray((prev) => !prev)}
          icon={
            showAwaitingTray ? (
              <ChevronUp size={14} strokeWidth={1.5} />
            ) : (
              <ChevronDown size={14} strokeWidth={1.5} />
            )
          }
        >
          Awaiting Queue ({awaitingProjects.length})
        </Button>
      </div>

      <div
        role="region"
        aria-label="7-stage engineering pipeline"
        className="flex gap-3.5 overflow-x-auto pb-3"
      >
        {KANBAN_COLUMNS.map((col) => {
          const cards = filtered.filter((p) => p.status === col.status);
          const isDropTarget = dragOverColumn === col.status;

          return (
            <section
              key={col.status}
              aria-label={`${col.label} column (${cards.length} projects)`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                if (draggedProject) {
                  const target = draggedProject;
                  setDraggedProject(null);
                  onMoveStatus(target, col.status);
                }
              }}
              className={cx(
                "flex min-h-[380px] w-72 shrink-0 flex-col rounded-panel border bg-surface transition-colors",
                isDropTarget ? "border-sodium bg-sodium/5" : "border-line",
              )}
            >
              <header className="border-b border-line px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-fg">{col.label}</h2>
                  <span className="tnum rounded-cell bg-inset px-1.5 py-0.5 font-mono text-2xs text-fg2">
                    {cards.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-fg3">{col.description}</p>
              </header>

              <div className="flex-1 space-y-2 p-2.5">
                {cards.length === 0 ? (
                  <p className="rounded-ctl border border-dashed border-edge p-4 text-center text-xs text-fg3">
                    Drop a project card or reassign via selector.
                  </p>
                ) : (
                  cards.map((proj) => (
                    <article
                      key={proj.id}
                      draggable
                      onDragStart={() => setDraggedProject(proj)}
                      onDragEnd={() => {
                        setDraggedProject(null);
                        setDragOverColumn(null);
                      }}
                      className={cx(
                        "space-y-2 rounded-ctl border border-line bg-inset p-2.5 transition-colors hover:border-edge",
                        updatingId === proj.id && "opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <GripVertical
                            size={13}
                            className="cursor-grab text-fg3"
                            aria-hidden
                          />
                          <span className="tnum font-mono text-2xs font-semibold text-fg2">
                            #{String(proj.number).padStart(3, "0")}
                          </span>
                          <span className="rounded-cell border border-line bg-surface px-1.5 py-px text-[10px] capitalize text-fg3">
                            {proj.difficulty}
                          </span>
                        </div>
                        <Link
                          href={`/projects/${proj.slug}`}
                          aria-label={`Open workspace for ${proj.title}`}
                          className="text-fg3 hover:text-sodium-text"
                        >
                          <ArrowUpRight size={13} strokeWidth={1.5} />
                        </Link>
                      </div>

                      <h3 className="text-xs font-semibold leading-snug text-fg">
                        <Link href={`/projects/${proj.slug}`} className="hover:underline">
                          {proj.title}
                        </Link>
                      </h3>

                      <div className="space-y-1.5">
                        <SegBar
                          value={proj.completionPercentage ?? 0}
                          total={100}
                          label={`${proj.title} progress`}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="tnum font-mono text-[11px] text-fg3">
                            {proj.completionPercentage ?? 0}%
                          </span>
                          <select
                            aria-label={`Move ${proj.title} to stage`}
                            value={proj.status}
                            disabled={updatingId === proj.id}
                            onChange={(e) =>
                              onMoveStatus(proj, e.target.value as ProjectStatus)
                            }
                            className="h-6 rounded-ctl border border-edge bg-surface px-1.5 text-[11px] text-fg focus-visible:border-sodium focus-visible:outline-none"
                          >
                            {PROJECT_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {getStatusLabel(st)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {showAwaitingTray && (
        <section
          aria-label="Awaiting intake projects"
          className="rounded-panel border border-line bg-surface p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Intake Queue — Awaiting Setup ({awaitingProjects.length})
              </h2>
              <p className="text-xs text-fg3">
                Move any defined project into Backlog to initiate active roadmap tracking.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {awaitingProjects.slice(0, 12).map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between gap-2 rounded-ctl border border-line bg-inset px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${proj.slug}`}
                    className="block truncate font-medium text-fg hover:text-sodium-text"
                  >
                    #{String(proj.number).padStart(3, "0")} {proj.title}
                  </Link>
                  <span className="font-mono text-[10px] capitalize text-fg3">
                    {proj.difficulty}
                  </span>
                </div>
                <Button
                  size="s"
                  variant="secondary"
                  disabled={updatingId === proj.id}
                  onClick={() => onMoveStatus(proj, "backlog")}
                >
                  + Backlog
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
