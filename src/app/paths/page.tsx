import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LEARNING_PATHS } from "@/config/workflow";
import { getSessionUser } from "@/lib/auth";
import { getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
import { getWorkspaceStats } from "@/services/devspace-store";
import type { Difficulty } from "@/types/project";

export const metadata: Metadata = {
  title: "Learning Paths",
  description:
    "Explore Beginner (1–30), Intermediate (31–50), and Advanced (51–100) software engineering tracks with learning outcomes and codebase complexity reviews.",
};

async function PathsContent() {
  const user = await getSessionUser();
  const stats = await getWorkspaceStats(user?.id);
  const levels: Difficulty[] = ["beginner", "intermediate", "advanced"];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {levels.map((level) => {
        const spec = LEARNING_PATHS[level];
        const metric = stats.difficultyBreakdown[level];
        const pct =
          metric.total > 0 ? Math.round((metric.completed / metric.total) * 100) : 0;

        return (
          <Card
            key={level}
            className="flex flex-col justify-between border-border/80 bg-card"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
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
              <CardTitle className="text-xl">{spec.title}</CardTitle>
              <CardDescription>{spec.summary}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {metric.completed} / {metric.total} completed · {metric.active} active
                  </span>
                  <span className="font-mono font-medium">{pct}%</span>
                </div>
                <Progress value={pct} aria-label={`${spec.title} completion`} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Learning Outcomes
                </h2>
                <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  {spec.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Recommended Technical Skills
                </h2>
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

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 flex items-center gap-1.5 font-medium text-amber-400">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  <span>Repository Complexity Review</span>
                </p>
                <p>{spec.complexityNote}</p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4">
              <Button
                className="w-full justify-between"
                render={<Link href={`/paths/${level}`} />}
              >
                <span>Explore {spec.rangeLabel}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default function LearningPathsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
          <Compass className="size-4" aria-hidden="true" />
          <span>Structured Progression</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Engineering Learning Paths
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Three curated engineering tracks dividing positions #001–#100 into clear skill
          tiers. Each track reviews real repository complexity and repository anomalies
          rather than trusting surface labels blindly.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-[520px] rounded-xl" />
            ))}
          </div>
        }
      >
        <PathsContent />
      </Suspense>
    </div>
  );
}
