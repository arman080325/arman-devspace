import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsWorkspace, type SettingsSectionId } from "@/components/settings";
import { getSessionUser } from "@/lib/auth";
import { getOperationalDiagnostics } from "@/services/diagnostics";
import { getAccountDetails, getGlobalAnalyticsData } from "@/services/devspace-store";
import type { AccountDetails } from "@/types/project";

export const metadata: Metadata = {
  title: "Settings | Arman's Devspace",
  description:
    "Manage your developer profile, Shift appearance preferences, workspace defaults, account security, and provider integrations.",
  robots: { index: false, follow: false },
};

const VALID_SECTIONS = new Set<SettingsSectionId>([
  "profile",
  "appearance",
  "workspace",
  "security",
  "integrations",
]);

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-5">
      <div className="h-14 w-56 rounded-panel bg-elevated/50 animate-pulse" />
      <div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <div className="h-52 rounded-panel border border-line bg-surface animate-pulse" />
        <div className="h-80 max-w-[780px] rounded-panel border border-line bg-surface animate-pulse" />
      </div>
    </div>
  );
}

async function SettingsContent({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/settings");
  }

  const [resolved, accountDetails, diagnostics, analyticsData] = await Promise.all([
    searchParams,
    getAccountDetails(user.id),
    getOperationalDiagnostics(),
    getGlobalAnalyticsData(user.id),
  ]);

  const fallbackAccount: AccountDetails = accountDetails ?? {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: null,
    authProvider: "credentials",
    hasPassword: true,
    hasSupabase: false,
  };

  const definedProjects = analyticsData.projects.filter((p) => !p.isPlaceholder);
  const syncedProjects = definedProjects.filter((p) => p.repositoryMetadata !== null);
  const verifiedProjects = definedProjects.filter(
    (p) => p.verificationStatus === "verified",
  );
  const latestSyncedAt =
    syncedProjects
      .map((p) => p.repositoryMetadata?.verifiedAt)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => (a < b ? 1 : -1))[0] ?? null;

  const unsyncedSampleIds = definedProjects
    .filter((p) => p.repositoryMetadata === null)
    .slice(0, 10)
    .map((p) => p.id);

  const initialSection: SettingsSectionId = VALID_SECTIONS.has(
    resolved.section as SettingsSectionId,
  )
    ? (resolved.section as SettingsSectionId)
    : "profile";

  return (
    <SettingsWorkspace
      initialSection={initialSection}
      initialAccount={fallbackAccount}
      initialDiagnostics={diagnostics}
      integrationCoverage={{
        totalDefinedProjects: definedProjects.length,
        syncedCount: syncedProjects.length,
        verifiedCount: verifiedProjects.length,
        latestSyncedAt,
        persistedDeploymentsCount: analyticsData.deployments.length,
        unsyncedSampleIds,
      }}
    />
  );
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}
