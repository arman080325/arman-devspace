"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Panel, Empty, cx } from "@/components/redesign/ui";
import { StatusGlyph } from "@/components/redesign/glyphs";
import type { Project, ProjectActivityItem, ProjectProgress } from "@/types/project";

export function ActivityTab({
  project,
  progress,
}: {
  project: Project;
  progress: ProjectProgress | null;
}) {
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activities = useMemo(() => progress?.activities ?? [], [progress?.activities]);

  const filtered = useMemo(() => {
    if (filterType === "all") return activities;
    return activities.filter((a) => {
      const actType = (a.type ?? a.action ?? "").toLowerCase();
      return actType.includes(filterType.toLowerCase());
    });
  }, [activities, filterType]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, ProjectActivityItem[]> = {};
    for (const a of filtered) {
      const ts = a.timestamp ?? a.createdAt;
      const dateKey = new Date(ts).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    }
    return Object.entries(groups);
  }, [filtered]);

  return (
    <Panel
      titleId="activity-tab-title"
      title="Project Activity Logbook"
      actions={
        <div className="flex items-center gap-1">
          {["all", "status", "milestone", "task", "deployment", "github"].map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filterType === type}
              onClick={() => setFilterType(type)}
              className={cx(
                "h-6 rounded-ctl px-2 text-2xs font-medium capitalize transition-colors",
                filterType === type
                  ? "bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--border-default)]"
                  : "text-fg3 hover:text-fg hover:bg-elevated/40",
              )}
            >
              {type}
            </button>
          ))}
        </div>
      }
      footer={
        <div className="flex items-center justify-between text-2xs text-fg3">
          <span>
            Persisted telemetry log for #{String(project.number).padStart(3, "0")}
          </span>
          <span className="font-mono">{filtered.length} events</span>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <Empty title="No activity events recorded yet.">
          Updates, milestones, deployment logs, and tasks will record event history here.
        </Empty>
      ) : (
        <div className="divide-y divide-line/60">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <div className="sticky top-20 z-10 border-b border-line bg-surface/95 backdrop-blur-sm px-4 py-1.5 text-2xs font-semibold text-fg3 uppercase tracking-wider">
                {day}
              </div>
              <ul className="divide-y divide-line/40">
                {items.map((ev) => {
                  const isExpanded = expandedId === ev.id;
                  return (
                    <li
                      key={ev.id}
                      className="p-3 sm:px-5 hover:bg-elevated/40 transition-colors text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="mt-0.5 shrink-0">
                            <StatusGlyph status="success" size={13} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-fg">
                              {ev.description ?? ev.summary}
                            </p>
                            <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-fg3">
                              <span className="capitalize">{ev.type ?? ev.action}</span>
                              <span>·</span>
                              <span>
                                {new Date(
                                  ev.timestamp ?? ev.createdAt,
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                            className="inline-flex h-6 items-center gap-1 rounded-ctl px-1.5 text-[10px] font-mono text-fg3 hover:bg-elevated hover:text-fg"
                          >
                            <span>Meta</span>
                            <ChevronDown
                              size={12}
                              className={cx(
                                "transition-transform",
                                isExpanded && "-rotate-180",
                              )}
                            />
                          </button>
                        )}
                      </div>

                      {isExpanded && ev.metadata && (
                        <pre className="mt-2.5 overflow-x-auto rounded-ctl border border-line bg-inset p-2.5 font-mono text-[11px] text-fg2">
                          {JSON.stringify(ev.metadata, null, 2)}
                        </pre>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
