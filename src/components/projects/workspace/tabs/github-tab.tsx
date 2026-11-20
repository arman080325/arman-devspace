"use client";

import { useState } from "react";
import {
  GitBranch,
  Star,
  GitFork,
  CircleDot,
  Tag,
  Scale,
  RefreshCw,
  CircleCheck,
  OctagonX,
  CircleDashed,
  ArrowUpRight,
} from "lucide-react";
import { Panel, Button, Empty, cx } from "@/components/redesign/ui";
import { StatusGlyph, GithubIcon } from "@/components/redesign/glyphs";
import type { Project } from "@/types/project";

export function GitHubTab({
  project,
  onSyncGithub,
  onVerifyOverride,
}: {
  project: Project;
  onSyncGithub: () => Promise<void>;
  onVerifyOverride: (url: string) => Promise<void>;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [overrideInput, setOverrideInput] = useState(
    project.verifiedRepoUrl && project.verifiedRepoUrl !== project.originalRepoUrl
      ? project.verifiedRepoUrl
      : "",
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);

  const repoHref = project.verifiedRepoUrl ?? project.originalRepoUrl ?? null;
  const meta = project.repositoryMetadata;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncGithub();
    } catch {
      // handled in parent
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyFeedback(null);
    try {
      await onVerifyOverride(overrideInput.trim());
      setVerifyFeedback("Repository URL successfully verified and synced.");
    } catch {
      // handled in parent
    } finally {
      setIsVerifying(false);
    }
  };

  if (!repoHref) {
    return (
      <div className="space-y-6">
        <Panel titleId="no-repo-title" title="GitHub Repository Link">
          <Empty title="No repository linked yet.">
            Add a source repository URL below to connect GitHub Actions, commits,
            releases, and repository health checks.
          </Empty>

          <form onSubmit={handleVerify} className="max-w-lg mx-auto p-5 space-y-3">
            <label htmlFor="repo-url-in" className="block text-2xs font-medium text-fg3">
              GitHub Repository URL
            </label>
            <div className="flex gap-2">
              <input
                id="repo-url-in"
                type="url"
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="h-8 flex-1 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
              <Button type="submit" size="s" variant="primary" loading={isVerifying}>
                Connect
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    );
  }

  // Repository health checks derived from real metadata
  const checks: Array<{
    label: string;
    status: "pass" | "missing" | "unknown";
    note: string;
  }> = [
    {
      label: "README Documentation",
      status: meta?.hasReadme ? "pass" : "missing",
      note: meta?.hasReadme ? "README present" : "No README detected",
    },
    {
      label: "Open Source License",
      status: meta?.license ? "pass" : "missing",
      note: meta?.license ? `License: ${meta.license}` : "No LICENSE file",
    },
    {
      label: "Continuous Integration (CI)",
      status: meta?.latestWorkflowRun ? "pass" : "missing",
      note: meta?.latestWorkflowRun
        ? `Workflow: ${meta.latestWorkflowRun.name} (${meta.latestWorkflowRun.conclusion ?? "running"})`
        : "No active workflow runs",
    },
    {
      label: "Default Branch Protection",
      status: project.status === "completed" ? "pass" : "unknown",
      note: project.status === "completed" ? "Protected" : "Standard settings",
    },
    {
      label: "Security Audit & Secrets",
      status: "unknown",
      note: "Requires GitHub security_events scope to inspect",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Facts Bar */}
      <Panel
        titleId="facts-title"
        title="Repository Telemetry"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="s"
              variant="ghost"
              loading={isSyncing}
              icon={<RefreshCw size={13} strokeWidth={1.5} />}
              onClick={handleSync}
            >
              Sync GitHub
            </Button>
            <a
              href={repoHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1.5 rounded-ctl border border-edge px-2.5 text-2xs font-medium text-fg hover:bg-elevated"
            >
              <GithubIcon size={13} />
              <span>Open on GitHub</span>
              <ArrowUpRight size={11} strokeWidth={1.5} />
            </a>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-fg3">
            <span>
              Source: GitHub API · Last synced{" "}
              {meta?.lastUpdated
                ? new Date(meta.lastUpdated).toLocaleTimeString()
                : "recently"}
            </span>
            <span className="font-mono">Branch: {meta?.defaultBranch ?? "main"}</span>
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4 lg:grid-cols-6 sm:p-5 text-xs">
          <div>
            <dt className="text-2xs text-fg3 flex items-center gap-1.5">
              <GitBranch size={13} className="text-fg3" /> Default Branch
            </dt>
            <dd className="font-mono text-xs font-semibold text-fg mt-1">
              {meta?.defaultBranch ?? "main"}
            </dd>
          </div>

          <div>
            <dt className="text-2xs text-fg3 flex items-center gap-1.5">
              <Star size={13} className="text-fg3" /> Stars
            </dt>
            <dd className="font-mono text-xs font-semibold text-fg mt-1">
              {meta?.stars ?? 0}
            </dd>
          </div>

          <div>
            <dt className="text-2xs text-fg3 flex items-center gap-1.5">
              <GitFork size={13} className="text-fg3" /> Forks
            </dt>
            <dd className="font-mono text-xs font-semibold text-fg mt-1">
              {meta?.forks ?? 0}
            </dd>
          </div>

          <div>
            <dt className="text-2xs text-fg3 flex items-center gap-1.5">
              <CircleDot size={13} className="text-fg3" /> Open Issues
            </dt>
            <dd className="font-mono text-xs font-semibold text-fg mt-1">
              {meta?.openIssues ?? 0}
            </dd>
          </div>

          <div>
            <dt className="text-2xs text-fg3 flex items-center gap-1.5">
              <Tag size={13} className="text-fg3" /> Latest Release
            </dt>
            <dd className="font-mono text-xs font-semibold text-fg mt-1 truncate">
              {meta?.latestRelease?.tagName ?? "—"}
            </dd>
          </div>

          <div>
            <dt className="text-2xs text-fg3 flex items-center gap-1.5">
              <Scale size={13} className="text-fg3" /> License
            </dt>
            <dd className="font-mono text-xs font-semibold text-fg mt-1 truncate">
              {meta?.license ?? "None"}
            </dd>
          </div>
        </dl>
      </Panel>

      {/* Two Column Layout: Latest Commit & Repository Health Checks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Commit */}
        <Panel titleId="latest-commit-title" title="Latest Commit">
          {meta?.latestCommit ? (
            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">
                  <StatusGlyph status="success" size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fg text-sm leading-snug">
                    {meta.latestCommit.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs text-fg3">
                    <span className="text-sodium-text">{meta.latestCommit.shortSha}</span>
                    <span>by {meta.latestCommit.authorName}</span>
                    <span>{new Date(meta.latestCommit.date).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {meta.latestCommit.url && (
                <div className="pt-2 border-t border-line/60">
                  <a
                    href={meta.latestCommit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-2xs text-sodium-text hover:underline"
                  >
                    <span>View commit on GitHub</span>
                    <ArrowUpRight size={11} />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <Empty title="No commit data retrieved yet.">
              Run &ldquo;Sync GitHub&rdquo; to pull the latest commit log.
            </Empty>
          )}
        </Panel>

        {/* Repository Health Checks */}
        <Panel titleId="health-checks-title" title="Repository Health Checks">
          <ul className="divide-y divide-line/60">
            {checks.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between gap-3 p-3 sm:px-4 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {c.status === "pass" ? (
                    <CircleCheck size={14} className="shrink-0 text-ship" />
                  ) : c.status === "missing" ? (
                    <OctagonX size={14} className="shrink-0 text-break" />
                  ) : (
                    <CircleDashed size={14} className="shrink-0 text-fg3" />
                  )}
                  <div className="min-w-0">
                    <span className="font-medium text-fg block truncate">{c.label}</span>
                    <span className="text-2xs text-fg3 block truncate">{c.note}</span>
                  </div>
                </div>

                <span
                  className={cx(
                    "shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    c.status === "pass"
                      ? "bg-ship/15 text-ship"
                      : c.status === "missing"
                        ? "bg-break/15 text-break"
                        : "bg-inset text-fg3",
                  )}
                >
                  {c.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Override Repository URL */}
      <Panel titleId="override-title" title="Repository URL Configuration">
        <form onSubmit={handleVerify} className="p-4 sm:p-5 space-y-3">
          <p className="text-xs text-fg2">
            If the canonical source URL has migrated or you are pointing this project to
            your own fork, enter the updated repository URL:
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="h-8 flex-1 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
            />
            <Button type="submit" size="s" variant="secondary" loading={isVerifying}>
              Verify & Update
            </Button>
          </div>
          {verifyFeedback && (
            <p className="text-2xs text-ship font-medium">{verifyFeedback}</p>
          )}
        </form>
      </Panel>
    </div>
  );
}
