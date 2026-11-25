import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActivityCenterClient } from "@/components/activity/activity-center";
import { getSessionUser } from "@/lib/auth";
import { getActivityFeed } from "@/services/activity";
import { getAllProjects } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Activity Center | Arman's Devspace",
  description:
    "Unified event intelligence, CI/CD signals, deployment logs, and workspace notifications across 100 repositories.",
  robots: { index: false, follow: false },
};

function ActivitySkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-5">
      <div className="h-14 w-64 rounded-panel bg-elevated/50 animate-pulse" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[520px] rounded-panel border border-line bg-surface animate-pulse" />
        <div className="hidden h-[360px] rounded-panel border border-line bg-surface animate-pulse xl:block" />
      </div>
    </div>
  );
}

async function ActivityCenterContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/activity");
  }

  const [feed, projects] = await Promise.all([
    getActivityFeed(user.id, { page: 1, limit: 50 }),
    getAllProjects(user.id),
  ]);

  return (
    <ActivityCenterClient
      initialFeed={feed}
      projects={projects.map((p) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        slug: p.slug,
      }))}
    />
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<ActivitySkeleton />}>
      <ActivityCenterContent />
    </Suspense>
  );
}
