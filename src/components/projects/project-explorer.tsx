"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderGit2,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
} from "lucide-react";

import { ProjectCard } from "@/components/projects/project-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { getVerificationMeta } from "@/config/workflow";
import {
  cn,
  getDifficultyBgColor,
  getDifficultyColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { DIFFICULTIES, PROJECT_STATUSES, VERIFICATION_STATUSES } from "@/lib/validations";
import type { Difficulty, Project } from "@/types/project";

type SortOption =
  "number" | "number-desc" | "title" | "difficulty" | "completion" | "recent";

interface InitialExplorerFilters {
  search?: string;
  difficulty?: string;
  category?: string;
  technology?: string;
  status?: string;
  verification?: string;
  bookmarked?: boolean;
  includePlaceholders?: boolean;
  sort?: SortOption;
  view?: "grid" | "list";
}

interface ProjectExplorerProps {
  initialProjects: Project[];
  initialFilters?: InitialExplorerFilters;
  lockDifficulty?: Difficulty;
  showDifficultyFilter?: boolean;
}

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const SELECT_CLASSES =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProjectExplorer({
  initialProjects,
  initialFilters,
  lockDifficulty,
  showDifficultyFilter = true,
}: ProjectExplorerProps) {
  const [bookmarkOverrides, setBookmarkOverrides] = React.useState<
    Record<string, boolean>
  >({});
  const projects = React.useMemo(
    () =>
      initialProjects.map((item) =>
        bookmarkOverrides[item.id] !== undefined
          ? { ...item, bookmarked: bookmarkOverrides[item.id] }
          : item,
      ),
    [initialProjects, bookmarkOverrides],
  );
  const [search, setSearch] = React.useState(initialFilters?.search ?? "");
  const [difficulty, setDifficulty] = React.useState(
    lockDifficulty ?? initialFilters?.difficulty ?? "all",
  );
  const [category, setCategory] = React.useState(initialFilters?.category ?? "all");
  const [technology, setTechnology] = React.useState(initialFilters?.technology ?? "all");
  const [status, setStatus] = React.useState(initialFilters?.status ?? "all");
  const [verification, setVerification] = React.useState(
    initialFilters?.verification ?? "all",
  );
  const [bookmarkedOnly, setBookmarkedOnly] = React.useState(
    initialFilters?.bookmarked ?? false,
  );
  const [includePlaceholders, setIncludePlaceholders] = React.useState(
    initialFilters?.includePlaceholders ?? true,
  );
  const [sort, setSort] = React.useState<SortOption>(initialFilters?.sort ?? "number");
  const [view, setView] = React.useState<"grid" | "list">(initialFilters?.view ?? "grid");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(24);
  const [titleAsc, setTitleAsc] = React.useState(true);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const technologies = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      for (const tech of p.technologies) {
        set.add(tech);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const numQuery = q.replace(/^#/, "");

    const matched = projects.filter((project) => {
      if (!includePlaceholders && project.isPlaceholder) return false;
      if (difficulty !== "all" && project.difficulty !== difficulty) return false;
      if (
        category !== "all" &&
        project.category.toLowerCase() !== category.toLowerCase()
      ) {
        return false;
      }
      if (
        technology !== "all" &&
        !project.technologies.some((t) => t.toLowerCase() === technology.toLowerCase())
      ) {
        return false;
      }
      if (status !== "all" && project.status !== status) return false;
      if (verification !== "all" && project.verificationStatus !== verification) {
        return false;
      }
      if (bookmarkedOnly && !project.bookmarked) return false;
      if (q) {
        if (String(project.number) === numQuery) return true;
        const haystack = [
          project.title,
          project.slug,
          project.description,
          project.category,
          project.originalRepoUrl ?? "",
          ...project.technologies,
          ...project.recommendedStack,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      switch (sort) {
        case "number-desc":
          return b.number - a.number;
        case "title":
          return titleAsc
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        case "difficulty":
          return (
            DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
            a.number - b.number
          );
        case "completion":
          return (
            (b.completionPercentage ?? 0) - (a.completionPercentage ?? 0) ||
            a.number - b.number
          );
        case "recent":
          return (
            (b.lastAccessedAt ?? "").localeCompare(a.lastAccessedAt ?? "") ||
            a.number - b.number
          );
        case "number":
        default:
          return a.number - b.number;
      }
    });
  }, [
    projects,
    search,
    difficulty,
    category,
    technology,
    status,
    verification,
    bookmarkedOnly,
    includePlaceholders,
    sort,
    titleAsc,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProjects = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, safePage, pageSize]);

  const resetFilters = () => {
    setSearch("");
    setDifficulty(lockDifficulty ?? "all");
    setCategory("all");
    setTechnology("all");
    setStatus("all");
    setVerification("all");
    setBookmarkedOnly(false);
    setIncludePlaceholders(true);
    setSort("number");
    setTitleAsc(true);
    setPage(1);
  };

  const handleBookmarkToggled = (projectId: string, nextValue: boolean) => {
    setBookmarkOverrides((prev) => ({
      ...prev,
      [projectId]: nextValue,
    }));
  };

  const toggleNumberSort = () => {
    setSort((prev) => (prev === "number" ? "number-desc" : "number"));
    setPage(1);
  };

  const toggleTitleSort = () => {
    if (sort === "title") {
      setTitleAsc((prev) => !prev);
    } else {
      setSort("title");
      setTitleAsc(true);
    }
    setPage(1);
  };

  const hasActiveFilter =
    search.trim() !== "" ||
    (!lockDifficulty && difficulty !== "all") ||
    category !== "all" ||
    technology !== "all" ||
    status !== "all" ||
    verification !== "all" ||
    bookmarkedOnly ||
    !includePlaceholders ||
    sort !== "number";

  return (
    <div className="space-y-6">
      <search aria-label="Filter and sort projects">
        <div className="space-y-4 rounded-xl border border-border/80 bg-card/90 p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="explorer-search"
                className="text-xs font-medium text-muted-foreground"
              >
                Search by number (#1–#100), title, category, or stack
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="explorer-search"
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search e.g. #24, Next.js, Stripe, Chat, Video..."
                  spellCheck={false}
                  enterKeyHint="search"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-lg border border-border bg-background/70 p-0.5"
                role="group"
                aria-label="Project layout view"
              >
                <button
                  type="button"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                    view === "grid"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="size-3.5" aria-hidden="true" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                    view === "list"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="size-3.5" aria-hidden="true" />
                  <span>List</span>
                </button>
              </div>

              {hasActiveFilter ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Reset filters</span>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {showDifficultyFilter ? (
              <div className="space-y-1">
                <Label
                  htmlFor="filter-difficulty"
                  className="text-xs text-muted-foreground"
                >
                  Difficulty
                </Label>
                <select
                  id="filter-difficulty"
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    setPage(1);
                  }}
                  className={SELECT_CLASSES}
                >
                  <option value="all">All difficulties</option>
                  {DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="filter-category" className="text-xs text-muted-foreground">
                Category
              </Label>
              <select
                id="filter-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className={SELECT_CLASSES}
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="filter-technology"
                className="text-xs text-muted-foreground"
              >
                Technology
              </Label>
              <select
                id="filter-technology"
                value={technology}
                onChange={(e) => {
                  setTechnology(e.target.value);
                  setPage(1);
                }}
                className={SELECT_CLASSES}
              >
                <option value="all">All technologies</option>
                {technologies.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-status" className="text-xs text-muted-foreground">
                Status
              </Label>
              <select
                id="filter-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className={SELECT_CLASSES}
              >
                <option value="all">All statuses</option>
                {PROJECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {getStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-sort" className="text-xs text-muted-foreground">
                Sort Order
              </Label>
              <select
                id="filter-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortOption);
                  setPage(1);
                }}
                className={SELECT_CLASSES}
              >
                <option value="number">Strict Order (1 → 100)</option>
                <option value="number-desc">Reverse Order (100 → 1)</option>
                <option value="title">Title (A → Z)</option>
                <option value="difficulty">Difficulty Tier</option>
                <option value="completion">Completion %</option>
                <option value="recent">Recently Accessed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-5">
              <div className="space-y-1">
                <Label htmlFor="filter-verification" className="sr-only">
                  Verification Status
                </Label>
                <select
                  id="filter-verification"
                  aria-label="Verification status"
                  value={verification}
                  onChange={(e) => {
                    setVerification(e.target.value);
                    setPage(1);
                  }}
                  className={cn(SELECT_CLASSES, "h-8 w-auto text-xs")}
                >
                  <option value="all">All verification states</option>
                  {VERIFICATION_STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {getVerificationMeta(v).label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={bookmarkedOnly}
                  onCheckedChange={(checked) => {
                    setBookmarkedOnly(checked);
                    setPage(1);
                  }}
                />
                <span className="inline-flex items-center gap-1">
                  <Bookmark className="size-3.5" aria-hidden="true" />
                  Bookmarked only
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={includePlaceholders}
                  onCheckedChange={(checked) => {
                    setIncludePlaceholders(checked);
                    setPage(1);
                  }}
                />
                <span>Include 27 reserved slots</span>
              </label>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div role="status" aria-live="polite" className="font-mono">
                Showing {paginatedProjects.length} of {filteredProjects.length} matching
                projects
              </div>
              <select
                aria-label="Results per page"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={cn(SELECT_CLASSES, "h-8 w-auto text-xs")}
              >
                <option value="24">24 / page</option>
                <option value="50">50 / page</option>
                <option value="100">All 100</option>
              </select>
            </div>
          </div>
        </div>
      </search>

      {paginatedProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
          <p className="text-base font-medium text-foreground">
            No projects match the current filter combination.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear filters or enable reserved placeholders to restore all 100 positions.
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
            Reset all filters
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onBookmarkToggled={handleBookmarkToggled}
            />
          ))}
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="explorer-table-caption"
          className="overflow-x-auto rounded-xl border border-border/80 bg-card/95"
        >
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <caption id="explorer-table-caption" className="sr-only">
              Canonical 100-project software engineering collection
            </caption>
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th
                  scope="col"
                  aria-sort={
                    sort === "number"
                      ? "ascending"
                      : sort === "number-desc"
                        ? "descending"
                        : undefined
                  }
                  className="p-0"
                >
                  <button
                    type="button"
                    onClick={toggleNumberSort}
                    className="inline-flex h-10 w-full items-center gap-1.5 px-4 font-semibold hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span>#</span>
                    {sort === "number" ? (
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    ) : sort === "number-desc" ? (
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                    )}
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sort === "title" ? (titleAsc ? "ascending" : "descending") : undefined
                  }
                  className="p-0"
                >
                  <button
                    type="button"
                    onClick={toggleTitleSort}
                    className="inline-flex h-10 w-full items-center gap-1.5 px-4 font-semibold hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span>Project</span>
                    {sort === "title" ? (
                      titleAsc ? (
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Difficulty
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Stack
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Completion
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {paginatedProjects.map((project) => {
                const repoHref =
                  project.verifiedRepoUrl ?? project.originalRepoUrl?.trim() ?? null;
                return (
                  <tr
                    key={project.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      project.isPlaceholder && "opacity-80",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      #{String(project.number).padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${project.slug}`}
                        className="font-medium text-foreground hover:text-violet-400"
                      >
                        {project.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{project.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] capitalize",
                          getDifficultyBgColor(project.difficulty),
                          getDifficultyColor(project.difficulty),
                        )}
                      >
                        {project.difficulty}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="rounded border border-border/70 bg-background/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[11px]", getStatusColor(project.status))}
                      >
                        {getStatusLabel(project.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={project.completionPercentage ?? 0}
                          className="w-16"
                          aria-label={`${project.title} completion`}
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          {project.completionPercentage ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {repoHref ? (
                          <a
                            href={repoHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open GitHub repository for ${project.title}`}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <FolderGit2 className="size-3.5" aria-hidden="true" />
                            <ExternalLink className="sr-only" />
                          </a>
                        ) : null}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs"
                          render={<Link href={`/projects/${project.slug}`} />}
                        >
                          Workspace
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Project collection pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4"
        >
          <p className="font-mono text-xs text-muted-foreground">
            Page {safePage} of {totalPages} ({filteredProjects.length} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span>Previous</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1"
            >
              <span>Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
