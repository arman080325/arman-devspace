import { Suspense } from "react";
import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { CategoriesOverview } from "@/components/paths/categories-overview";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { getAllProjects, getWorkspaceStats } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Categories & Learning Paths",
  description:
    "Explore canonical engineering categories and structured Beginner (1–30), Intermediate (31–50), and Advanced (51–100) tracks.",
};

async function PathsPageContent() {
  const user = await getSessionUser();
  const [projects, stats] = await Promise.all([
    getAllProjects(user?.id),
    getWorkspaceStats(user?.id),
  ]);

  return <CategoriesOverview projects={projects} stats={stats} />;
}

export default function LearningPathsPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="space-y-1.5 border-b border-line pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-sodium-text">
          <Compass className="size-3.5" aria-hidden="true" />
          <span>Curated Disciplines & Skill Tiers</span>
        </div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          Categories & Learning Paths
        </h1>
        <p className="max-w-3xl text-xs text-fg2 sm:text-sm">
          Browse projects across six core software engineering disciplines or follow
          structured difficulty tracks (#001–#100) designed around authentic repository
          complexity.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-panel" />
            <Skeleton className="h-44 w-full rounded-panel" />
            <Skeleton className="h-44 w-full rounded-panel" />
          </div>
        }
      >
        <PathsPageContent />
      </Suspense>
    </div>
  );
}
