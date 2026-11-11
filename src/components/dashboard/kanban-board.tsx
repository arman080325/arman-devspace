"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronUp, GripVertical, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { KANBAN_COLUMNS } from "@/config/workflow";
import {
  cn,
  getDifficultyBgColor,
  getDifficultyColor,
  getStatusLabel,
} from "@/lib/utils";
import { PROJECT_STATUSES } from "@/lib/validations";
import type { Project, ProjectStatus } from "@/types/project";

interface KanbanBoardProps {
  initialProjects: Project[];
}

export function KanbanBoard({ initialProjects }: KanbanBoardProps) {
  const [statusOverrides, setStatusOverrides] = React.useState<
    Record<string, { status: ProjectStatus; completion: number }>
  >({});
  const [search, setSearch] = React.useState("");
  const [draggedProject, setDraggedProject] = React.useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<ProjectStatus | null>(null);
  const [announcement, setAnnouncement] = React.useState<string>("");
  const [showAwaitingTray, setShowAwaitingTray] = React.useState(true);
  const [updatingSlug, setUpdatingSlug] = React.useState<string | null>(null);

  const projects = React.useMemo(
    () =>
      initialProjects.map((proj) => {
        const override = statusOverrides[proj.id];
        if (!override) return proj;
        return {
          ...proj,
          status: override.status,
          completionPercentage: override.completion,
        };
      }),
    [initialProjects, statusOverrides],
  );

  const filteredProjects = React.useMemo(() => {
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
    () => filteredProjects.filter((p) => p.status === "awaiting"),
    [filteredProjects],
  );

  const moveProjectToStatus = async (project: Project, nextStatus: ProjectStatus) => {
    if (project.status === nextStatus) return;
    const prevOverride = statusOverrides[project.id];
    setUpdatingSlug(project.slug);
    setStatusOverrides((prev) => ({
      ...prev,
      [project.id]: {
        status: nextStatus,
        completion:
          nextStatus === "completed" ? 100 : (project.completionPercentage ?? 0),
      },
    }));

    try {
      const response = await fetch(`/api/projects/${project.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        setStatusOverrides((prev) => {
          const copy = { ...prev };
          if (prevOverride) {
            copy[project.id] = prevOverride;
          } else {
            delete copy[project.id];
          }
          return copy;
        });
        setAnnouncement(`Failed to update ${project.title}.`);
        return;
      }

      const json = (await response.json()) as {
        progress?: { status: ProjectStatus; completionPercentage: number };
      };
      if (json.progress) {
        setStatusOverrides((prev) => ({
          ...prev,
          [project.id]: {
            status: json.progress!.status,
            completion: json.progress!.completionPercentage,
          },
        }));
      }
      setAnnouncement(
        `Moved #${String(project.number).padStart(3, "0")} ${project.title} to ${getStatusLabel(nextStatus)}.`,
      );
    } catch {
      setAnnouncement(`Network error updating ${project.title}.`);
    } finally {
      setUpdatingSlug(null);
    }
  };

  const handleDropOnColumn = (targetStatus: ProjectStatus) => {
    setDragOverColumn(null);
    if (!draggedProject) return;
    const proj = draggedProject;
    setDraggedProject(null);
    void moveProjectToStatus(proj, targetStatus);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Filter Kanban cards"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter Kanban by #number, title, or stack..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {announcement ||
              "Drag cards or use stage selector on any card to move status."}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAwaitingTray((prev) => !prev)}
            className="gap-1.5 text-xs"
          >
            {showAwaitingTray ? (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )}
            <span>Awaiting Queue ({awaitingProjects.length})</span>
          </Button>
        </div>
      </div>

      {/* 7-Column Pipeline Board */}
      <div
        role="region"
        aria-label="7-stage Kanban development pipeline"
        className="flex gap-4 overflow-x-auto pb-4"
      >
        {KANBAN_COLUMNS.map((col) => {
          const cards = filteredProjects.filter((p) => p.status === col.status);
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
                handleDropOnColumn(col.status);
              }}
              className={cn(
                "flex min-h-[420px] w-72 shrink-0 flex-col rounded-xl border bg-card/70 transition-colors",
                isDropTarget ? "border-violet-500 bg-violet-500/10" : "border-border/80",
              )}
            >
              <header className="border-b border-border/70 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                  <Badge variant="outline" className="font-mono text-xs">
                    {cards.length}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {col.description}
                </p>
              </header>

              <div className="flex-1 space-y-2.5 p-2.5">
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                    Drop a card here or assign from another stage.
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
                      className={cn(
                        "space-y-2.5 rounded-lg border border-border/80 bg-background/85 p-3 shadow-xs transition-colors hover:border-violet-500/40",
                        updatingSlug === proj.slug && "opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <GripVertical
                            className="size-3.5 shrink-0 cursor-grab text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                            #{String(proj.number).padStart(3, "0")}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-1.5 py-0 text-[10px] capitalize",
                              getDifficultyBgColor(proj.difficulty),
                              getDifficultyColor(proj.difficulty),
                            )}
                          >
                            {proj.difficulty}
                          </Badge>
                        </div>

                        <Link
                          href={`/projects/${proj.slug}`}
                          aria-label={`Open workspace for ${proj.title}`}
                          className="text-muted-foreground hover:text-violet-400"
                        >
                          <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </div>

                      <h3 className="text-sm leading-snug font-medium text-foreground">
                        <Link href={`/projects/${proj.slug}`} className="hover:underline">
                          {proj.title}
                        </Link>
                      </h3>

                      <div className="flex flex-wrap gap-1">
                        {proj.technologies.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <Progress
                          value={proj.completionPercentage ?? 0}
                          aria-label={`${proj.title} progress`}
                        />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-mono">
                            {proj.completionPercentage ?? 0}%
                          </span>
                          <label className="sr-only" htmlFor={`move-${proj.id}`}>
                            Move {proj.title} to stage
                          </label>
                          <select
                            id={`move-${proj.id}`}
                            aria-label={`Move ${proj.title} to stage`}
                            value={proj.status}
                            disabled={updatingSlug === proj.slug}
                            onChange={(e) =>
                              void moveProjectToStatus(
                                proj,
                                e.target.value as ProjectStatus,
                              )
                            }
                            className="h-7 rounded border border-input bg-card px-1.5 text-[11px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* Collapsible Awaiting Queue for staging cards into Backlog/Cloned */}
      {showAwaitingTray ? (
        <section
          aria-label="Awaiting intake projects"
          className="space-y-3 rounded-xl border border-border/80 bg-card/80 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Intake Queue — Awaiting Development ({awaitingProjects.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Queue any defined repository into Backlog or Cloned to start active
                tracking.
              </p>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {awaitingProjects.slice(0, 12).map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${proj.slug}`}
                    className="block truncate font-medium text-foreground hover:text-violet-400"
                  >
                    #{String(proj.number).padStart(3, "0")} {proj.title}
                  </Link>
                  <span className="font-mono text-[10px] text-muted-foreground capitalize">
                    {proj.difficulty}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={updatingSlug === proj.slug}
                  onClick={() => void moveProjectToStatus(proj, "backlog")}
                  className="h-7 shrink-0 px-2 text-[11px]"
                >
                  + Backlog
                </Button>
              </div>
            ))}
          </div>
          {awaitingProjects.length > 12 ? (
            <p className="text-xs text-muted-foreground">
              Showing first 12 queued projects. Use the filter input above to locate
              specific projects by number, title, or stack.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
