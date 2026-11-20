"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Panel, Tabs, Empty } from "@/components/redesign/ui";
import { SignalRow, type SignalData } from "@/components/redesign/signature";
import type { SignalKind, SignalStatus } from "@/components/redesign/types";
import type { ActivityEvent } from "@/types/activity";

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "recently";
  }
}

export function SignalStream({
  events = [],
  className,
}: {
  events: ActivityEvent[];
  className?: string;
}) {
  const [tab, setTab] = useState<string>("all");

  const filteredEvents = useMemo(() => {
    if (tab === "all") return events;
    return events.filter((e) => e.category === tab);
  }, [events, tab]);

  const signalRows = useMemo<SignalData[]>(() => {
    return filteredEvents.slice(0, 8).map((e) => {
      let kind: SignalKind = "workspace";
      if (e.category === "deployment") kind = "deploy";
      else if (e.category === "ci") kind = "ci";
      else if (e.category === "repository") kind = "health";

      let status: SignalStatus = "success";
      if (e.severity === "critical") status = "failed";
      else if (e.severity === "warning") status = "failed";
      else if (e.severity === "info") status = "running";

      return {
        id: e.id,
        project: e.projectNumber,
        title: e.title,
        kind,
        status,
        env: e.category === "deployment" ? "Production" : null,
        timeRel: formatRelativeTime(e.createdAt),
        timeAbs: new Date(e.createdAt).toLocaleString(),
        url: e.actionUrl ?? `/projects/${e.projectSlug}`,
      };
    });
  }, [filteredEvents]);

  return (
    <Panel
      className={className}
      titleId="signal-h"
      title={
        <div className="flex items-center gap-2">
          <span>Signal Stream</span>
          <span className="font-mono text-xs font-normal text-fg3">
            {events.length} events
          </span>
        </div>
      }
      actions={
        <Link
          href="/activity"
          className="inline-flex h-7 items-center gap-1 rounded-ctl px-2 text-xs text-fg2 hover:bg-elevated hover:text-fg"
        >
          <span>Activity Center</span>
          <ArrowUpRight size={12} strokeWidth={1.5} />
        </Link>
      }
      footer="Live event telemetry streamed across all 100 managed repositories"
    >
      <div className="border-b border-line px-2 pt-1">
        <Tabs
          label="Signal category filter"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All" },
            { id: "repository", label: "Commits" },
            { id: "ci", label: "CI runs" },
            { id: "deployment", label: "Deployments" },
          ]}
        />
      </div>

      {signalRows.length === 0 ? (
        <Empty title="No recent activity.">
          Workspace and repository telemetry will appear here as changes are recorded.
        </Empty>
      ) : (
        <div role="feed" aria-label="Recent activity signals">
          {signalRows.map((s) => (
            <SignalRow key={s.id} s={s} showProject />
          ))}
        </div>
      )}
    </Panel>
  );
}
