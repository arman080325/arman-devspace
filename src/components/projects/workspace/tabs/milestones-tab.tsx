"use client";

import { useState } from "react";
import {
  Plus,
  CheckCircle2,
  Circle,
  TriangleAlert,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { Panel, Button, Empty, cx } from "@/components/redesign/ui";
import type { Project, ProjectMilestone, ProjectProgress } from "@/types/project";

function isPastDue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function MilestonesTab({
  progress,
  onCreateMilestone,
  onToggleMilestone,
}: {
  project?: Project;
  progress: ProjectProgress | null;
  onCreateMilestone: (title: string, dueDate: string | null) => Promise<void>;
  onToggleMilestone: (milestoneId: string, completed: boolean) => Promise<void>;
}) {
  const milestones = progress?.milestones ?? [];
  const openMilestones = milestones.filter((m) => !m.completed);
  const doneMilestones = milestones.filter((m) => m.completed);

  const [showDone, setShowDone] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateMilestone(newTitle.trim(), newDueDate.trim() || null);
      setNewTitle("");
      setNewDueDate("");
    } catch {
      // handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMilestoneRow = (m: ProjectMilestone) => {
    const overdue = !m.completed && isPastDue(m.dueDate);
    const dueDateFormatted = m.dueDate
      ? new Date(m.dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "No due date";

    return (
      <li
        key={m.id}
        className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 hover:bg-elevated/40 transition-colors"
      >
        <button
          type="button"
          onClick={() => onToggleMilestone(m.id, !m.completed)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          {m.completed ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ship" />
          ) : (
            <Circle size={16} className="mt-0.5 shrink-0 text-fg3" />
          )}

          <div className="min-w-0 flex-1">
            <p
              className={cx(
                "text-xs sm:text-sm font-semibold truncate",
                m.completed ? "line-through text-fg3" : "text-fg",
              )}
            >
              {m.title}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-fg3">
              {overdue ? (
                <span className="inline-flex items-center gap-1 font-medium text-warn">
                  <TriangleAlert size={11} strokeWidth={1.5} />
                  <span>Overdue ({dueDateFormatted})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} strokeWidth={1.5} />
                  <span>Due {dueDateFormatted}</span>
                </span>
              )}

              {m.completedAt && (
                <span className="text-ship font-mono">
                  Completed {new Date(m.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </button>

        <span
          className={cx(
            "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
            m.completed
              ? "bg-ship/15 text-ship"
              : overdue
                ? "bg-warn/15 text-warn"
                : "bg-inset text-fg3",
          )}
        >
          {m.completed ? "DONE" : overdue ? "OVERDUE" : "OPEN"}
        </span>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {/* Creation and Overview Bar */}
      <Panel titleId="milestone-form-title" title="Create Milestone">
        <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="m-title"
                className="block text-2xs font-medium text-fg3 mb-1"
              >
                Milestone Title
              </label>
              <input
                id="m-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Production Database Migration Complete"
                className="h-8 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>

            <div>
              <label htmlFor="m-due" className="block text-2xs font-medium text-fg3 mb-1">
                Target Due Date
              </label>
              <input
                id="m-due"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="h-8 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="s"
              loading={isSubmitting}
              icon={<Plus size={13} strokeWidth={1.5} />}
            >
              Add Milestone
            </Button>
          </div>
        </form>
      </Panel>

      {/* Milestones Delivery Table */}
      <Panel
        titleId="milestones-table-title"
        title={
          <div className="flex items-center gap-2">
            <span>Milestones</span>
            <span className="font-mono text-xs text-fg3">
              {doneMilestones.length} of {milestones.length} completed
            </span>
          </div>
        }
        footer={
          <div className="flex items-center justify-between text-2xs text-fg3">
            <span>Click any milestone circle to toggle completion state</span>
            <span className="font-mono">{openMilestones.length} active</span>
          </div>
        }
      >
        {milestones.length === 0 ? (
          <Empty title="No milestones recorded yet.">
            Add a milestone above to schedule technical deliverables and target due dates.
          </Empty>
        ) : (
          <div>
            {/* Open Milestones */}
            <ul className="divide-y divide-line/60">
              {openMilestones.map(renderMilestoneRow)}
            </ul>

            {/* Done Milestones (Collapsible) */}
            {doneMilestones.length > 0 && (
              <div className="border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowDone(!showDone)}
                  aria-expanded={showDone}
                  className="flex h-9 w-full items-center justify-between px-4 sm:px-5 text-2xs font-medium text-fg3 hover:bg-elevated/40"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronDown
                      size={13}
                      className={cx(
                        "transition-transform duration-150",
                        !showDone && "-rotate-90",
                      )}
                    />
                    <span>Completed Milestones</span>
                  </span>
                  <span className="font-mono">{doneMilestones.length}</span>
                </button>

                {showDone && (
                  <ul className="divide-y divide-line/60 border-t border-line/60 bg-surface/50">
                    {doneMilestones.map(renderMilestoneRow)}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
