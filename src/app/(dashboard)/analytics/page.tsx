import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnalyticsDashboard } from "@/components/analytics";
import { computeEngineeringAnalytics } from "@/lib/analytics-utils";
import { getSessionUser } from "@/lib/auth";
import { getGlobalAnalyticsData } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Analytics | Arman's Devspace",
  description:
    "Engineering analytics reconciled against persisted repository metadata, verification audits, milestones, deployments, and activity logs.",
  robots: { index: false, follow: false },
};

function AnalyticsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
      <div className="h-14 w-64 rounded-panel bg-elevated/50 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-panel bg-surface border border-line animate-pulse"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-panel border border-line bg-surface animate-pulse" />
        <div className="h-80 rounded-panel border border-line bg-surface animate-pulse" />
      </div>
    </div>
  );
}

async function AnalyticsContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/analytics");
  }

  const data = await getGlobalAnalyticsData(user.id);
  const snapshot = computeEngineeringAnalytics(data);

  return <AnalyticsDashboard snapshot={snapshot} />;
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
