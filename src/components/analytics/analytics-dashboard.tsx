"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  FolderCheck,
  GitBranch,
  Milestone,
  Rocket,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Empty, Panel, SegBar, cx } from "@/components/redesign/ui";
import { PhaseGlyph } from "@/components/redesign/glyphs";
import { PHASE_COLOR_VAR, type CellPhase } from "@/components/redesign/types";
import type { EngineeringAnalyticsSnapshot } from "@/lib/analytics-utils";

export function AnalyticsDashboard({
  snapshot,
}: {
  snapshot: EngineeringAnalyticsSnapshot;
}) {
  const {
    catalogue,
    lifecyclePhases,
    pipelineStatuses,
    categories,
    difficulties,
    verificationBreakdown,
    repositoryHealth,
    ciWorkflows,
    deployments,
    execution,
    activity,
    technologies,
    technologiesExplored,
  } = snapshot;

  const maxWeekly = Math.max(1, ...activity.weeklyVolume.map((d) => d.count));
  const maxTechCount = Math.max(1, ...(technologies[0] ? [technologies[0].count] : [1]));
  const verifiedCount =
    verificationBreakdown.find((v) => v.key === "verified")?.count ?? 0;

  if (catalogue.totalProjects === 0) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-5 border-b border-line pb-5">
          <h1 className="display text-2xl leading-tight text-fg sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-xs text-fg2 sm:text-sm">
            Quantitative telemetry across your repository portfolio.
          </p>
        </header>
        <Panel>
          <Empty title="No project data available for analytics.">
            Seed or initialize project records to compute portfolio distributions and
            lifecycle telemetry.
          </Empty>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="display text-2xl leading-tight text-fg sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-xs text-fg2 sm:text-sm">
            Verified metrics reconciled against persisted workspace records and locally
            synchronized GitHub/deployment snapshots.
          </p>
        </div>

        <span className="font-mono text-2xs text-fg3">
          {catalogue.totalProjects} canonical projects · {repositoryHealth.syncedCount}{" "}
          GitHub snapshots stored
        </span>
      </header>

      {/* Top KPI Strip */}
      <section
        aria-label="Key engineering metrics"
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <KpiCard
          label="Canonical Readiness"
          value={`${catalogue.definedProjects} / ${catalogue.totalProjects}`}
          detail={`${catalogue.placeholderProjects} reserved slots`}
          icon={<FolderCheck size={14} strokeWidth={1.5} className="text-explore" />}
        />

        <KpiCard
          label="GitHub Sync Coverage"
          value={`${repositoryHealth.syncCoveragePct}%`}
          detail={`${repositoryHealth.syncedCount} synced · ${repositoryHealth.unsyncedCount} unsynced`}
          icon={<GitBranch size={14} strokeWidth={1.5} className="text-sodium-text" />}
        />

        <KpiCard
          label="Verified Repositories"
          value={`${verifiedCount}`}
          detail={`of ${catalogue.totalProjects} catalogued entries`}
          icon={<ShieldCheck size={14} strokeWidth={1.5} className="text-ship" />}
        />

        <KpiCard
          label="Milestone Progress"
          value={
            execution.milestoneCompletionRate !== null
              ? `${execution.milestoneCompletionRate}%`
              : "0 tracked"
          }
          detail={
            execution.milestonesTotal > 0
              ? `${execution.milestonesCompleted}/${execution.milestonesTotal} done · ${execution.milestonesOverdue} overdue`
              : "No milestones recorded"
          }
          icon={
            execution.milestonesOverdue > 0 ? (
              <TriangleAlert size={14} strokeWidth={1.5} className="text-warn" />
            ) : (
              <Milestone size={14} strokeWidth={1.5} className="text-ship" />
            )
          }
        />

        <KpiCard
          label="Task Velocity"
          value={
            execution.taskCompletionRate !== null
              ? `${execution.taskCompletionRate}%`
              : "0 tasks"
          }
          detail={
            execution.tasksTotal > 0
              ? `${execution.tasksCompleted} of ${execution.tasksTotal} tasks done`
              : "No checklist tasks added"
          }
          icon={<CheckCircle2 size={14} strokeWidth={1.5} className="text-ship" />}
        />
      </section>

      {/* Row 1: Lifecycle Phase & Track Difficulty Breakdown */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel
          titleId="lifecycle-chart-title"
          title="Projects by Lifecycle Phase"
          actions={
            <span className="tnum font-mono text-2xs text-fg3">
              Total: {lifecyclePhases.reduce((a, b) => a + b.count, 0)}
            </span>
          }
          footer="Source: UserProjectProgress status reconciled with locally synced workflow failures and repository archival flags."
        >
          <figure
            className="space-y-4 p-4 sm:p-5"
            aria-labelledby="lifecycle-chart-title"
          >
            {/* Stacked Phase Distribution Bar */}
            <div
              role="img"
              aria-label={`Lifecycle phase bar across ${catalogue.totalProjects} projects`}
              className="flex h-3.5 w-full overflow-hidden rounded-ctl bg-inset"
            >
              {lifecyclePhases
                .filter((p) => p.count > 0)
                .map((p) => (
                  <div
                    key={p.key}
                    style={{
                      width: `${(p.count / catalogue.totalProjects) * 100}%`,
                      background:
                        PHASE_COLOR_VAR[p.key as CellPhase] ?? "var(--border-default)",
                    }}
                    title={`${p.label}: ${p.count} (${p.percentage}%)`}
                  />
                ))}
            </div>

            <figcaption className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {lifecyclePhases.map((p) => (
                <div
                  key={p.key}
                  className="flex items-center justify-between rounded-ctl border border-line bg-inset/60 px-2.5 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-fg">
                    <PhaseGlyph phase={p.key} size={12} />
                    <span>{p.label}</span>
                  </span>
                  <span className="tnum font-mono text-fg2">
                    {p.count} <span className="text-fg3">({p.percentage}%)</span>
                  </span>
                </div>
              ))}
            </figcaption>
          </figure>
        </Panel>

        <Panel
          titleId="difficulty-chart-title"
          title="Difficulty Tier Distribution"
          actions={
            <span className="tnum font-mono text-2xs text-fg3">
              Total: {difficulties.reduce((a, b) => a + b.total, 0)}
            </span>
          }
          footer="Source: Canonical Project difficulty tiers (#1–30 Beginner, #31–50 Intermediate, #51–100 Advanced)."
        >
          <div className="space-y-4 p-4 sm:p-5">
            {difficulties.map((row) => (
              <div key={row.difficulty} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded-ctl border border-edge bg-inset px-2 py-0.5 font-mono text-[11px] font-medium capitalize text-fg">
                      {row.difficulty}
                    </span>
                    <span className="tnum text-fg2">
                      {row.completed} shipped · {row.active} active · {row.total} total
                    </span>
                  </div>
                  <span className="tnum font-mono font-semibold text-fg">
                    {row.completionRate}% shipped
                  </span>
                </div>
                <SegBar
                  value={row.completed}
                  total={row.total}
                  label={`${row.difficulty} completion: ${row.completed} of ${row.total}`}
                />
              </div>
            ))}

            {/* Workflow Status Grid */}
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg3">
                8-Stage Pipeline Status Counts
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {pipelineStatuses.map((st) => (
                  <Link
                    key={st.key}
                    href={`/projects?status=${encodeURIComponent(st.key)}`}
                    className="rounded-ctl border border-line bg-inset/60 px-2.5 py-2 text-xs transition-colors hover:border-edge"
                  >
                    <span className="block truncate text-[11px] text-fg3">
                      {st.label}
                    </span>
                    <span className="tnum font-mono text-base font-semibold text-fg">
                      {st.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 2: Repository Verification, Locally Synced Health & CI/CD, and Deployments */}
      <div className="mb-6 grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-4"
          titleId="verification-title"
          title="Repository Verification"
          footer="Source: Persisted Project verificationStatus classification."
        >
          <ul className="divide-y divide-line">
            {verificationBreakdown.map((item) => (
              <li key={item.key}>
                <Link
                  href={`/projects?verification=${encodeURIComponent(item.key)}`}
                  className="flex items-center justify-between px-4 py-2.5 text-xs transition-colors hover:bg-elevated/40"
                >
                  <span className="text-fg">{item.label}</span>
                  <span className="tnum font-mono text-fg2">
                    {item.count} <span className="text-fg3">({item.percentage}%)</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="lg:col-span-4"
          titleId="health-ci-title"
          title="GitHub Health & CI Snapshots"
          footer="Source: Locally stored RepositoryMetadata snapshots only (unsynced repos are labeled Unknown, never Failed)."
        >
          <div className="space-y-4 p-4 sm:p-5 text-xs">
            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg3">
                Repository Health ({catalogue.totalProjects})
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <MetricTile label="Healthy" value={repositoryHealth.good} tone="ship" />
                <MetricTile
                  label="Needs Review / Stale"
                  value={repositoryHealth.fair}
                  tone="warn"
                />
                <MetricTile
                  label="Unavailable / Archived"
                  value={repositoryHealth.poor}
                  tone="break"
                />
                <MetricTile
                  label="Unknown / Not Synced"
                  value={repositoryHealth.unknown}
                />
              </dl>
            </div>

            <div className="border-t border-line pt-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg3">
                Latest Stored CI Workflow Run ({catalogue.totalProjects})
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <MetricTile label="Passing" value={ciWorkflows.passing} tone="ship" />
                <MetricTile label="Failing" value={ciWorkflows.failing} tone="break" />
                <MetricTile
                  label="In Progress"
                  value={ciWorkflows.running}
                  tone="build"
                />
                <MetricTile
                  label="Not Synced / None"
                  value={ciWorkflows.unknownOrNotSynced}
                />
              </dl>
            </div>
          </div>
        </Panel>

        <Panel
          className="lg:col-span-4"
          titleId="deployments-analytics-title"
          title={
            <span className="flex items-center gap-2">
              <Rocket size={15} strokeWidth={1.5} className="text-fg3" />
              <span>Deployment Coverage</span>
            </span>
          }
          footer="Source: Persisted DeploymentRecord entries and UserProjectProgress live URLs."
        >
          <div className="space-y-4 p-4 sm:p-5 text-xs">
            <dl className="grid grid-cols-2 gap-2">
              <MetricTile label="Recorded Deploys" value={deployments.totalRecords} />
              <MetricTile
                label="Projects w/ Live URL"
                value={deployments.projectsWithLiveUrl}
                tone="ship"
              />
              <MetricTile label="Active Status" value={deployments.active} tone="ship" />
              <MetricTile label="Failed Status" value={deployments.failed} tone="break" />
            </dl>

            <div className="border-t border-line pt-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg3">
                By Environment
              </p>
              <div className="grid grid-cols-3 gap-2">
                <MetricTile
                  label="Production"
                  value={deployments.byEnvironment.production}
                />
                <MetricTile label="Preview" value={deployments.byEnvironment.preview} />
                <MetricTile label="Staging" value={deployments.byEnvironment.staging} />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3: Categories, 7-Day Persisted Activity, Top Technologies */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-4"
          titleId="categories-analytics-title"
          title="Projects by Category"
          actions={
            <span className="tnum font-mono text-2xs text-fg3">
              Total: {categories.reduce((a, c) => a + c.total, 0)}
            </span>
          }
          footer="Source: Canonical ProjectCategory assignments."
        >
          <ul className="divide-y divide-line">
            {categories.map((cat) => (
              <li key={cat.category}>
                <Link
                  href={`/projects?category=${encodeURIComponent(cat.category)}`}
                  className="flex items-center justify-between px-4 py-2.5 text-xs transition-colors hover:bg-elevated/40"
                >
                  <div className="min-w-0">
                    <span className="block truncate font-medium text-fg">
                      {cat.category}
                    </span>
                    <span className="tnum font-mono text-[11px] text-fg3">
                      {cat.shipped} shipped · {cat.active} active
                    </span>
                  </div>
                  <span className="tnum font-mono font-semibold text-fg">
                    {cat.total}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="lg:col-span-4"
          titleId="activity-volume-title"
          title={
            <span className="flex items-center gap-2">
              <Activity size={15} strokeWidth={1.5} className="text-fg3" />
              <span>7-Day Activity Volume</span>
            </span>
          }
          actions={
            <span className="tnum font-mono text-2xs text-fg3">
              {activity.streakDays}d streak
            </span>
          }
          footer={`Source: ${activity.totalEvents} total locally persisted ProjectActivity rows (${activity.weeklyTotal} in last 7 days).`}
        >
          <figure className="p-4 sm:p-5" aria-labelledby="activity-volume-title">
            <div
              role="img"
              aria-label={`7-day persisted activity bar chart totaling ${activity.weeklyTotal} events`}
              className="grid h-40 grid-cols-7 items-end gap-2 pt-2"
            >
              {activity.weeklyVolume.map((day) => {
                const heightPct =
                  day.count > 0
                    ? Math.max(12, Math.round((day.count / maxWeekly) * 100))
                    : 4;
                return (
                  <div
                    key={day.date}
                    className="flex h-full flex-col items-center justify-end gap-1.5"
                  >
                    <span className="tnum font-mono text-[11px] text-fg2">
                      {day.count}
                    </span>
                    <div className="flex h-24 w-full items-end rounded-ctl border border-line bg-inset p-1">
                      <div
                        className={cx(
                          "w-full rounded-[2px] transition-all",
                          day.count > 0 ? "bg-sodium" : "bg-edge/50",
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-fg3">{day.day}</span>
                  </div>
                );
              })}
            </div>
            <figcaption className="mt-3 text-2xs text-fg3">
              Daily counts reflect local mutations, sync events, notes, and task updates.
            </figcaption>
          </figure>
        </Panel>

        <Panel
          className="lg:col-span-4"
          titleId="tech-analytics-title"
          title={
            <span className="flex items-center gap-2">
              <BarChart3 size={15} strokeWidth={1.5} className="text-fg3" />
              <span>Top Technologies ({technologiesExplored})</span>
            </span>
          }
          footer="Source: Canonical ProjectTechnology tags across 100 projects."
        >
          <div className="space-y-2.5 p-4 sm:p-5 text-xs">
            {technologies.slice(0, 8).map((tech) => (
              <Link
                key={tech.name}
                href={`/projects?tech=${encodeURIComponent(tech.name)}`}
                className="block space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-fg group-hover:text-sodium-text">
                    {tech.name}
                  </span>
                  <span className="tnum font-mono text-2xs text-fg3">
                    {tech.count} projects ({tech.completedCount} shipped)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-inset">
                  <div
                    className="h-full rounded-full bg-explore transition-all"
                    style={{
                      width: `${Math.round((tech.count / maxTechCount) * 100)}%`,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-panel border border-line bg-surface p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 text-2xs text-fg3">
        <span className="truncate font-medium">{label}</span>
        {icon}
      </div>
      <p className="tnum mt-1.5 font-mono text-xl font-bold text-fg sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-fg3">{detail}</p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ship" | "warn" | "break" | "build";
}) {
  const valueColor =
    tone === "ship"
      ? "text-ship"
      : tone === "warn"
        ? "text-warn"
        : tone === "break"
          ? "text-break"
          : tone === "build"
            ? "text-sodium-text"
            : "text-fg";

  return (
    <div className="rounded-ctl border border-line bg-inset/60 px-2.5 py-2">
      <dt className="truncate text-[11px] text-fg3">{label}</dt>
      <dd className={cx("tnum mt-0.5 font-mono text-base font-semibold", valueColor)}>
        {value}
      </dd>
    </div>
  );
}
