import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Compass, ShieldAlert } from "lucide-react";
import { ExplorerPage } from "@/components/explorer/explorer-page";
import { Skeleton } from "@/components/ui/skeleton";
import { LEARNING_PATHS } from "@/config/workflow";
import { getSessionUser } from "@/lib/auth";
import { cn, getDifficultyBgColor, getDifficultyColor } from "@/lib/utils";
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
    title: `${spec.title} (${spec.rangeLabel}) | Arman's Devspace`,
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
      {/* Telemetry and Overview Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Learning Outcomes and Complexity Note */}
        <div className="rounded-panel border border-line bg-surface p-5 lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold tracking-tight text-fg">
            Expected Learning Outcomes
          </h2>
          <ul className="space-y-2 text-xs text-fg2">
            {spec.outcomes.map((outcome) => (
              <li key={outcome} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 size-3.5 shrink-0 text-ship"
                  aria-hidden="true"
                />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>

          <div className="rounded border border-warn/30 bg-warn/10 p-3.5 text-xs text-fg2">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-warn">
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              <span>Codebase Complexity & Audit Note</span>
            </p>
            <p>{spec.complexityNote}</p>
          </div>
        </div>

        {/* Track Telemetry & Skills */}
        <div className="flex flex-col justify-between rounded-panel border border-line bg-surface p-5 space-y-5">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-tight text-fg">
              Track Telemetry & Skills
            </h2>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-2xs">
                <span className="text-fg3">
                  {completed} / {pathProjects.length} completed · {active} active
                </span>
                <span className="font-mono font-semibold text-fg">{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${spec.title} completion`}
                className="h-2 w-full overflow-hidden rounded-full bg-inset"
              >
                <div
                  className="h-full rounded-full bg-sodium transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-line">
              <p className="text-2xs font-semibold uppercase tracking-wider text-fg3">
                Recommended Technical Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {spec.recommendedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded border border-line bg-inset px-2 py-0.5 font-mono text-[11px] text-fg3"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Project Explorer for this Track */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg3">
          Track Projects ({pathProjects.length})
        </h2>
        <ExplorerPage
          initialProjects={pathProjects}
          lockDifficulty={level}
          initialView="plates"
        />
      </div>
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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      {/* Track Header */}
      <div className="space-y-3 border-b border-line pb-5">
        <Link
          href="/paths"
          className="-ml-2 inline-flex h-7 items-center gap-1.5 rounded-ctl px-2.5 text-xs text-fg2 transition-colors hover:bg-elevated hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Back to Categories & Paths</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs font-semibold capitalize",
              getDifficultyBgColor(level),
              getDifficultyColor(level),
            )}
          >
            {level}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg3">
            <Compass className="size-3.5 text-sodium-text" aria-hidden="true" />
            {spec.rangeLabel}
          </span>
        </div>

        <h1 className="font-sans text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {spec.title}
        </h1>
        <p className="max-w-3xl text-xs text-fg2 sm:text-sm">{spec.summary}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[460px] w-full rounded-panel" />}>
        <PathDetailContent level={level} />
      </Suspense>
    </div>
  );
}
