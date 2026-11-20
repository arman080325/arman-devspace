import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getAllProjects,
  getUserDashboardFeed,
  getWorkspaceStats,
} from "@/services/devspace-store";
import { getActivityFeed } from "@/services/activity";
import { DashboardOverview } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Engineering Dashboard",
  description:
    "Arman's Devspace Workstation — The Hundred, real-time repository intelligence, deployment status, and engineering telemetry.",
  robots: { index: false, follow: false },
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
      <div className="h-16 w-1/3 rounded-panel bg-elevated/50 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-panel bg-elevated/40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 h-96 rounded-panel bg-elevated/30 animate-pulse" />
        <div className="xl:col-span-5 h-96 rounded-panel bg-elevated/30 animate-pulse" />
      </div>
    </div>
  );
}

async function DashboardContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const [projects, stats, feed, activityResult] = await Promise.all([
    getAllProjects(user.id),
    getWorkspaceStats(user.id),
    getUserDashboardFeed(user.id),
    getActivityFeed(user.id, { limit: 25 }),
  ]);

  return (
    <DashboardOverview
      user={user}
      projects={projects}
      stats={stats}
      activities={activityResult.events}
      milestones={feed.upcomingMilestones}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
