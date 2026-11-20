"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Panel, Button, Empty, Segmented, cx } from "@/components/redesign/ui";
import { WORKFLOW_PHASES } from "@/config/workflow";
import type {
  Project,
  ProjectProgress,
  ProjectRoadmapItem,
  RoadmapStatus,
} from "@/types/project";

export function RoadmapTab({
  project,
  progress,
  onUpdatePhaseStatus,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
}: {
  project: Project;
  progress: ProjectProgress | null;
  onUpdatePhaseStatus: (roadmapId: string, status: RoadmapStatus) => Promise<void>;
  onCreateTask: (title: string, phase: string) => Promise<void>;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}) {
  const [zoom, setZoom] = useState<"month" | "quarter">("month");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState("Phase 1: Architecture Review");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Workflow phases from progress or default
  const roadmapItems = useMemo<ProjectRoadmapItem[]>(() => {
    if (progress?.roadmap && progress.roadmap.length > 0) {
      return progress.roadmap;
    }
    return WORKFLOW_PHASES.map((wp) => ({
      id: `default-phase-${wp.phase}`,
      projectId: project.id,
      phase: wp.phase,
      title: wp.title,
      description: wp.description,
      status: "pending" as RoadmapStatus,
      order: wp.phase,
    }));
  }, [progress?.roadmap, project.id]);

  const tasks = progress?.tasks ?? [];
  const completedTasks = tasks.filter((t) => t.completed).length;

  // Timeline geometry
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pxPerDay = zoom === "month" ? 10 : 5;
  const startDay = -20;
  const endDay = 100;
  const totalWidth = (endDay - startDay) * pxPerDay;
  const getX = (day: number) => (day - startDay) * pxPerDay;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    try {
      await onCreateTask(newTaskTitle.trim(), newTaskPhase);
      setNewTaskTitle("");
    } catch {
      // handled in parent
    } finally {
      setIsAddingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Timeline Section */}
      <Panel
        titleId="timeline-title"
        title="Engineering Workflow Timeline"
        actions={
          <Segmented
            label="Timeline Zoom"
            size="s"
            value={zoom}
            onChange={setZoom}
            options={[
              { id: "month", label: "Month" },
              { id: "quarter", label: "Quarter" },
            ]}
          />
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-fg3">
            <span>
              Phases 1 through 6 map the standard production verification and
              modernization loop.
            </span>
            <span className="font-mono">Scroll timeline horizontally</span>
          </div>
        }
      >
        <div
          ref={scrollerRef}
          className="scrollbar-none overflow-x-auto p-4 sm:p-5"
          tabIndex={0}
          role="region"
          aria-label="Workflow timeline visualization"
        >
          <div className="relative h-48 select-none" style={{ width: totalWidth }}>
            {/* Timeline center line */}
            <div className="absolute left-0 right-0 top-24 h-px bg-edge" />

            {/* Today marker */}
            <div
              className="absolute bottom-0 top-0 w-0.5 bg-sodium"
              style={{ left: getX(0) }}
            >
              <span className="font-mono absolute -left-6 -top-1 rounded-cell bg-sodium px-1.5 py-0.5 text-[10px] font-bold text-on-sodium">
                TODAY
              </span>
            </div>

            {/* Workflow phase nodes */}
            {roadmapItems.map((item, idx) => {
              const dayOffset = (idx + 1) * 15;
              const isDone = item.status === "completed";
              const isInProgress = item.status === "in-progress";
              const isUpper = idx % 2 === 0;

              return (
                <div
                  key={item.id}
                  className="absolute"
                  style={{ left: getX(dayOffset), top: 96 }}
                >
                  {/* Stem line */}
                  <span
                    aria-hidden
                    className="absolute w-px bg-line"
                    style={{
                      left: 0,
                      top: isUpper ? -36 : 8,
                      height: 36,
                    }}
                  />

                  {/* Marker symbol */}
                  <span
                    className={cx(
                      "absolute -translate-x-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold",
                      isDone
                        ? "border-ship bg-ship text-bg"
                        : isInProgress
                          ? "border-sodium bg-sodium text-on-sodium"
                          : "border-edge bg-surface text-fg3",
                    )}
                  >
                    {idx + 1}
                  </span>

                  {/* Node Card */}
                  <div
                    className={cx(
                      "absolute w-44 rounded-ctl border border-line bg-surface p-2 text-2xs shadow-sm",
                      isUpper ? "bottom-9 -translate-x-1/4" : "top-9 -translate-x-1/4",
                    )}
                  >
                    <p className="font-semibold text-fg truncate">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-fg3">{item.description}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span
                        className={cx(
                          "rounded px-1 py-0.2 text-[10px] font-medium capitalize",
                          isDone
                            ? "bg-ship/15 text-ship"
                            : isInProgress
                              ? "bg-sodium/15 text-sodium-text"
                              : "text-fg3",
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Two Column Layout: Workflow Phases & Task Checklist */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workflow Phases List */}
        <Panel
          titleId="phases-list-title"
          title="Workflow Lifecycle Phases"
          actions={
            <span className="font-mono text-xs text-fg3">
              {roadmapItems.filter((i) => i.status === "completed").length} /{" "}
              {roadmapItems.length} completed
            </span>
          }
        >
          <div className="divide-y divide-line/60">
            {roadmapItems.map((phase) => (
              <div key={phase.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs text-sodium-text">
                        Phase {phase.phase}
                      </span>
                      <h4 className="font-semibold text-sm text-fg truncate">
                        {phase.title}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-fg2 leading-relaxed">
                      {phase.description}
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={phase.status}
                    onChange={(e) =>
                      onUpdatePhaseStatus(phase.id, e.target.value as RoadmapStatus)
                    }
                    className="h-7 rounded-ctl border border-edge bg-inset px-2 text-2xs text-fg focus-visible:border-sodium focus-visible:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Task Checklist Panel */}
        <Panel
          titleId="tasks-title"
          title={
            <div className="flex items-center gap-2">
              <span>Modernization Checklist</span>
              <span className="font-mono text-xs text-fg3">
                ({completedTasks} / {tasks.length})
              </span>
            </div>
          }
        >
          <div className="p-4 sm:p-5 space-y-4">
            {/* Add Task Form */}
            <form onSubmit={handleCreateTask} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new modernization task..."
                  className="h-8 flex-1 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
                />
                <Button
                  type="submit"
                  size="s"
                  variant="primary"
                  loading={isAddingTask}
                  icon={<Plus size={13} strokeWidth={1.5} />}
                >
                  Add
                </Button>
              </div>

              <select
                value={newTaskPhase}
                onChange={(e) => setNewTaskPhase(e.target.value)}
                className="h-7 w-full rounded-ctl border border-edge bg-inset px-2 text-2xs text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              >
                {roadmapItems.map((r) => (
                  <option key={r.id} value={r.title}>
                    Phase {r.phase}: {r.title}
                  </option>
                ))}
              </select>
            </form>

            {/* Task list */}
            {tasks.length === 0 ? (
              <Empty title="No checklist tasks yet.">
                Add atomic implementation tasks to track your modernization progress.
              </Empty>
            ) : (
              <ul className="divide-y divide-line/60 pt-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 py-2 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id, !task.completed)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                    >
                      {task.completed ? (
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-ship" />
                      ) : (
                        <Circle size={14} className="mt-0.5 shrink-0 text-fg3" />
                      )}
                      <div className="min-w-0">
                        <span
                          className={cx(
                            "truncate block",
                            task.completed ? "line-through text-fg3" : "text-fg",
                          )}
                        >
                          {task.title}
                        </span>
                        <span className="font-mono text-[10px] text-fg3">
                          {task.phase}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete task ${task.title}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-ctl text-fg3 hover:bg-elevated hover:text-break"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
