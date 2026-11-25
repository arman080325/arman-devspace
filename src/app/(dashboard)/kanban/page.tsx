import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GlobalRoadmapsClient } from "@/components/roadmaps";
import { getSessionUser } from "@/lib/auth";
import { getGlobalRoadmapData } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Roadmaps | Arman's Devspace",
  description:
    "Cross-project milestone timeline, overdue due-date tracking, and 7-stage engineering pipeline across 100 repositories.",
  robots: { index: false, follow: false },
};

function RoadmapsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-5">
      <div className="h-14 w-64 rounded-panel bg-elevated/50 animate-pulse" />
      <div className="h-[460px] rounded-panel border border-line bg-surface animate-pulse" />
    </div>
  );
}

async function RoadmapsContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/kanban");
  }

  const data = await getGlobalRoadmapData(user.id);

  return (
    <GlobalRoadmapsClient
      initialProjects={data.projects}
      initialMilestones={data.milestones}
      initialTasks={data.tasks}
      initialPersistedRoadmaps={data.persistedRoadmaps}
    />
  );
}

export default function KanbanPage() {
  return (
    <Suspense fallback={<RoadmapsSkeleton />}>
      <RoadmapsContent />
    </Suspense>
  );
}
