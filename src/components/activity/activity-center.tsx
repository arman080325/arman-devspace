"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Info,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  ActivityCategory,
  ActivityEvent,
  ActivityFeedResult,
  ActivitySeverity,
} from "@/types/activity";

interface ProjectOption {
  id: string;
  slug: string;
  title: string;
  number: number;
}

interface ActivityCenterClientProps {
  initialFeed: ActivityFeedResult;
  projects: ProjectOption[];
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function getSeverityBadge(severity: ActivitySeverity) {
  switch (severity) {
    case "critical":
      return (
        <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
          <AlertOctagon className="size-3" aria-hidden="true" />
          Critical
        </span>
      );
    case "warning":
      return (
        <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
          <AlertTriangle className="size-3" aria-hidden="true" />
          Warning
        </span>
      );
    case "success":
      return (
        <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          Success
        </span>
      );
    case "info":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
          <Info className="size-3" aria-hidden="true" />
          Info
        </span>
      );
  }
}

function getCategoryIcon(category: ActivityCategory) {
  switch (category) {
    case "ci":
      return <GitBranch className="size-4 text-cyan-400" aria-hidden="true" />;
    case "deployment":
      return <Rocket className="size-4 text-violet-400" aria-hidden="true" />;
    case "repository":
      return <ShieldAlert className="size-4 text-amber-400" aria-hidden="true" />;
    case "workspace":
    default:
      return <Activity className="size-4 text-emerald-400" aria-hidden="true" />;
  }
}

export function ActivityCenterClient({
  initialFeed,
  projects,
}: ActivityCenterClientProps) {
  const [events, setEvents] = React.useState<ActivityEvent[]>(initialFeed.events);
  const [pagination, setPagination] = React.useState(initialFeed.pagination);
  const [unreadCount, setUnreadCount] = React.useState(initialFeed.unreadCount);

  const [statusFilter, setStatusFilter] = React.useState<"all" | "unread" | "read">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = React.useState<ActivityCategory | "all">(
    "all",
  );
  const [severityFilter, setSeverityFilter] = React.useState<ActivitySeverity | "all">(
    "all",
  );
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isInitialMount = React.useRef(true);

  const goToPage = React.useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageToLoad));
        params.set("limit", "20");
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (severityFilter !== "all") params.set("severity", severityFilter);
        if (projectFilter !== "all") params.set("project", projectFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/activity?${params.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as ActivityFeedResult;
          setEvents(data.events);
          setPagination(data.pagination);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // network error fallback
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, categoryFilter, severityFilter, projectFilter, searchQuery],
  );

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "20");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (projectFilter !== "all") params.set("project", projectFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      fetch(`/api/activity?${params.toString()}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: ActivityFeedResult | null) => {
          if (active && data) {
            setEvents(data.events);
            setPagination(data.pagination);
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [statusFilter, categoryFilter, severityFilter, projectFilter, searchQuery]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/activity/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: projectFilter !== "all" ? projectFilter : undefined,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          synced: boolean;
          newEventsCount: number;
          unreadCount: number;
        };
        setSyncFeedback({
          type: "success",
          message:
            json.newEventsCount > 0
              ? `Sync complete: ${json.newEventsCount} new event${json.newEventsCount === 1 ? "" : "s"} detected.`
              : "Sync complete: All repository and deployment telemetry is up to date.",
        });
        void goToPage(1);
      } else {
        const err = (await res.json()) as { error?: string };
        setSyncFeedback({
          type: "error",
          message: err.error || "Intelligence sync failed.",
        });
      }
    } catch {
      setSyncFeedback({
        type: "error",
        message: "Failed to connect to synchronization service.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/activity/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => ({
            ...e,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
        );
        setUnreadCount(0);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleRead = async (event: ActivityEvent) => {
    const nextRead = !event.isRead;
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              isRead: nextRead,
              readAt: nextRead ? new Date().toISOString() : null,
            }
          : e,
      ),
    );
    setUnreadCount((prev) => Math.max(0, nextRead ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/activity/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: nextRead }),
      });
      if (!res.ok) {
        // Rollback
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
        setUnreadCount((prev) => Math.max(0, nextRead ? prev + 1 : prev - 1));
      }
    } catch {
      // Rollback
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
      setUnreadCount((prev) => Math.max(0, nextRead ? prev + 1 : prev - 1));
    }
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    projectFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setProjectFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
            <Bell className="size-4" aria-hidden="true" />
            <span>Event Intelligence & Notification Stream</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Activity Center
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            One central activity timeline across 100 independently managed repositories.
            Telemetry from CI/CD, releases, deployments, and workspace actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn("size-3.5", isSyncing && "animate-spin")}
              aria-hidden="true"
            />
            <span>{isSyncing ? "Syncing..." : "Sync Intelligence"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="gap-1.5 text-xs"
          >
            <CheckCheck className="size-3.5 text-emerald-400" aria-hidden="true" />
            <span>Mark all read</span>
          </Button>
        </div>
      </div>

      {/* Sync Feedback Toast / Banner */}
      {syncFeedback && (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between rounded-lg border p-3 text-xs transition-colors",
            syncFeedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400",
          )}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === "success" ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <AlertCircle className="size-4" aria-hidden="true" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSyncFeedback(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                statusFilter === "all"
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All Events ({pagination.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unread")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                statusFilter === "unread"
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-violet-400/20 px-1.5 py-0.2 text-[10px] font-semibold text-violet-300">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search
              className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Filter activity titles or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Secondary Category & Severity Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-mono text-[11px] text-muted-foreground">Category:</span>
          {(
            [
              { id: "all", label: "All" },
              { id: "ci", label: "CI/CD" },
              { id: "deployment", label: "Deployments" },
              { id: "repository", label: "Repository" },
              { id: "workspace", label: "Workspace" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                categoryFilter === c.id
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                  : "border-border/70 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}

          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            Severity:
          </span>
          {(
            [
              { id: "all", label: "All" },
              { id: "critical", label: "Critical" },
              { id: "warning", label: "Warning" },
              { id: "success", label: "Success" },
              { id: "info", label: "Info" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeverityFilter(s.id)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                severityFilter === s.id
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                  : "border-border/70 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}

          {/* Project Dropdown Selector */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-7 max-w-48 truncate rounded-md border border-border/80 bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              <option value="all">All Projects (100)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.slug}>
                  #{String(p.number).padStart(3, "0")} {p.title}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Activity Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-10 text-center">
          <Activity className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            No activity events found
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {hasActiveFilters
              ? "No events match the selected status, category, or project filter."
              : "No activity recorded yet. Click 'Sync Intelligence' to discover live CI/CD and release events from GitHub."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                Clear all filters
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw
                  className={cn("size-3.5", isSyncing && "animate-spin")}
                  aria-hidden="true"
                />
                <span>Sync Intelligence</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const isUnread = !event.isRead;
            return (
              <Card
                key={event.id}
                className={cn(
                  "relative border transition-all duration-150 hover:border-border",
                  isUnread
                    ? "border-violet-500/40 bg-card shadow-sm"
                    : "border-border/60 bg-card/60 opacity-90",
                  event.severity === "critical" && "border-l-4 border-l-rose-500",
                  event.severity === "warning" && "border-l-4 border-l-amber-500",
                  event.severity === "success" && "border-l-4 border-l-emerald-500",
                  event.severity === "info" && "border-l-4 border-l-violet-500",
                )}
              >
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {isUnread && (
                          <span
                            className="inline-block size-2 rounded-full bg-violet-400 ring-2 ring-violet-400/20"
                            title="Unread notification"
                            aria-label="Unread notification"
                          />
                        )}

                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          {getCategoryIcon(event.category)}
                          <span className="capitalize">{event.category}</span>
                        </span>

                        <span className="text-muted-foreground/40">·</span>

                        <Link
                          href={`/projects/${event.projectSlug}`}
                          className="font-mono text-[11px] font-medium text-violet-400 hover:underline"
                        >
                          #{String(event.projectNumber).padStart(3, "0")}{" "}
                          {event.projectTitle}
                        </Link>

                        <span className="text-muted-foreground/40">·</span>

                        {getSeverityBadge(event.severity)}
                      </div>

                      <h4
                        className={cn(
                          "text-sm tracking-tight",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/90",
                        )}
                      >
                        {event.title}
                      </h4>

                      {event.description && (
                        <p className="text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:flex-col sm:items-end sm:gap-1.5">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatRelativeTime(event.createdAt)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {event.actionUrl && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            render={
                              <a
                                href={event.actionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                            className="text-muted-foreground hover:text-foreground"
                            title="Open external resource"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">Open external link</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleToggleRead(event)}
                          className={cn(
                            "text-muted-foreground hover:text-foreground",
                            isUnread && "text-violet-400",
                          )}
                          title={isUnread ? "Mark as read" : "Mark as unread"}
                        >
                          {isUnread ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Bell className="size-3.5" aria-hidden="true" />
                          )}
                          <span className="sr-only">
                            {isUnread ? "Mark as read" : "Mark as unread"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/70 pt-4 text-xs">
          <p className="text-muted-foreground font-mono text-[11px]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} events)
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="gap-1 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
