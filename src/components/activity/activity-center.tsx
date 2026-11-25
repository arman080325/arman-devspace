"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  Button,
  Empty,
  ErrorBanner,
  IconButton,
  Kbds,
  Segmented,
  Sheet,
  SkeletonRows,
  Tabs,
  Time,
  cx,
} from "@/components/redesign/ui";
import { SeverityGlyph, SeverityTag } from "@/components/redesign/glyphs";
import type { Severity } from "@/components/redesign/types";
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

type TabFilter = "all" | "unread" | ActivityCategory;
type DateRangeFilter = "any" | "today" | "7d" | "30d";

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  ci: "CI/CD",
  deployment: "Deployment",
  repository: "Repository",
  workspace: "Workspace",
};

function toRedesignSeverity(sev: ActivitySeverity): Severity {
  switch (sev) {
    case "critical":
      return "error";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "info":
    default:
      return "info";
  }
}

const SEVERITY_DOT_COLOR: Record<ActivitySeverity, string> = {
  critical: "var(--ph-break)",
  warning: "var(--warn)",
  success: "var(--ph-ship)",
  info: "var(--ph-explore)",
};

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
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

function formatAbsoluteTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getDayGroupLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const todayKey = new Date().toISOString().slice(0, 10);
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayKey = yest.toISOString().slice(0, 10);
    const evKey = date.toISOString().slice(0, 10);
    if (evKey === todayKey) return "Today";
    if (evKey === yesterdayKey) return "Yesterday";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "Earlier";
  }
}

function getCategoryIcon(category: ActivityCategory) {
  switch (category) {
    case "ci":
      return (
        <GitBranch size={14} strokeWidth={1.5} className="text-explore" aria-hidden />
      );
    case "deployment":
      return <Rocket size={14} strokeWidth={1.5} className="text-ship" aria-hidden />;
    case "repository":
      return (
        <ShieldAlert size={14} strokeWidth={1.5} className="text-warn" aria-hidden />
      );
    case "workspace":
    default:
      return (
        <Activity size={14} strokeWidth={1.5} className="text-sodium-text" aria-hidden />
      );
  }
}

function formatMetadataEntries(
  metadata: Record<string, unknown> | null | undefined,
): Array<[string, string]> {
  if (!metadata) return [];
  const entries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(metadata)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      entries.push([k, String(v)]);
    } else if (Array.isArray(v)) {
      entries.push([k, v.map(String).join(", ")]);
    }
  }
  return entries;
}

function matchesDateRange(dateStr: string, range: DateRangeFilter): boolean {
  if (range === "any") return true;
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return true;
  const ageHours = (Date.now() - ts) / 3_600_000;
  if (range === "today") return ageHours <= 24;
  if (range === "7d") return ageHours <= 24 * 7;
  if (range === "30d") return ageHours <= 24 * 30;
  return true;
}

export function ActivityCenterClient({
  initialFeed,
  projects,
}: ActivityCenterClientProps) {
  const [events, setEvents] = React.useState<ActivityEvent[]>(initialFeed.events);
  const [pagination, setPagination] = React.useState(initialFeed.pagination);
  const [unreadCount, setUnreadCount] = React.useState(initialFeed.unreadCount);

  const [tab, setTab] = React.useState<TabFilter>("all");
  const [severityFilter, setSeverityFilter] = React.useState<ActivitySeverity | "all">(
    "all",
  );
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<DateRangeFilter>("any");

  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialFeed.events[0]?.id ?? null,
  );
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = React.useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const isInitialMount = React.useRef(true);

  const buildQueryParams = React.useCallback(
    (pageToLoad: number) => {
      const params = new URLSearchParams();
      params.set("page", String(pageToLoad));
      params.set("limit", String(initialFeed.pagination.limit || 20));
      if (tab === "unread") {
        params.set("status", "unread");
      } else if (tab !== "all") {
        params.set("category", tab);
      }
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (projectFilter !== "all") params.set("project", projectFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      return params;
    },
    [initialFeed.pagination.limit, tab, severityFilter, projectFilter, searchQuery],
  );

  const fetchFeedPage = React.useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = buildQueryParams(pageToLoad);
        const res = await fetch(`/api/activity?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Activity request failed (${res.status}).`);
        }
        const data = (await res.json()) as ActivityFeedResult;
        setEvents(data.events);
        setPagination(data.pagination);
        setUnreadCount(data.unreadCount);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load activity feed.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [buildQueryParams],
  );

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      setLoadError(null);
      const params = buildQueryParams(1);

      fetch(`/api/activity?${params.toString()}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Activity request failed (${res.status}).`);
          }
          return (await res.json()) as ActivityFeedResult;
        })
        .then((data) => {
          if (active) {
            setEvents(data.events);
            setPagination(data.pagination);
            setUnreadCount(data.unreadCount);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setLoadError(
              err instanceof Error ? err.message : "Failed to filter activity feed.",
            );
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [buildQueryParams]);

  const visibleEvents = React.useMemo(
    () => events.filter((e) => matchesDateRange(e.createdAt, dateRange)),
    [events, dateRange],
  );

  const groupedEvents = React.useMemo(() => {
    const groups: Array<{ day: string; items: ActivityEvent[] }> = [];
    for (const ev of visibleEvents) {
      const day = getDayGroupLabel(ev.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.items.push(ev);
      } else {
        groups.push({ day, items: [ev] });
      }
    }
    return groups;
  }, [visibleEvents]);

  const selectedEvent = React.useMemo(
    () =>
      visibleEvents.find((e) => e.id === selectedId) ??
      events.find((e) => e.id === selectedId) ??
      visibleEvents[0] ??
      null,
    [visibleEvents, events, selectedId],
  );

  const relatedEvents = React.useMemo(() => {
    if (!selectedEvent) return [];
    return events
      .filter((e) => e.projectId === selectedEvent.projectId && e.id !== selectedEvent.id)
      .slice(0, 5);
  }, [events, selectedEvent]);

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
              ? `On-demand sync complete: ${json.newEventsCount} new event${json.newEventsCount === 1 ? "" : "s"} recorded.`
              : "On-demand sync complete: All indexed GitHub & deployment telemetry is up to date.",
        });
        void fetchFeedPage(1);
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
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
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const res = await fetch("/api/activity/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setEvents((prev) =>
          prev.map((e) => ({
            ...e,
            isRead: true,
            readAt: e.readAt ?? now,
          })),
        );
        setUnreadCount(0);
        setSyncFeedback({
          type: "success",
          message: "All unread activity notifications marked as read.",
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: "Could not mark all events as read.",
        });
      }
    } catch {
      setSyncFeedback({
        type: "error",
        message: "Network error while marking events as read.",
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleToggleRead = React.useCallback(
    async (event: ActivityEvent, explicitNext?: boolean) => {
      const nextRead = explicitNext !== undefined ? explicitNext : !event.isRead;
      if (nextRead === event.isRead) return;

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
          throw new Error("Failed to persist read status");
        }
      } catch {
        // Rollback on failure
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
        setUnreadCount((prev) => Math.max(0, nextRead ? prev + 1 : prev - 1));
        setSyncFeedback({
          type: "error",
          message: "Failed to update read status. Reverted local state.",
        });
      }
    },
    [],
  );

  const handleSelectEvent = (ev: ActivityEvent, openMobileSheet = false) => {
    setSelectedId(ev.id);
    if (!ev.isRead) {
      void handleToggleRead(ev, true);
    }
    if (openMobileSheet) {
      setDrawerOpen(true);
    }
  };

  // Keyboard shortcuts: J/K move, E toggle read, O open action link
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        !t ||
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }
      if (document.querySelector('[aria-modal="true"]')) return;

      const idx = visibleEvents.findIndex((x) => x.id === selectedEvent?.id);
      if (e.key === "j" || e.key === "k") {
        if (visibleEvents.length === 0) return;
        e.preventDefault();
        const nextIdx = Math.max(
          0,
          Math.min(visibleEvents.length - 1, idx + (e.key === "j" ? 1 : -1)),
        );
        const ev = visibleEvents[nextIdx];
        if (ev) {
          setSelectedId(ev.id);
          listRef.current
            ?.querySelector(`[data-event="${ev.id}"]`)
            ?.scrollIntoView({ block: "nearest" });
        }
      } else if (e.key === "e" && selectedEvent) {
        e.preventDefault();
        void handleToggleRead(selectedEvent);
      } else if (e.key === "o" && selectedEvent?.actionUrl) {
        e.preventDefault();
        window.open(selectedEvent.actionUrl, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleEvents, selectedEvent, handleToggleRead]);

  const hasActiveFilters =
    tab !== "all" ||
    severityFilter !== "all" ||
    projectFilter !== "all" ||
    searchQuery.trim() !== "" ||
    dateRange !== "any";

  const resetFilters = () => {
    setTab("all");
    setSeverityFilter("all");
    setProjectFilter("all");
    setSearchQuery("");
    setDateRange("any");
  };

  const pageLimit = pagination.limit || 20;
  const startRow = pagination.total === 0 ? 0 : (pagination.page - 1) * pageLimit + 1;
  const endRow = Math.min(pagination.total, pagination.page * pageLimit);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Workstation Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="display text-2xl leading-tight text-fg sm:text-3xl">Activity</h1>
          <p className="mt-1 text-xs text-fg2 sm:text-sm">
            Central logbook across 100 independently managed repositories · On-demand sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="s"
            icon={<CheckCheck size={14} strokeWidth={1.5} className="text-ship" />}
            disabled={unreadCount === 0 || isMarkingAll}
            loading={isMarkingAll}
            onClick={() => void handleMarkAllRead()}
          >
            Mark all as read
          </Button>
          <Button
            variant="primary"
            size="s"
            icon={
              <RefreshCw
                size={14}
                strokeWidth={1.5}
                className={isSyncing ? "anim-spin" : ""}
              />
            }
            disabled={isSyncing}
            aria-busy={isSyncing}
            onClick={() => void handleSync()}
          >
            {isSyncing ? "Syncing..." : "Sync Intelligence"}
          </Button>
        </div>
      </header>

      {/* Feedback & Error Banners */}
      {syncFeedback && (
        <div className="mb-4">
          {syncFeedback.type === "error" ? (
            <ErrorBanner
              action={
                <IconButton
                  label="Dismiss error"
                  size="s"
                  onClick={() => setSyncFeedback(null)}
                >
                  <X size={14} strokeWidth={1.5} />
                </IconButton>
              }
            >
              {syncFeedback.message}
            </ErrorBanner>
          ) : (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-panel border border-ship/40 bg-ship/10 px-3 py-2 text-xs text-fg"
            >
              <span>{syncFeedback.message}</span>
              <IconButton
                label="Dismiss status"
                size="s"
                onClick={() => setSyncFeedback(null)}
              >
                <X size={14} strokeWidth={1.5} />
              </IconButton>
            </div>
          )}
        </div>
      )}

      {loadError && (
        <div className="mb-4">
          <ErrorBanner
            action={
              <Button size="s" onClick={() => void fetchFeedPage(pagination.page)}>
                Retry
              </Button>
            }
          >
            {loadError}
          </ErrorBanner>
        </div>
      )}

      {/* Main Split-Pane Logbook + Detail Drawer */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="min-w-0 rounded-panel border border-line bg-surface"
          aria-label="Activity events feed"
        >
          <Tabs
            label="Event type filter"
            scroll
            className="px-2"
            value={tab}
            onChange={(nextTab) => setTab(nextTab)}
            tabs={[
              { id: "all", label: "All", count: pagination.total },
              {
                id: "unread",
                label: "Unread",
                count: unreadCount > 0 ? unreadCount : null,
              },
              { id: "deployment", label: "Deployments" },
              { id: "ci", label: "CI/CD" },
              { id: "repository", label: "Repository" },
              { id: "workspace", label: "Workspace" },
            ]}
          />

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
            <div className="relative min-w-[180px] flex-1 md:max-w-[280px]">
              <Search
                size={14}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg3"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events or projects..."
                aria-label="Search activity events"
                className="h-9 w-full rounded-ctl border border-edge bg-inset pl-8 pr-2 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40 md:h-8"
              />
            </div>

            <select
              aria-label="Filter by project"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-9 max-w-[190px] truncate rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none md:h-8"
            >
              <option value="all">All Projects (100)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.slug}>
                  #{String(p.number).padStart(3, "0")} {p.title}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by severity"
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value as ActivitySeverity | "all")
              }
              className="h-9 rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none md:h-8"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>

            <div className="hidden sm:block">
              <Segmented
                label="Date range"
                size="s"
                value={dateRange}
                onChange={setDateRange}
                options={[
                  { id: "any", label: "Any time" },
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7d" },
                  { id: "30d", label: "30d" },
                ]}
              />
            </div>

            {hasActiveFilters && (
              <Button size="s" variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            )}

            <span className="ml-auto hidden items-center gap-1.5 text-2xs text-fg3 lg:flex">
              <Kbds keys={["J"]} />
              <Kbds keys={["K"]} />
              <span>move</span>
              <Kbds keys={["E"]} />
              <span>read</span>
              <Kbds keys={["O"]} />
              <span>open</span>
            </span>
          </div>

          {/* Feed Rows */}
          <div ref={listRef}>
            {isLoading ? (
              <SkeletonRows rows={7} />
            ) : visibleEvents.length === 0 ? (
              <Empty
                title={
                  hasActiveFilters
                    ? "No events match the active filters."
                    : "No activity events recorded yet."
                }
                action={
                  hasActiveFilters ? (
                    <Button size="s" variant="secondary" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      size="s"
                      variant="primary"
                      loading={isSyncing}
                      onClick={() => void handleSync()}
                    >
                      Sync Intelligence
                    </Button>
                  )
                }
              >
                {hasActiveFilters
                  ? "Adjust your category, project, severity, or search terms to inspect persisted events."
                  : "Run on-demand intelligence sync to ingest GitHub Actions workflows, releases, and Vercel deployments."}
              </Empty>
            ) : (
              groupedEvents.map((group) => (
                <div key={group.day}>
                  <h2 className="sticky top-12 z-10 border-b border-line bg-surface/95 px-4 py-1.5 text-2xs font-semibold uppercase tracking-wider text-fg3 backdrop-blur-sm">
                    {group.day}
                  </h2>
                  <div className="py-0.5">
                    {group.items.map((ev, idx) => {
                      const isUnread = !ev.isRead;
                      const isSelected = selectedEvent?.id === ev.id;
                      const isExpanded = expandedId === ev.id;
                      const isLast = idx === group.items.length - 1;
                      const dotColor = SEVERITY_DOT_COLOR[ev.severity];
                      const metaEntries = formatMetadataEntries(ev.metadata);

                      return (
                        <div
                          key={ev.id}
                          data-event={ev.id}
                          className={cx(
                            "group relative grid grid-cols-[24px_1fr] gap-x-2 pr-3 transition-colors duration-[120ms]",
                            isSelected
                              ? "bg-elevated"
                              : "hover:bg-[color-mix(in_srgb,var(--bg-elevated)_50%,transparent)]",
                          )}
                        >
                          {isSelected && (
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 w-0.5 bg-sodium"
                            />
                          )}

                          {/* Vertical Severity Rail */}
                          <div className="relative flex justify-center" aria-hidden>
                            <span
                              className={cx(
                                "absolute top-0 w-px bg-edge",
                                isLast ? "h-5" : "bottom-0",
                              )}
                            />
                            <span
                              className="relative mt-[15px] h-2.5 w-2.5 rounded-[1px]"
                              style={
                                isUnread
                                  ? { background: dotColor }
                                  : {
                                      background: "var(--bg-surface)",
                                      boxShadow: `inset 0 0 0 1.5px ${dotColor}`,
                                    }
                              }
                            />
                          </div>

                          {/* Event Row Body */}
                          <div className="min-w-0 py-2.5">
                            <div className="flex items-start gap-2">
                              <span className="mt-[3px] shrink-0">
                                {getCategoryIcon(ev.category)}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectEvent(ev, true)}
                                    className={cx(
                                      "text-left text-sm outline-none hover:text-sodium-text focus-visible:underline",
                                      isUnread
                                        ? "font-semibold text-fg"
                                        : "font-medium text-fg2",
                                    )}
                                  >
                                    {ev.title}
                                    {isUnread && (
                                      <span className="sr-only"> (unread)</span>
                                    )}
                                  </button>

                                  <Link
                                    href={`/projects/${ev.projectSlug}`}
                                    className="truncate text-xs text-fg2 hover:text-fg hover:underline"
                                  >
                                    <span className="tnum font-mono font-semibold text-fg">
                                      #{String(ev.projectNumber).padStart(3, "0")}
                                    </span>{" "}
                                    {ev.projectTitle}
                                  </Link>
                                </div>

                                {ev.description && (
                                  <p className="mt-0.5 truncate text-xs text-fg2">
                                    {ev.description}
                                  </p>
                                )}

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <SeverityTag s={toRedesignSeverity(ev.severity)} />
                                  <Time
                                    rel={formatRelativeTime(ev.createdAt)}
                                    abs={formatAbsoluteTime(ev.createdAt)}
                                  />
                                  <span className="font-mono text-2xs uppercase text-fg3">
                                    {ev.sourceProvider}
                                  </span>
                                  {isUnread && (
                                    <span className="rounded-cell bg-sodium/15 px-1.5 py-px font-mono text-[10px] font-semibold text-sodium-text">
                                      UNREAD
                                    </span>
                                  )}
                                </div>

                                {isExpanded && metaEntries.length > 0 && (
                                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-ctl border border-line bg-inset p-2.5 text-xs">
                                    {metaEntries.map(([k, v]) => (
                                      <React.Fragment key={k}>
                                        <dt className="font-mono text-fg3">{k}</dt>
                                        <dd className="truncate font-mono text-fg">
                                          {v}
                                        </dd>
                                      </React.Fragment>
                                    ))}
                                  </dl>
                                )}
                              </div>

                              {/* Row Controls */}
                              <div className="flex shrink-0 items-center gap-0.5">
                                {metaEntries.length > 0 && (
                                  <IconButton
                                    label={
                                      isExpanded ? "Collapse metadata" : "Expand metadata"
                                    }
                                    size="s"
                                    aria-expanded={isExpanded}
                                    onClick={() =>
                                      setExpandedId(isExpanded ? null : ev.id)
                                    }
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={14} strokeWidth={1.5} />
                                    ) : (
                                      <ChevronRight size={14} strokeWidth={1.5} />
                                    )}
                                  </IconButton>
                                )}

                                <IconButton
                                  label={isUnread ? "Mark as read" : "Mark as unread"}
                                  size="s"
                                  onClick={() => void handleToggleRead(ev)}
                                >
                                  {isUnread ? (
                                    <Check
                                      size={14}
                                      strokeWidth={1.5}
                                      className="text-sodium-text"
                                    />
                                  ) : (
                                    <Bell size={14} strokeWidth={1.5} />
                                  )}
                                </IconButton>

                                {ev.actionUrl && (
                                  <a
                                    href={ev.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open external link for ${ev.title}`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-ctl text-fg3 transition-colors hover:bg-elevated hover:text-fg"
                                  >
                                    <ArrowUpRight size={14} strokeWidth={1.5} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {!isLoading && pagination.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-fg2">
              <span className="tnum font-mono text-2xs">
                Showing {startRow}–{endRow} of {pagination.total} events
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="s"
                  variant="ghost"
                  disabled={pagination.page <= 1 || isLoading}
                  icon={<ChevronLeft size={14} strokeWidth={1.5} />}
                  onClick={() => void fetchFeedPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="tnum px-1.5 font-mono text-2xs text-fg3">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="s"
                  variant="ghost"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => void fetchFeedPage(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={14} strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Desktop Sticky Event Inspector */}
        <aside
          className="hidden h-fit max-h-[calc(100dvh-80px)] overflow-y-auto rounded-panel border border-line bg-surface xl:sticky xl:top-16 xl:block"
          aria-label="Event detail"
        >
          {selectedEvent ? (
            <EventDetailInspector
              event={selectedEvent}
              related={relatedEvents}
              onToggleRead={(ev) => void handleToggleRead(ev)}
              onSelectRelated={(ev) => handleSelectEvent(ev, false)}
            />
          ) : (
            <Empty title="Select an event to inspect details.">
              Use J and K keys or click any logbook entry to inspect metadata and
              workspace context.
            </Empty>
          )}
        </aside>
      </div>

      {/* Tablet / Mobile Detail Drawer */}
      <Sheet
        open={drawerOpen && Boolean(selectedEvent)}
        onClose={() => setDrawerOpen(false)}
        side="right"
        title={selectedEvent?.title ?? "Event detail"}
      >
        {selectedEvent && (
          <EventDetailInspector
            event={selectedEvent}
            related={relatedEvents}
            onToggleRead={(ev) => void handleToggleRead(ev)}
            onSelectRelated={(ev) => handleSelectEvent(ev, false)}
          />
        )}
      </Sheet>
    </div>
  );
}

function EventDetailInspector({
  event,
  related,
  onToggleRead,
  onSelectRelated,
}: {
  event: ActivityEvent;
  related: ActivityEvent[];
  onToggleRead: (ev: ActivityEvent) => void;
  onSelectRelated: (ev: ActivityEvent) => void;
}) {
  const metaEntries = formatMetadataEntries(event.metadata);
  const isUnread = !event.isRead;

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SeverityTag s={toRedesignSeverity(event.severity)} />
        <span className="text-2xs text-fg3">{CATEGORY_LABEL[event.category]}</span>
        {isUnread && (
          <span className="rounded-cell bg-sodium/15 px-1.5 py-px font-mono text-[10px] font-semibold text-sodium-text">
            Unread
          </span>
        )}
      </div>

      <h2 className="text-base font-semibold text-fg leading-snug">{event.title}</h2>

      <Link
        href={`/projects/${event.projectSlug}`}
        className="mt-2 inline-flex items-center gap-2 rounded-ctl border border-line bg-inset px-2.5 py-1.5 text-xs text-fg2 hover:border-edge hover:text-fg"
      >
        <span className="font-mono font-semibold text-fg">
          #{String(event.projectNumber).padStart(3, "0")}
        </span>
        <span className="truncate">{event.projectTitle}</span>
        <ArrowUpRight size={12} strokeWidth={1.5} className="text-fg3" />
      </Link>

      {event.description && (
        <p className="mt-3 text-sm leading-relaxed text-fg2">{event.description}</p>
      )}

      <dl className="mt-4 grid grid-cols-[96px_1fr] gap-y-1.5 rounded-ctl border border-line bg-inset p-3 text-xs">
        <dt className="text-fg3">Recorded</dt>
        <dd className="text-fg">
          {formatRelativeTime(event.createdAt)}{" "}
          <span className="text-fg3">· {formatAbsoluteTime(event.createdAt)}</span>
        </dd>
        <dt className="text-fg3">Provider</dt>
        <dd className="font-mono uppercase text-fg">{event.sourceProvider}</dd>
        <dt className="text-fg3">Event type</dt>
        <dd className="truncate font-mono text-fg">{event.type}</dd>
        {metaEntries.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="truncate text-fg3">{k}</dt>
            <dd className="truncate font-mono text-fg">{v}</dd>
          </React.Fragment>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/projects/${event.projectSlug}`}>
          <Button size="s" variant="secondary">
            Open workspace
          </Button>
        </Link>

        {event.actionUrl && (
          <a
            href={event.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              size="s"
              variant="primary"
              icon={<ArrowUpRight size={14} strokeWidth={1.5} />}
            >
              Open in {event.sourceProvider}
            </Button>
          </a>
        )}

        <Button size="s" variant="ghost" onClick={() => onToggleRead(event)}>
          {isUnread ? "Mark as read" : "Mark as unread"}
        </Button>
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-fg3">
        Related events for #{String(event.projectNumber).padStart(3, "0")}
      </h3>
      {related.length > 0 ? (
        <ul className="divide-y divide-line">
          {related.map((relEv) => (
            <li key={relEv.id}>
              <button
                type="button"
                onClick={() => onSelectRelated(relEv)}
                className="flex min-h-10 w-full items-center gap-2 py-2 text-left text-xs text-fg2 hover:text-fg"
              >
                <SeverityGlyph s={toRedesignSeverity(relEv.severity)} size={13} />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">
                  {relEv.title}
                </span>
                <span className="shrink-0 font-mono text-2xs text-fg3">
                  {formatRelativeTime(relEv.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg3">
          No other events loaded for this project in the current page.
        </p>
      )}
    </div>
  );
}
