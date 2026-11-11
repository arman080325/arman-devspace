import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";

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
import { getSessionUser } from "@/lib/auth";
import { getAllProjects, getWorkspaceStats } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Technology Tracker",
  description:
    "Explore technology frequency, modernization coverage, and completion distribution across Arman's Devspace.",
};

async function TechnologiesContent() {
  const user = await getSessionUser();
  const [stats, projects] = await Promise.all([
    getWorkspaceStats(user?.id),
    getAllProjects(user?.id),
  ]);

  const maxCount = stats.technologyDistribution[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.technologyDistribution.map((item) => {
          const sharePct = Math.round((item.count / maxCount) * 100);
          const matchingProjects = projects
            .filter((p) => p.technologies.includes(item.name))
            .slice(0, 4);

          return (
            <Card key={item.name} className="border-border/80 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.count} {item.count === 1 ? "repo" : "repos"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {item.completedCount} completed ·{" "}
                  {Math.round((item.count / stats.definedProjects) * 100)}% of defined
                  collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={sharePct} aria-label={`${item.name} distribution`} />

                <div className="flex flex-wrap gap-1.5">
                  {matchingProjects.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.slug}`}
                      className="rounded border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-violet-500/40 hover:text-foreground"
                    >
                      #{String(proj.number).padStart(3, "0")}
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/projects?tech=${encodeURIComponent(item.name)}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:underline"
                >
                  <span>Filter {item.count} projects</span>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function TechnologiesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
          <Layers className="size-4" aria-hidden="true" />
          <span>Stack Ecosystem Index</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Technology Tracker
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Technology footprint computed directly from the canonical project definitions
          and persisted completion states.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <Skeleton key={idx} className="h-44 rounded-xl" />
            ))}
          </div>
        }
      >
        <TechnologiesContent />
      </Suspense>
    </div>
  );
}
