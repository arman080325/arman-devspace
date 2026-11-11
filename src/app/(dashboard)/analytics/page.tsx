import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CheckCircle2, Flame, FolderCheck, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getVerificationMeta } from "@/config/workflow";
import { getSessionUser } from "@/lib/auth";
import {
  getDifficultyBgColor,
  getDifficultyColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { PROJECT_STATUSES, VERIFICATION_STATUSES } from "@/lib/validations";
import { getAllProjects, getWorkspaceStats } from "@/services/devspace-store";
import type { Difficulty } from "@/types/project";

export const metadata: Metadata = {
  title: "Learning Analytics",
  description:
    "Deep engineering metrics across difficulty tracks, verification audits, stack distribution, and 7-day cadence.",
  robots: { index: false, follow: false },
};

async function AnalyticsContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/analytics");
  }

  const [stats, projects] = await Promise.all([
    getWorkspaceStats(user.id),
    getAllProjects(user.id),
  ]);

  const verificationCounts = VERIFICATION_STATUSES.map((status) => ({
    status,
    count: projects.filter((p) => p.verificationStatus === status).length,
    ...getVerificationMeta(status),
  }));

  const maxWeekly = Math.max(1, ...stats.weeklyActivity.map((d) => d.count));
  const difficulties: Difficulty[] = ["beginner", "intermediate", "advanced"];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Canonical Readiness</CardDescription>
            <CardTitle className="flex items-center gap-2 font-mono text-2xl">
              <FolderCheck className="size-5 text-violet-400" aria-hidden="true" />
              <span>
                {stats.definedProjects} / {stats.totalProjects}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.placeholderProjects} reserved slots awaiting repository links
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Checklist Velocity</CardDescription>
            <CardTitle className="flex items-center gap-2 font-mono text-2xl">
              <CheckCircle2 className="size-5 text-emerald-400" aria-hidden="true" />
              <span>
                {stats.tasksTotal > 0
                  ? `${Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)}%`
                  : "0%"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.tasksCompleted} of {stats.tasksTotal} engineering tasks resolved
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Engineering Streak</CardDescription>
            <CardTitle className="flex items-center gap-2 font-mono text-2xl">
              <Flame className="size-5 text-amber-400" aria-hidden="true" />
              <span>{stats.streakDays} days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Computed solely from persisted activity timestamps
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Verified Repositories</CardDescription>
            <CardTitle className="flex items-center gap-2 font-mono text-2xl">
              <ShieldCheck className="size-5 text-sky-400" aria-hidden="true" />
              <span>
                {verificationCounts.find((v) => v.status === "verified")?.count ?? 0}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {projects.filter((p) => Boolean(p.repositoryMetadata)).length} synced via
            GitHub API
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Tier Breakdown + Pipeline Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Track Completion Breakdown</CardTitle>
            <CardDescription>
              Distribution across Beginner (1–30), Intermediate (31–50), and Advanced
              (51–100).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {difficulties.map((level) => {
              const row = stats.difficultyBreakdown[level];
              const pct =
                row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
              return (
                <div key={level} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`capitalize ${getDifficultyBgColor(level)} ${getDifficultyColor(level)}`}
                      >
                        {level}
                      </Badge>
                      <span className="text-muted-foreground">
                        {row.completed} done · {row.active} active · {row.total} total
                      </span>
                    </div>
                    <span className="font-mono font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} aria-label={`${level} completion percentage`} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Workflow Pipeline Distribution</CardTitle>
            <CardDescription>
              Live count of all 100 positions across each status stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PROJECT_STATUSES.map((st) => (
              <Link
                key={st}
                href={`/projects?status=${encodeURIComponent(st)}`}
                className="rounded-lg border border-border/70 bg-background/60 p-3 transition-colors hover:border-violet-500/40"
              >
                <Badge
                  variant="outline"
                  className={`mb-1.5 text-[10px] ${getStatusColor(st)}`}
                >
                  {getStatusLabel(st)}
                </Badge>
                <p className="font-mono text-xl font-semibold text-foreground">
                  {stats.statusCounts[st]}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Repository Audit Status & 7-Day Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-border/80 bg-card lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Repository Audit Status</CardTitle>
            <CardDescription>
              Verification classification and link discrepancy breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {verificationCounts.map((item) => (
              <Link
                key={item.status}
                href={`/projects?verification=${encodeURIComponent(item.status)}`}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs transition-colors hover:border-violet-500/40"
              >
                <Badge variant="outline" className={item.classes}>
                  {item.label}
                </Badge>
                <span className="font-mono font-semibold text-foreground">
                  {item.count} projects
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">7-Day Engineering Cadence</CardTitle>
            <CardDescription>
              Persisted mutations, notes, task completions, and repository syncs per day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-44 grid-cols-7 items-end gap-3 pt-4">
              {stats.weeklyActivity.map((day) => {
                const heightPct =
                  day.count > 0
                    ? Math.max(14, Math.round((day.count / maxWeekly) * 100))
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
                        className="w-full rounded-sm bg-sky-400/80 transition-all"
                        style={{ height: `${heightPct}%` }}
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
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
          <BarChart3 className="size-4" aria-hidden="true" />
          <span>Engineering Telemetry</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Development Analytics
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Quantitative insights computed directly from persisted project states,
          repository verification findings, technology coverage, and engineering activity
          logs.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-xl" />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
