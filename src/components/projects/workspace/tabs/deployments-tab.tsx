"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowUpRight } from "lucide-react";
import { Panel, Button, Empty } from "@/components/redesign/ui";
import { EnvChip } from "@/components/redesign/signature";
import { StatusGlyph } from "@/components/redesign/glyphs";
import type { DeploymentRecord, Project, ProjectProgress } from "@/types/project";

export function DeploymentsTab({
  project,
  progress,
  onAddDeployment,
  onDeleteDeployment,
}: {
  project: Project;
  progress: ProjectProgress | null;
  onAddDeployment: (data: {
    environment: "production" | "preview" | "staging";
    provider: string;
    deploymentUrl: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteDeployment: (deploymentId: string) => Promise<void>;
}) {
  const deployments = progress?.deployments ?? [];
  const prodDeployment = deployments.find((d) => d.environment === "production");
  const previewDeployment = deployments.find((d) => d.environment === "preview");

  const getRecordUrl = (d?: DeploymentRecord | null): string => {
    if (!d) return "";
    return d.url || (d as unknown as { deploymentUrl?: string }).deploymentUrl || "";
  };

  const prodUrl = getRecordUrl(prodDeployment) || project.deploymentUrl || "";
  const previewUrl = getRecordUrl(previewDeployment);

  const [isAdding, setIsAdding] = useState(false);
  const [env, setEnv] = useState<"production" | "preview" | "staging">("production");
  const [provider, setProvider] = useState("Vercel");
  const [deployUrl, setDeployUrl] = useState("");
  const [deployNotes, setDeployNotes] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployUrl.trim()) return;
    setIsAdding(true);
    try {
      await onAddDeployment({
        environment: env,
        provider,
        deploymentUrl: deployUrl.trim(),
        notes: deployNotes.trim() || undefined,
      });
      setDeployUrl("");
      setDeployNotes("");
    } catch {
      // handled in parent
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Environments Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Production Card */}
        <section
          className="relative rounded-panel border border-line bg-surface p-4 pl-5 transition-colors"
          aria-label="Production environment status"
        >
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[3px] rounded-r-[2px]"
            style={{
              background: prodUrl ? "var(--ph-ship)" : "var(--border-default)",
            }}
          />
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-fg">Production</h3>
            {prodUrl ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ship">
                <StatusGlyph status="success" size={12} />
                <span>Ready</span>
              </span>
            ) : (
              <span className="text-2xs text-fg3">Not deployed</span>
            )}
          </div>

          {prodUrl ? (
            <div className="mt-3 space-y-1 text-xs">
              <a
                href={prodUrl.startsWith("http") ? prodUrl : `https://${prodUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-2xs text-sodium-text hover:underline truncate max-w-full"
              >
                <span>{prodUrl}</span>
                <ArrowUpRight size={11} />
              </a>
              <p className="font-mono text-[10px] text-fg3">
                Provider: {prodDeployment?.provider ?? "Vercel / Cloud"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-2xs text-fg3">
              No live production URL registered for this project yet.
            </p>
          )}
        </section>

        {/* Preview Card */}
        <section
          className="relative rounded-panel border border-line bg-surface p-4 pl-5 transition-colors"
          aria-label="Preview environment status"
        >
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[3px] rounded-r-[2px]"
            style={{
              background: previewUrl ? "var(--ph-build)" : "var(--border-default)",
            }}
          />
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-fg">Preview</h3>
            {previewUrl ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sodium-text">
                <StatusGlyph status="running" size={12} />
                <span>Active</span>
              </span>
            ) : (
              <span className="text-2xs text-fg3">No preview deploy</span>
            )}
          </div>

          {previewUrl ? (
            <div className="mt-3 space-y-1 text-xs">
              <a
                href={
                  previewUrl.startsWith("http") ? previewUrl : `https://${previewUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-2xs text-fg hover:underline truncate max-w-full"
              >
                <span>{previewUrl}</span>
                <ArrowUpRight size={11} />
              </a>
              <p className="font-mono text-[10px] text-fg3">
                Provider: {previewDeployment?.provider ?? "Vercel Preview"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-2xs text-fg3">
              Trigger a pull request or add a preview URL below to track previews.
            </p>
          )}
        </section>
      </div>

      {/* Add Deployment Form */}
      <Panel titleId="add-deploy-title" title="Register Deployment Record">
        <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="dep-env"
                className="block text-2xs font-medium text-fg3 mb-1"
              >
                Environment
              </label>
              <select
                id="dep-env"
                value={env}
                onChange={(e) =>
                  setEnv(e.target.value as "production" | "preview" | "staging")
                }
                className="h-8 w-full rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
              >
                <option value="production">Production</option>
                <option value="preview">Preview</option>
                <option value="staging">Staging</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dep-prov"
                className="block text-2xs font-medium text-fg3 mb-1"
              >
                Provider
              </label>
              <select
                id="dep-prov"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="h-8 w-full rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
              >
                <option value="Vercel">Vercel</option>
                <option value="Render">Render</option>
                <option value="Cloudflare">Cloudflare Workers</option>
                <option value="Fly.io">Fly.io</option>
                <option value="Railway">Railway</option>
                <option value="AWS">AWS</option>
                <option value="Docker">Docker / Self-Hosted</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dep-url"
                className="block text-2xs font-medium text-fg3 mb-1"
              >
                Deployment URL
              </label>
              <input
                id="dep-url"
                type="text"
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dep-notes"
              className="block text-2xs font-medium text-fg3 mb-1"
            >
              Release Notes / Commit Reference (Optional)
            </label>
            <input
              id="dep-notes"
              type="text"
              value={deployNotes}
              onChange={(e) => setDeployNotes(e.target.value)}
              placeholder="e.g. Migrated to Next.js 16 and Supabase pooling"
              className="h-8 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="s"
              loading={isAdding}
              icon={<Plus size={13} strokeWidth={1.5} />}
            >
              Add Deployment Record
            </Button>
          </div>
        </form>
      </Panel>

      {/* Deployment History Table */}
      <Panel
        titleId="deploy-history-title"
        title="Deployment History"
        actions={
          <span className="font-mono text-xs text-fg3">{deployments.length} records</span>
        }
      >
        {deployments.length === 0 ? (
          <Empty title="No deployment records added yet.">
            Add a record above to catalog your production, staging, and preview
            deployments.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="border-b border-line text-2xs text-fg3">
                  <th scope="col" className="h-9 px-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="h-9 px-3 font-medium">
                    Environment
                  </th>
                  <th scope="col" className="h-9 px-3 font-medium">
                    Provider
                  </th>
                  <th scope="col" className="h-9 px-3 font-medium">
                    URL
                  </th>
                  <th scope="col" className="h-9 px-3 font-medium">
                    Deployed At
                  </th>
                  <th scope="col" className="h-9 w-10 text-center">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-elevated/40 [&>td]:border-b [&>td]:border-line/60 last:[&>td]:border-0 transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                        <StatusGlyph
                          status={d.status === "failed" ? "failed" : "success"}
                          size={12}
                        />
                        <span className="capitalize">{d.status}</span>
                      </span>
                    </td>
                    <td className="px-3">
                      <EnvChip env={d.environment} />
                    </td>
                    <td className="px-3 font-medium text-fg2">{d.provider}</td>
                    <td className="px-3">
                      {getRecordUrl(d) ? (
                        <a
                          href={
                            getRecordUrl(d).startsWith("http")
                              ? getRecordUrl(d)
                              : `https://${getRecordUrl(d)}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-2xs text-sodium-text hover:underline max-w-[200px] truncate"
                        >
                          <span className="truncate">{getRecordUrl(d)}</span>
                          <ArrowUpRight size={11} />
                        </a>
                      ) : (
                        <span className="font-mono text-2xs text-fg3">—</span>
                      )}
                    </td>
                    <td className="font-mono px-3 text-2xs text-fg3">
                      {d.deployedAt ? new Date(d.deployedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteDeployment(d.id)}
                        aria-label="Delete deployment record"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-ctl text-fg3 hover:bg-elevated hover:text-break"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
