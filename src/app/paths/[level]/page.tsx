import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Compass, ShieldAlert } from "lucide-react";

import { ProjectExplorer } from "@/components/projects/project-explorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LEARNING_PATHS } from "@/config/workflow";
import { getSessionUser } from "@/lib/auth";
import { getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
import { getAllProjects } from "@/services/devspace-store";
import type { Difficulty } from "@/types/project";

function isDifficultyLevel(value: string): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export function generateStaticParams() {
  return [{ level: "beginner" }, { level: "intermediate" }, { level: "advanced" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level } = await params;
  if (!isDifficultyLevel(level)) {
    return { title: "Path Not Found" };
  }
  const spec = LEARNING_PATHS[level];
  return {
    title: `${spec.title} (${spec.rangeLabel})`,
    description: spec.summary,
  };
}

async function PathDetailContent({ level }: { level: Difficulty }) {
  const spec = LEARNING_PATHS[level];
  const user = await getSessionUser();
  const allProjects = await getAllProjects(user?.id);
  const pathProjects = allProjects.filter((p) => p.difficulty === level);

  const completed = pathProjects.filter((p) => p.status === "completed").length;
  const active = pathProjects.filter(
    (p) => p.status !== "awaiting" && p.status !== "backlog" && p.status !== "completed",
  ).length;
  const pct =
    pathProjects.length > 0 ? Math.round((completed / pathProjects.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-border/80 bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expected Learning Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {spec.outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs leading-relaxed text-muted-foreground">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-amber-400">
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                <span>Codebase Complexity & Audit Note</span>
              </p>
              <p>{spec.complexityNote}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between border-border/80 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Track Telemetry & Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {completed} / {pathProjects.length} completed · {active} active
                </span>
                <span className="font-mono font-semibold">{pct}%</span>
              </div>
              <Progress value={pct} aria-label={`${spec.title} completion`} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Recommended Technical Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {spec.recommendedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectExplorer
        initialProjects={pathProjects}
        lockDifficulty={level}
        showDifficultyFilter={false}
      />
    </div>
  );
}

export default async function LearningPathLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (!isDifficultyLevel(level)) {
    notFound();
  }

  const spec = LEARNING_PATHS[level];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-4 border-b border-border/60 pb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-xs"
          render={<Link href="/paths" />}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Back to Learning Paths</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant="outline"
            className={`capitalize ${getDifficultyBgColor(level)} ${getDifficultyColor(level)}`}
          >
            {level}
          </Badge>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Compass className="size-3.5 text-violet-400" aria-hidden="true" />
            {spec.rangeLabel}
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {spec.title}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{spec.summary}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[460px] w-full rounded-xl" />}>
        <PathDetailContent level={level} />
      </Suspense>
    </div>
  );
}
