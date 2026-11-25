"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldAlert,
  Triangle,
  WifiOff,
  Wrench,
} from "lucide-react";
import { GithubIcon } from "@/components/redesign/glyphs";
import { Button, ErrorBanner, SegBar, cx } from "@/components/redesign/ui";
import { formatDate } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/validations";
import type {
  OperationalDiagnostics,
  ProviderIntegrationState,
} from "@/services/diagnostics";

export interface IntegrationSnapshotCoverage {
  totalDefinedProjects: number;
  syncedCount: number;
  verifiedCount: number;
  latestSyncedAt: string | null;
  persistedDeploymentsCount: number;
  unsyncedSampleIds: string[];
}

interface IntegrationsSectionProps {
  initialDiagnostics: OperationalDiagnostics;
  coverage: IntegrationSnapshotCoverage;
}

const STATUS_META: Record<
  ProviderIntegrationState,
  { label: string; desc: string; badgeCls: string }
> = {
  connected: {
    label: "Connected",
    desc: "Live API or database verification succeeded with active credentials.",
    badgeCls: "border-ship/40 bg-ship/10 text-ship",
  },
  configured: {
    label: "Configured",
    desc: "Server-side environment variables exist; live API probe not yet run.",
    badgeCls: "border-sodium/40 bg-sodium/10 text-sodium-text",
  },
  available: {
    label: "Available",
    desc: "Fallback or public capability is usable without private credentials.",
    badgeCls: "border-explore/40 bg-explore/10 text-explore",
  },
  unavailable: {
    label: "Unavailable",
    desc: "Required provider credentials or configuration are missing server-side.",
    badgeCls: "border-edge bg-inset text-fg3",
  },
  error: {
    label: "Error",
    desc: "Provider rejected credentials, timed out, or failed health verification.",
    badgeCls: "border-break/40 bg-break/10 text-break",
  },
};

function StatusBadge({ state }: { state: ProviderIntegrationState }) {
  const meta = STATUS_META[state];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-cell border px-2 py-0.5 text-2xs font-medium",
        meta.badgeCls,
      )}
    >
      {state === "connected" && <CheckCircle2 size={12} aria-hidden="true" />}
      {state === "configured" && <Wrench size={12} aria-hidden="true" />}
      {state === "error" && <ShieldAlert size={12} aria-hidden="true" />}
      {state === "unavailable" && <WifiOff size={12} aria-hidden="true" />}
      <span>{meta.label}</span>
    </span>
  );
}

interface BatchSyncSummaryResponse {
  summary?: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    rateLimited: boolean;
    rateLimitResetAt: string | null;
  };
  error?: string;
}

export function IntegrationsSection({
  initialDiagnostics,
  coverage,
}: IntegrationsSectionProps) {
  const [diag, setDiag] = React.useState<OperationalDiagnostics>(initialDiagnostics);
  const [healthSnapshot, setHealthSnapshot] = React.useState<{
    status: string;
    storageStatus: string;
    timestamp: string;
  } | null>(null);
  const [loadingTarget, setLoadingTarget] = React.useState<
    "github-verify" | "github-sync" | "vercel" | "health" | null
  >(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [syncReport, setSyncReport] = React.useState<string | null>(null);

  const runDiagnostics = async (
    target: "github-verify" | "vercel" | "health",
    probeVercel = false,
  ) => {
    setLoadingTarget(target);
    setActionError(null);

    try {
      const requests: Array<Promise<Response>> = [
        fetch(`/api/diagnostics${probeVercel ? "?probe=vercel" : ""}`, {
          cache: "no-store",
        }),
      ];
      if (target === "health") {
        requests.push(fetch("/api/health", { cache: "no-store" }));
      }

      const [diagRes, healthRes] = await Promise.all(requests);
      if (!diagRes.ok) {
        const err = (await diagRes.json().catch(() => ({}))) as { error?: string };
        setActionError(err.error ?? "Failed to run live provider diagnostics.");
        return;
      }

      const diagJson = (await diagRes.json()) as {
        diagnostics?: OperationalDiagnostics;
      };
      if (diagJson.diagnostics) {
        setDiag(diagJson.diagnostics);
      }

      if (healthRes) {
        const healthJson = (await healthRes.json().catch(() => ({}))) as {
          status?: string;
          storageStatus?: string;
          timestamp?: string;
        };
        if (healthJson.status && healthJson.timestamp) {
          setHealthSnapshot({
            status: healthJson.status,
            storageStatus: healthJson.storageStatus ?? "unknown",
            timestamp: healthJson.timestamp,
          });
        }
      }
    } catch {
      setActionError("Network timeout or connectivity failure reaching diagnostics API.");
    } finally {
      setLoadingTarget(null);
    }
  };

  const handleBatchSync = async () => {
    setLoadingTarget("github-sync");
    setActionError(null);
    setSyncReport(null);

    try {
      const payload =
        coverage.unsyncedSampleIds.length > 0
          ? { projectIds: coverage.unsyncedSampleIds.slice(0, 10) }
          : {
              projectIds: [
                "project-1",
                "project-2",
                "project-3",
                "project-4",
                "project-5",
              ],
              forceRefresh: false,
            };

      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as BatchSyncSummaryResponse;
      if (!res.ok) {
        setActionError(json.error ?? "GitHub synchronization request failed.");
        return;
      }

      if (json.summary) {
        const s = json.summary;
        setSyncReport(
          `Batch sync finished: ${s.succeeded} succeeded, ${s.failed} failed, ${s.skipped} skipped${s.rateLimited ? " (halted at GitHub rate limit)" : ""}.`,
        );
      }

      await runDiagnostics("github-verify", false);
    } catch {
      setActionError("Failed to trigger repository synchronization.");
    } finally {
      setLoadingTarget(null);
    }
  };

  const syncPct =
    coverage.totalDefinedProjects > 0
      ? Math.round((coverage.syncedCount / coverage.totalDefinedProjects) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Operational policy & status taxonomy */}
      <section className="rounded-panel border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-fg">
              Provider Connections &amp; Telemetry
            </h2>
            <p className="mt-1 max-w-[68ch] text-xs text-fg2">
              Tokens and connection strings stay strictly server-side and are never
              transmitted to the browser. Environment variables alone show{" "}
              <span className="font-medium text-fg">Configured</span> until live
              authentication verification succeeds.
            </p>
          </div>
          <span className="tnum font-mono text-2xs text-fg3">
            Checked {formatDate(diag.timestamp)}
          </span>
        </div>

        <dl className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            ["connected", "configured", "available", "unavailable", "error"] as const
          ).map((key) => (
            <div key={key} className="flex items-start gap-2 text-2xs">
              <StatusBadge state={key} />
              <dd className="text-fg3">{STATUS_META[key].desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      {actionError && (
        <ErrorBanner
          action={
            <Button size="s" variant="ghost" onClick={() => setActionError(null)}>
              Dismiss
            </Button>
          }
        >
          {actionError}
        </ErrorBanner>
      )}

      {syncReport && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-ship/40 bg-ship/10 px-4 py-2.5 text-xs text-fg"
        >
          <span>{syncReport}</span>
          <Link href="/projects" className="text-sodium-text hover:underline">
            View Explorer
          </Link>
        </div>
      )}

      {/* 1. GitHub Integration */}
      <section
        aria-labelledby="integration-github-heading"
        className="rounded-panel border border-line bg-surface"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-ctl border border-edge bg-inset text-fg">
              <GithubIcon size={16} />
            </span>
            <div>
              <h3
                id="integration-github-heading"
                className="text-sm font-semibold text-fg"
              >
                GitHub Repository Intelligence
              </h3>
              <p className="text-2xs text-fg3">
                Metadata snapshots, archive checks, and workflow signal ingestion
              </p>
            </div>
          </div>
          <StatusBadge state={diag.github.state} />
        </header>

        <div className="space-y-4 p-5">
          <p className="text-xs text-fg2">{diag.github.detail}</p>

          <div className="grid gap-3 rounded-ctl border border-line bg-inset p-3 sm:grid-cols-3">
            <div>
              <span className="block text-2xs text-fg3">Server Token</span>
              <span className="mt-0.5 block font-mono text-xs text-fg">
                {diag.github.configured ? "Present (masked)" : "Not set"}
              </span>
            </div>
            <div>
              <span className="block text-2xs text-fg3">Private Repo Scope</span>
              <span className="mt-0.5 block font-mono text-xs text-fg">
                {diag.github.privateRepoCapable
                  ? "Supported (repo scope)"
                  : "Public only"}
              </span>
            </div>
            <div>
              <span className="block text-2xs text-fg3">API Quota</span>
              <span className="tnum mt-0.5 block font-mono text-xs text-fg">
                {diag.github.rateLimit.remaining !== null &&
                diag.github.rateLimit.limit !== null
                  ? `${diag.github.rateLimit.remaining} / ${diag.github.rateLimit.limit}`
                  : "Unknown until queried"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-fg2">
                Stored repository coverage:{" "}
                <span className="tnum font-medium text-fg">
                  {coverage.syncedCount}/{coverage.totalDefinedProjects}
                </span>{" "}
                ({coverage.verifiedCount} verified)
              </span>
              <span className="tnum font-mono text-2xs text-fg3">{syncPct}%</span>
            </div>
            <SegBar
              value={coverage.syncedCount}
              total={Math.max(1, coverage.totalDefinedProjects)}
              color="var(--ph-ship)"
              label="Stored repository synchronization coverage"
            />
            {coverage.latestSyncedAt && (
              <p className="text-2xs text-fg3">
                Latest persisted snapshot: {formatDate(coverage.latestSyncedAt)}
              </p>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs text-fg2 hover:text-fg"
          >
            Inspect repositories in Explorer
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              size="s"
              variant="secondary"
              loading={loadingTarget === "github-verify"}
              disabled={loadingTarget !== null}
              icon={<RefreshCw size={13} />}
              onClick={() => runDiagnostics("github-verify", false)}
            >
              Verify connectivity
            </Button>
            <Button
              size="s"
              variant="primary"
              loading={loadingTarget === "github-sync"}
              disabled={loadingTarget !== null}
              onClick={handleBatchSync}
            >
              {coverage.unsyncedSampleIds.length > 0
                ? `Sync next ${Math.min(10, coverage.unsyncedSampleIds.length)} unsynced`
                : "Refresh sample sync"}
            </Button>
          </div>
        </footer>
      </section>

      {/* 2. Vercel Integration */}
      <section
        aria-labelledby="integration-vercel-heading"
        className="rounded-panel border border-line bg-surface"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-ctl border border-edge bg-inset text-fg">
              <Triangle size={15} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <h3
                id="integration-vercel-heading"
                className="text-sm font-semibold text-fg"
              >
                Vercel Deployments
              </h3>
              <p className="text-2xs text-fg3">
                Production &amp; preview deployment status retrieval
              </p>
            </div>
          </div>
          <StatusBadge state={diag.vercel.state} />
        </header>

        <div className="space-y-4 p-5">
          <p className="text-xs text-fg2">{diag.vercel.detail}</p>

          <div className="grid gap-3 rounded-ctl border border-line bg-inset p-3 sm:grid-cols-3">
            <div>
              <span className="block text-2xs text-fg3">API Token</span>
              <span className="mt-0.5 block font-mono text-xs text-fg">
                {diag.vercel.configured ? "Present (masked)" : "Not set"}
              </span>
            </div>
            <div>
              <span className="block text-2xs text-fg3">Scope Filters</span>
              <span className="mt-0.5 block font-mono text-xs text-fg">
                {diag.vercel.projectConfigured ? "Project scoped" : "Account-wide"}
                {diag.vercel.teamConfigured ? " · Team scoped" : ""}
              </span>
            </div>
            <div>
              <span className="block text-2xs text-fg3">Persisted Records</span>
              <span className="tnum mt-0.5 block font-mono text-xs text-fg">
                {coverage.persistedDeploymentsCount} logged deployments
              </span>
            </div>
          </div>

          {diag.vercel.error && <ErrorBanner>{diag.vercel.error}</ErrorBanner>}

          {diag.vercel.latestDeployments && diag.vercel.latestDeployments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-2xs font-medium text-fg2">
                Recent Vercel deployments inspected
              </p>
              <ul className="divide-y divide-line rounded-ctl border border-line bg-inset">
                {diag.vercel.latestDeployments.map((d) => (
                  <li
                    key={d.uid}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-fg">{d.name}</span>
                      <span className="ml-2 font-mono text-2xs text-fg3">
                        {d.state} {d.target ? `· ${d.target}` : ""}
                      </span>
                    </div>
                    {isSafeHttpUrl(d.url) && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-2xs text-sodium-text hover:underline"
                      >
                        Open deployment
                        <ArrowUpRight size={12} aria-hidden="true" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <span className="text-2xs text-fg3">
            {diag.vercel.configured
              ? "Live retrieval verifies token validity against Vercel REST API v6."
              : "Set VERCEL_TOKEN on the server to enable Vercel API retrieval."}
          </span>
          <Button
            size="s"
            variant="secondary"
            loading={loadingTarget === "vercel"}
            disabled={!diag.vercel.configured || loadingTarget !== null}
            icon={<RefreshCw size={13} />}
            onClick={() => runDiagnostics("vercel", true)}
          >
            Verify &amp; fetch deployments
          </Button>
        </footer>
      </section>

      {/* 3. Supabase & PostgreSQL Diagnostics */}
      <section
        aria-labelledby="integration-supabase-heading"
        className="rounded-panel border border-line bg-surface"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-ctl border border-edge bg-inset text-fg">
              <Database size={16} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <h3
                id="integration-supabase-heading"
                className="text-sm font-semibold text-fg"
              >
                Supabase &amp; Workspace Storage
              </h3>
              <p className="text-2xs text-fg3">
                PostgreSQL persistence health and OAuth identity availability
              </p>
            </div>
          </div>
          <StatusBadge state={diag.database.state} />
        </header>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 rounded-ctl border border-line bg-inset p-3 sm:grid-cols-3">
            <div>
              <span className="block text-2xs text-fg3">Storage Backend</span>
              <span className="mt-0.5 block font-mono text-xs text-fg">
                {diag.database.storageMode === "postgresql"
                  ? "PostgreSQL (Prisma)"
                  : "Local JSON fallback"}
              </span>
            </div>
            <div>
              <span className="block text-2xs text-fg3">Database Host</span>
              <span className="mt-0.5 block truncate font-mono text-xs text-fg">
                {diag.database.host ?? "Local workspace file"}
              </span>
            </div>
            <div>
              <span className="block text-2xs text-fg3">Query Latency</span>
              <span className="tnum mt-0.5 block font-mono text-xs text-fg">
                {diag.database.latencyMs !== null
                  ? `${diag.database.latencyMs} ms`
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-ctl border border-line px-3 py-2.5 text-xs">
            <div>
              <span className="font-medium text-fg">Supabase OAuth Provider</span>
              <p className="text-2xs text-fg3">{diag.supabaseAuth.detail}</p>
            </div>
            <StatusBadge state={diag.supabaseAuth.state} />
          </div>

          {diag.database.error && <ErrorBanner>{diag.database.error}</ErrorBanner>}

          {healthSnapshot && (
            <p className="font-mono text-2xs text-fg3">
              /api/health status: {healthSnapshot.status} · storage:{" "}
              {healthSnapshot.storageStatus}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <span className="text-2xs text-fg3">
            Connection strings and service keys are never exposed in diagnostics output.
          </span>
          <Button
            size="s"
            variant="secondary"
            loading={loadingTarget === "health"}
            disabled={loadingTarget !== null}
            icon={<RefreshCw size={13} />}
            onClick={() => runDiagnostics("health", false)}
          >
            Run health check
          </Button>
        </footer>
      </section>
    </div>
  );
}
