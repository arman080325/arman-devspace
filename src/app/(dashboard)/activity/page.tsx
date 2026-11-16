import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActivityCenterClient } from "@/components/activity/activity-center";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { getActivityFeed } from "@/services/activity";
import { getAllProjects } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Activity Center | Arman's Devspace",
  description:
    "Unified event intelligence, CI/CD signals, deployment logs, and workspace notifications across 100 repositories.",
  robots: { index: false, follow: false },
};

async function ActivityCenterContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/activity");
  }

  const [feed, projects] = await Promise.all([
    getActivityFeed(user.id, { page: 1, limit: 20 }),
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
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2 border-b border-border/60 pb-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 max-w-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <ActivityCenterContent />
    </Suspense>
  );
}
