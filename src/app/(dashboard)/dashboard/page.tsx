import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  FolderGit2,
  Layers,
  LayoutDashboard,
  Milestone,
  StickyNote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { getSessionUser } from "@/lib/auth";
import {
  formatDate,
  formatNumber,
  getDifficultyBgColor,
  getDifficultyColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { getUserDashboardFeed, getWorkspaceStats } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Developer Dashboard",
  description:
    "Persisted engineering telemetry, active repositories, weekly cadence, streak, recent notes, and upcoming milestones.",
  robots: { index: false, follow: false },
};

async function DashboardContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const [stats, feed] = await Promise.all([
    getWorkspaceStats(user.id),
    getUserDashboardFeed(user.id),
  ]);

  const maxWeekly = Math.max(1, ...stats.weeklyActivity.map((item) => item.count));
  const pendingCount = stats.awaitingProjects + stats.statusCounts.backlog;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            <span>Personal Engineering Workspace</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {siteConfig.supportingStatement} All dashboard metrics are derived strictly
            from persisted workspace records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/kanban" />}>
            Open Kanban Board
          </Button>
          <Button render={<Link href="/projects" />}>Explore 100 Projects</Button>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Overall Completion</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {stats.overallCompletion}%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={stats.overallCompletion} aria-label="Overall completion" />
            <p className="text-xs text-muted-foreground">
              {stats.completedProjects} of {stats.totalProjects} projects done
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Active Projects</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {formatNumber(stats.activeProjects)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.statusCounts["in-development"]} in development ·{" "}
              {stats.statusCounts.testing} testing
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Completed</CardDescription>
            <CardTitle className="flex items-center gap-2 font-mono text-2xl">
              <CheckCircle2 className="size-5 text-emerald-400" aria-hidden="true" />
              <span>{formatNumber(stats.completedProjects)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.tasksCompleted} / {stats.tasksTotal} tasks checked off
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pending Queue</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {formatNumber(pendingCount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.awaitingProjects} awaiting · {stats.statusCounts.backlog} backlog
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Development Streak</CardDescription>
            <CardTitle className="flex items-center gap-2 font-mono text-2xl">
              <Flame className="size-5 text-amber-400" aria-hidden="true" />
              <span>{stats.streakDays}d</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.notesCount} journal notes · {stats.bookmarkedCount} bookmarked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Weekly Activity + Technology Distribution */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-border/80 bg-card lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-violet-400" aria-hidden="true" />
              <span>Weekly Development Activity</span>
            </CardTitle>
            <CardDescription>
              Logged engineering actions over the trailing 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-44 grid-cols-7 items-end gap-3 pt-4">
              {stats.weeklyActivity.map((day) => {
                const heightPct =
                  day.count > 0
                    ? Math.max(12, Math.round((day.count / maxWeekly) * 100))
                    : 4;
                return (
                  <div
                    key={day.date}
                    className="flex h-full flex-col items-center justify-end gap-2"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {day.count}
                    </span>
                    <div className="flex h-28 w-full items-end rounded-md bg-muted/40 p-1">
                      <div
                        className="w-full rounded-sm bg-violet-500/80 transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${day.date}: ${day.count} actions`}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="size-4 text-sky-400" aria-hidden="true" />
                <span>Technology Distribution</span>
              </CardTitle>
              <CardDescription>Top canonical stack exposure</CardDescription>
            </div>
            <Link
              href="/technologies"
              className="text-xs font-medium text-violet-400 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.technologyDistribution.slice(0, 6).map((tech) => (
              <div key={tech.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{tech.name}</span>
                  <span className="font-mono text-muted-foreground">
                    {tech.count} repos ({tech.completedCount} done)
                  </span>
                </div>
                <Progress
                  value={Math.round((tech.count / stats.definedProjects) * 100)}
                  aria-label={`${tech.name} prevalence`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active & Recently Accessed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderGit2 className="size-4 text-emerald-400" aria-hidden="true" />
                <span>Active Projects</span>
              </CardTitle>
              <CardDescription>
                Repositories currently cloned, planned, built, or under test.
              </CardDescription>
            </div>
            <Link
              href="/kanban"
              className="text-xs font-medium text-violet-400 hover:underline"
            >
              Pipeline view
            </Link>
          </CardHeader>
          <CardContent>
            {feed.activeProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                <p>
                  No active projects yet. Open any repository from Project Explorer to
                  begin.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  render={<Link href="/projects" />}
                >
                  Browse 100 Projects
                </Button>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {feed.activeProjects.map((proj) => (
                  <li
                    key={proj.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{String(proj.number).padStart(3, "0")}
                        </span>
                        <Link
                          href={`/projects/${proj.slug}`}
                          className="truncate text-sm font-medium text-foreground hover:text-violet-400"
                        >
                          {proj.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getStatusColor(proj.status)}`}
                        >
                          {getStatusLabel(proj.status)}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {proj.completionPercentage ?? 0}% complete
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open workspace for ${proj.title}`}
                      render={<Link href={`/projects/${proj.slug}`} />}
                    >
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-sky-400" aria-hidden="true" />
              <span>Recently Accessed</span>
            </CardTitle>
            <CardDescription>
              Last modified project workspaces ordered by recency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feed.recentlyAccessed.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No workspace edits logged yet. Status changes, notes, tasks, and
                verification syncs will appear here immediately.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {feed.recentlyAccessed.map((proj) => (
                  <li
                    key={proj.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/projects/${proj.slug}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-violet-400"
                      >
                        #{String(proj.number).padStart(3, "0")} {proj.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${getDifficultyBgColor(proj.difficulty)} ${getDifficultyColor(proj.difficulty)}`}
                        >
                          {proj.difficulty}
                        </Badge>
                        <span>
                          Updated{" "}
                          {proj.lastAccessedAt
                            ? formatDate(proj.lastAccessedAt)
                            : "recently"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${proj.title}`}
                      render={<Link href={`/projects/${proj.slug}`} />}
                    >
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Notes, Milestones, Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="size-4 text-violet-400" aria-hidden="true" />
              <span>Recent Notes</span>
            </CardTitle>
            <Link
              href="/journal"
              className="text-xs font-medium text-violet-400 hover:underline"
            >
              Journal
            </Link>
          </CardHeader>
          <CardContent>
            {feed.recentNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No engineering notes created yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {feed.recentNotes.map((note) => (
                  <li
                    key={note.id}
                    className="space-y-1 rounded-lg border border-border/60 bg-background/60 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {note.type}
                      </Badge>
                      <Link
                        href={`/projects/${note.projectSlug}`}
                        className="font-mono text-[11px] text-violet-400 hover:underline"
                      >
                        #{String(note.projectNumber).padStart(3, "0")}
                      </Link>
                    </div>
                    <p className="font-medium text-foreground">{note.title}</p>
                    <p className="line-clamp-2 text-muted-foreground">{note.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Milestone className="size-4 text-amber-400" aria-hidden="true" />
              <span>Upcoming Milestones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feed.upcomingMilestones.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No pending milestones. Add project milestones inside any project
                workspace.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {feed.upcomingMilestones.map((m) => (
                  <li
                    key={m.id}
                    className="space-y-1 rounded-lg border border-border/60 bg-background/60 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/projects/${m.projectSlug}`}
                        className="font-mono text-[11px] text-violet-400 hover:underline"
                      >
                        #{String(m.projectNumber).padStart(3, "0")} {m.projectTitle}
                      </Link>
                      {m.dueDate ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {m.dueDate}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-medium text-foreground">{m.title}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-emerald-400" aria-hidden="true" />
              <span>Activity Stream</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feed.recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Workspace events will stream here as you audit and build projects.
              </p>
            ) : (
              <ul className="space-y-2">
                {feed.recentActivities.slice(0, 6).map((act) => (
                  <li
                    key={act.id}
                    className="rounded-lg border border-border/60 bg-background/50 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/projects/${act.projectSlug}`}
                        className="font-mono text-[11px] text-violet-400 hover:underline"
                      >
                        #{String(act.projectNumber).padStart(3, "0")} {act.projectTitle}
                      </Link>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatDate(act.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{act.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
