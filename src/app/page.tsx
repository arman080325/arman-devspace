import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  FolderGit2,
  GitBranch,
  Layers,
  LayoutDashboard,
  Sparkles,
  Terminal,
} from "lucide-react";

import { ProjectCard } from "@/components/projects/project-card";
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
import { LEARNING_PATHS, WORKFLOW_PHASES } from "@/config/workflow";
import { getSessionUser } from "@/lib/auth";
import { formatNumber, getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
import { getAllProjects, getWorkspaceStats } from "@/services/devspace-store";
import type { Difficulty } from "@/types/project";

const FEATURED_NUMBERS = [1, 5, 31, 40, 60, 96];

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

async function HomepageTelemetryAndCatalogue() {
  const user = await getSessionUser();
  const [stats, allProjects] = await Promise.all([
    getWorkspaceStats(user?.id),
    getAllProjects(user?.id),
  ]);

  const featuredProjects = FEATURED_NUMBERS.map((num) =>
    allProjects.find((p) => p.number === num),
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const topTechnologies = stats.technologyDistribution.slice(0, 14);
  const difficultyList: Difficulty[] = ["beginner", "intermediate", "advanced"];

  const statItems = [
    {
      label: "Total Projects",
      value: formatNumber(stats.totalProjects),
      hint: `${stats.definedProjects} repos · ${stats.placeholderProjects} reserved`,
    },
    {
      label: "Completed",
      value: formatNumber(stats.completedProjects),
      hint: `${stats.overallCompletion}% overall milestone`,
    },
    {
      label: "In Development",
      value: formatNumber(stats.inDevelopmentProjects),
      hint: `${stats.activeProjects} active across pipeline`,
    },
    {
      label: "Awaiting Development",
      value: formatNumber(stats.awaitingProjects),
      hint: "Ready for audit & clone",
    },
    {
      label: "Technologies Explored",
      value: formatNumber(stats.technologiesExplored),
      hint: "Across canonical stack",
    },
  ];

  return (
    <>
      {/* Dynamic Statistics Strip */}
      <section
        aria-label="Live workspace statistics"
        className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border/80 bg-card/85 p-4 transition-colors hover:border-border"
            >
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Platform Introduction */}
      <section className="border-t border-border/60 bg-secondary/25 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="space-y-4 lg:col-span-5">
            <Badge
              variant="outline"
              className="border-violet-500/30 bg-violet-500/10 text-violet-400"
            >
              Platform Architecture
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built for sustained systems mastery, not disposable demos.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {siteConfig.supportingStatement} Each of the 100 project slots operates in
              its own isolated workspace—completely decoupled from Arman&apos;s Devspace
              itself so you can modernize React, Node, GraphQL, microservices, and
              multi-tenant SaaS architectures systematically.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <Card className="border-border/80 bg-card/90">
              <CardHeader className="pb-2">
                <FolderGit2 className="mb-1 size-5 text-violet-400" aria-hidden="true" />
                <CardTitle className="text-base">Repository Verification</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Inspect original GitHub URLs via the REST API, catch subtree or
                broken-link discrepancies, and maintain canonical URL fidelity without
                fabricating metadata.
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90">
              <CardHeader className="pb-2">
                <GitBranch className="mb-1 size-5 text-sky-400" aria-hidden="true" />
                <CardTitle className="text-base">Independent Workspaces</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Record your local clone path, compare original vs. modernized stacks,
                track checklists, and store engineering notes and deployment URLs per
                repository.
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90">
              <CardHeader className="pb-2">
                <Code2 className="mb-1 size-5 text-emerald-400" aria-hidden="true" />
                <CardTitle className="text-base">Framework Modernization</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Move legacy MERN, CRA, or untyped JavaScript codebases to strict
                TypeScript, server validation, automated Vitest/Playwright tests, and
                clean Postgres schemas.
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90">
              <CardHeader className="pb-2">
                <BookOpen className="mb-1 size-5 text-amber-400" aria-hidden="true" />
                <CardTitle className="text-base">Persisted Engineering Journal</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Log architecture decisions, root-cause bug investigations, reusable
                patterns, and testing outcomes across a unified searchable developer
                journal.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Project Collection Overview */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              The Canonical 100-Project Collection
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Strict numerical ordering from #001 to #100. {stats.definedProjects} defined
              repositories and {stats.placeholderProjects} explicitly reserved slots
              (#51–59, #66–74, #85–93) awaiting source assignment.
            </p>
          </div>
          <Button
            variant="outline"
            render={<Link href="/projects" />}
            className="gap-2 self-start"
          >
            <span>Browse all 100 slots</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/80 bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="font-mono text-xs">
                Slots #001–#030
              </CardDescription>
              <CardTitle className="text-lg">Full-Stack Foundations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                30 specified repositories focused on CRUD workflows, MERN modernization,
                and UI craft.
              </p>
              <p className="font-mono text-xs text-emerald-400">
                30 defined repositories
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="font-mono text-xs">
                Slots #031–#050
              </CardDescription>
              <CardTitle className="text-lg">Real-Time & Multi-Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                20 repositories spanning WebSockets, WebRTC, payments, headless CMS, and
                RBAC portals.
              </p>
              <p className="font-mono text-xs text-sky-400">20 defined repositories</p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="font-mono text-xs">
                Slots #051–#100
              </CardDescription>
              <CardTitle className="text-lg">Enterprise & Distributed Systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                23 defined systems (collaborative canvas, microservice SaaS, multi-tenant
                kits) plus 27 reserved slots preserving exact numbering.
              </p>
              <p className="font-mono text-xs text-violet-400">
                23 defined · 27 placeholders
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. Difficulty Levels (Learning Paths) */}
      <section className="border-t border-border/60 bg-secondary/20 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Structured Learning Paths
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Progress systematically through three engineering tracks while auditing
                actual codebase complexity against repository structure.
              </p>
            </div>
            <Button
              variant="outline"
              render={<Link href="/paths" />}
              className="gap-2 self-start"
            >
              <Compass className="size-4" aria-hidden="true" />
              <span>Compare all tracks</span>
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {difficultyList.map((level) => {
              const spec = LEARNING_PATHS[level];
              const breakdown = stats.difficultyBreakdown[level];
              const pct =
                breakdown.total > 0
                  ? Math.round((breakdown.completed / breakdown.total) * 100)
                  : 0;
              return (
                <Card
                  key={level}
                  className="flex flex-col justify-between border-border/80 bg-card"
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`capitalize ${getDifficultyBgColor(level)} ${getDifficultyColor(level)}`}
                      >
                        {level}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {spec.rangeLabel}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{spec.title}</CardTitle>
                    <CardDescription>{spec.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {breakdown.completed} / {breakdown.total} completed (
                          {breakdown.active} active)
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {pct}%
                        </span>
                      </div>
                      <Progress value={pct} aria-label={`${spec.title} completion`} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {spec.recommendedSkills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="rounded border border-border/70 bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full justify-between"
                      render={<Link href={`/paths/${level}`} />}
                    >
                      <span>View {level} track</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Featured Projects */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Featured Codebases
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Representative repositories spanning Beginner, Intermediate, and Advanced
              engineering tracks.
            </p>
          </div>
          <Button
            variant="outline"
            render={<Link href="/projects" />}
            className="gap-2 self-start"
          >
            <span>Open Project Explorer</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} showBookmarkButton={false} />
          ))}
        </div>
      </section>

      {/* 7. Technology Ecosystem */}
      <section className="border-t border-border/60 bg-secondary/20 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Technology Ecosystem
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Filter across {stats.technologiesExplored} persisted stack tags mapped
                from the canonical project repositories.
              </p>
            </div>
            <Button
              variant="outline"
              render={<Link href="/technologies" />}
              className="gap-2 self-start"
            >
              <Layers className="size-4" aria-hidden="true" />
              <span>Full Technology Tracker</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {topTechnologies.map((tech) => (
              <Link
                key={tech.name}
                href={`/projects?tech=${encodeURIComponent(tech.name)}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3.5 py-2 text-sm transition-colors hover:border-violet-500/40 hover:bg-muted/50"
              >
                <span className="font-medium text-foreground">{tech.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {tech.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Development Workflow */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            7-Phase Modernization Workflow
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every repository follows an auditable engineering lifecycle tracked directly
            inside its dedicated project workspace.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_PHASES.map((phase) => (
            <li
              key={phase.phase}
              className="rounded-xl border border-border/80 bg-card/90 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex size-6 items-center justify-center rounded border border-violet-500/30 bg-violet-500/10 font-mono text-xs font-semibold text-violet-400">
                  0{phase.phase}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground uppercase">
                  {phase.shortTitle}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{phase.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {phase.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* 9. Learning Progress */}
      <section className="border-t border-border/60 bg-secondary/25 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>Live Workspace Telemetry</span>
                </div>
                <CardTitle className="text-xl sm:text-2xl">
                  Current Engineering Progress
                </CardTitle>
                <CardDescription>
                  Derived strictly from persisted workspace records—tasks, journal
                  entries, activity logs, and completed repositories.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button render={<Link href="/dashboard" />} className="gap-2">
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                  <span>Open Dashboard</span>
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="/kanban" />}
                  className="gap-2"
                >
                  <span>Kanban Pipeline</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Overall Mastery</p>
                <p className="font-mono text-2xl font-semibold">
                  {stats.overallCompletion}%
                </p>
                <Progress
                  value={stats.overallCompletion}
                  className="mt-2"
                  aria-label="Overall mastery progress"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Checklists Verified</p>
                <p className="flex items-center gap-2 font-mono text-2xl font-semibold">
                  <CheckCircle2 className="size-5 text-emerald-400" aria-hidden="true" />
                  <span>
                    {stats.tasksCompleted} / {stats.tasksTotal}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Completed engineering tasks
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Journal Notes</p>
                <p className="font-mono text-2xl font-semibold">{stats.notesCount}</p>
                <p className="text-xs text-muted-foreground">
                  Persisted architecture & bug logs
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Active Streak</p>
                <p className="font-mono text-2xl font-semibold">
                  {stats.streakDays} days
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.bookmarkedCount} bookmarked projects
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* 2. Hero */}
      <section className="relative overflow-hidden py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Terminal className="size-3.5 text-violet-400" aria-hidden="true" />
              <span>{siteConfig.name}</span>
              <span aria-hidden="true" className="text-border">
                •
              </span>
              <span className="font-mono text-foreground">{siteConfig.tagline}</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Your next project starts here.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {siteConfig.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                size="lg"
                className="h-11 gap-2 px-5"
                render={<Link href="/projects" />}
              >
                <span>Explore Projects</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 gap-2 px-5"
                render={<Link href="/dashboard" />}
              >
                <LayoutDashboard className="size-4" aria-hidden="true" />
                <span>Open My Workspace</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <StatsSkeleton />
          </div>
        }
      >
        <HomepageTelemetryAndCatalogue />
      </Suspense>
    </div>
  );
}
