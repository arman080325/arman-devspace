import { Suspense } from "react";
import type { Metadata } from "next";
import { FolderGit2 } from "lucide-react";
import { ExplorerPage } from "@/components/explorer/explorer-page";
import type { ExplorerViewMode } from "@/components/explorer/explorer-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { getAllProjects } from "@/services/devspace-store";
import type { Difficulty } from "@/types/project";
import type { Phase } from "@/components/redesign/types";

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
  phase?: string;
  health?: string;
  view?: string;
}

async function ExplorerContent({
  searchParams,
}: {
  searchParams: Promise<ExplorerSearchParams>;
}) {
  const [user, resolvedParams] = await Promise.all([getSessionUser(), searchParams]);
  const projects = await getAllProjects(user?.id);

  const hasExplicitView =
    resolvedParams.view === "plates" ||
    resolvedParams.view === "list" ||
    resolvedParams.view === "field";

  const initialView: ExplorerViewMode = hasExplicitView
    ? (resolvedParams.view as ExplorerViewMode)
    : "field";

  return (
    <ExplorerPage
      initialProjects={projects}
      initialView={initialView}
      useSavedPreference={!hasExplicitView}
      initialFilters={{
        difficulty: resolvedParams.difficulty
          ? [resolvedParams.difficulty as Difficulty]
          : [],
        category: resolvedParams.category ? [resolvedParams.category] : [],
        tech:
          (resolvedParams.tech ?? resolvedParams.technology)
            ? [resolvedParams.tech ?? resolvedParams.technology!]
            : [],
        phase: resolvedParams.phase ? [resolvedParams.phase as Phase] : [],
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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="space-y-1.5 border-b border-line pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-sodium-text">
          <FolderGit2 className="size-3.5" aria-hidden="true" />
          <span>Canonical Collection (#001 – #100)</span>
        </div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          Project Explorer
        </h1>
        <p className="max-w-2xl text-xs text-fg2 sm:text-sm">
          All 100 project slots ordered strictly from #001 to #100. Inspect
          specifications, filter by lifecycle phase or technology, and switch between
          field, plates, and list views.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-ctl" />
            <Skeleton className="h-96 w-full rounded-panel" />
          </div>
        }
      >
        <ExplorerContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
