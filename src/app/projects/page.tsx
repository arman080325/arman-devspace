import { Suspense } from "react";
import type { Metadata } from "next";
import { FolderGit2 } from "lucide-react";

import { ProjectExplorer } from "@/components/projects/project-explorer";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { getAllProjects } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Project Explorer",
  description:
    "Browse, filter, verify, and modernize all 100 open-source engineering projects in strict canonical numerical order.",
};

interface ExplorerSearchParams {
  q?: string;
  search?: string;
  difficulty?: string;
  category?: string;
  tech?: string;
  technology?: string;
  status?: string;
  verification?: string;
  view?: string;
}

async function ExplorerContent({
  searchParams,
}: {
  searchParams: Promise<ExplorerSearchParams>;
}) {
  const [user, resolvedParams] = await Promise.all([getSessionUser(), searchParams]);
  const projects = await getAllProjects(user?.id);

  return (
    <ProjectExplorer
      initialProjects={projects}
      initialFilters={{
        search: resolvedParams.q ?? resolvedParams.search ?? "",
        difficulty: resolvedParams.difficulty ?? "all",
        category: resolvedParams.category ?? "all",
        technology: resolvedParams.tech ?? resolvedParams.technology ?? "all",
        status: resolvedParams.status ?? "all",
        verification: resolvedParams.verification ?? "all",
        view: resolvedParams.view === "list" ? "list" : "grid",
      }}
    />
  );
}

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<ExplorerSearchParams>;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
          <FolderGit2 className="size-4" aria-hidden="true" />
          <span>Canonical Collection (#001 – #100)</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Project Explorer
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          All 100 project slots ordered strictly from #001 to #100. Inspect repositories,
          filter by track or technology, switch between grid and tabular views, and launch
          individual modernization workspaces.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-56 rounded-xl" />
              ))}
            </div>
          </div>
        }
      >
        <ExplorerContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
