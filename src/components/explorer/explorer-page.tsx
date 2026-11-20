"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ExplorerToolbar,
  EMPTY_FILTERS,
  type ExplorerFilters,
  type ExplorerViewMode,
} from "./explorer-toolbar";
import { FieldView } from "./field-view";
import { PlatesView } from "./plates-view";
import { ListView } from "./list-view";
import { projectToCellPhase } from "@/components/redesign/Hundred";
import type { Difficulty, Project } from "@/types/project";
import type { Health, Phase } from "@/components/redesign/types";

export interface ExplorerPageProps {
  initialProjects: Project[];
  initialView?: ExplorerViewMode;
  initialFilters?: Partial<ExplorerFilters>;
  lockDifficulty?: Difficulty;
  lockCategory?: string;
}

export function ExplorerPage({
  initialProjects,
  initialView = "field",
  initialFilters,
  lockDifficulty,
  lockCategory,
}: ExplorerPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-driven view state
  const paramView = searchParams.get("view") as ExplorerViewMode | null;
  const validParamView =
    paramView === "plates" || paramView === "list" || paramView === "field"
      ? paramView
      : null;

  const [viewState, setViewState] = useState<{
    view: ExplorerViewMode;
    prevParam: string | null;
  }>({
    view: validParamView ?? initialView,
    prevParam: paramView,
  });

  if (paramView !== viewState.prevParam) {
    setViewState({
      view: validParamView ?? initialView,
      prevParam: paramView,
    });
  }

  const view = viewState.view;
  const setView = (v: ExplorerViewMode) => {
    setViewState((prev) => ({ ...prev, view: v }));
  };

  // Search query
  const paramQuery = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(paramQuery);

  // Filters
  const [filters, setFilters] = useState<ExplorerFilters>(() => {
    const pCat = searchParams.get("category");
    const pPhase = searchParams.get("phase");
    const pDiff = searchParams.get("difficulty");
    const pTech = searchParams.get("tech") ?? searchParams.get("technology");

    return {
      phase: pPhase ? [pPhase as Phase] : (initialFilters?.phase ?? []),
      category: lockCategory
        ? [lockCategory]
        : pCat
          ? [pCat]
          : (initialFilters?.category ?? []),
      difficulty: lockDifficulty
        ? [lockDifficulty]
        : pDiff
          ? [pDiff as Difficulty]
          : (initialFilters?.difficulty ?? []),
      tech: pTech ? [pTech] : (initialFilters?.tech ?? []),
      health: initialFilters?.health ?? [],
      pinned: initialFilters?.pinned ?? false,
    };
  });

  // Projects state for optimistic bookmarking
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Optimistic pin toggle
  const handleTogglePin = useCallback(async (p: Project) => {
    const nextBookmarked = !p.bookmarked;

    setProjects((prev) =>
      prev.map((item) =>
        item.number === p.number ? { ...item, bookmarked: nextBookmarked } : item,
      ),
    );

    try {
      await fetch(`/api/projects/${p.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: nextBookmarked }),
      });
    } catch {
      setProjects((prev) =>
        prev.map((item) =>
          item.number === p.number ? { ...item, bookmarked: !nextBookmarked } : item,
        ),
      );
    }
  }, []);

  // URL synchronization
  const updateUrl = useCallback(
    (nextView: ExplorerViewMode, nextQ: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (nextView) sp.set("view", nextView);
      if (nextQ.trim()) sp.set("q", nextQ.trim());
      else {
        sp.delete("q");
        sp.delete("search");
      }
      const qs = sp.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleViewChange = (v: ExplorerViewMode) => {
    setView(v);
    updateUrl(v, searchQuery);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateUrl(view, q);
  };

  const handleJumpToProject = (slug: string) => {
    router.push(`/projects/${slug}`);
  };

  // Filter and search matching logic
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isNum = /^\d{1,3}$/.test(q);
    const numVal = isNum ? parseInt(q, 10) : null;

    return projects.filter((p) => {
      // Locked filters (e.g. within learning tracks or categories)
      if (lockDifficulty && p.difficulty !== lockDifficulty) return false;
      if (lockCategory && p.category !== lockCategory) return false;

      // Filter: Phase
      if (filters.phase.length > 0) {
        const ph = projectToCellPhase(p);
        if (!filters.phase.includes(ph as Phase)) return false;
      }

      // Filter: Category
      if (!lockCategory && filters.category.length > 0) {
        if (!filters.category.includes(p.category)) return false;
      }

      // Filter: Difficulty / Complexity
      if (!lockDifficulty && filters.difficulty.length > 0) {
        if (!filters.difficulty.includes(p.difficulty)) return false;
      }

      // Filter: Technology
      if (filters.tech.length > 0) {
        const hasTech = filters.tech.some((t) => p.technologies?.includes(t));
        if (!hasTech) return false;
      }

      // Filter: Health
      if (filters.health.length > 0) {
        const s = p.repositoryMetadata?.health?.status;
        let h: Health = "unknown";
        if (s === "healthy") h = "good";
        else if (s === "needs-review" || s === "stale") h = "fair";
        else if (s === "unavailable") h = "poor";
        if (!filters.health.includes(h)) return false;
      }

      // Filter: Pinned
      if (filters.pinned && !p.bookmarked) {
        return false;
      }

      // Search matching
      if (q) {
        // Direct number match: "31" or "031"
        const padNum = String(p.number).padStart(3, "0");
        if (numVal !== null && p.number === numVal) return true;
        if (padNum.includes(q) || String(p.number).includes(q)) return true;

        // Title and description match
        if (p.title.toLowerCase().includes(q)) return true;
        if (p.description.toLowerCase().includes(q)) return true;
        if (p.category.toLowerCase().includes(q)) return true;

        // Technologies match
        if (p.technologies?.some((t) => t.toLowerCase().includes(q))) return true;

        return false;
      }

      return true;
    });
  }, [projects, searchQuery, filters, lockDifficulty, lockCategory]);

  const activeFilterCount =
    filters.phase.length +
    (lockCategory ? 0 : filters.category.length) +
    (lockDifficulty ? 0 : filters.difficulty.length) +
    filters.tech.length +
    filters.health.length +
    (filters.pinned ? 1 : 0);

  const isFiltered = activeFilterCount > 0 || searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setFilters({
      ...EMPTY_FILTERS,
      difficulty: lockDifficulty ? [lockDifficulty] : [],
      category: lockCategory ? [lockCategory] : [],
    });
    setSearchQuery("");
    updateUrl(view, "");
  };

  return (
    <div className="space-y-6">
      {/* Search, Filter Toolbar & View Segmented Switcher */}
      <ExplorerToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={handleViewChange}
        allProjects={projects}
        matchingCount={filteredProjects.length}
        onJumpToProject={handleJumpToProject}
        lockDifficulty={lockDifficulty}
        lockCategory={lockCategory}
      />

      {/* Active Presentation Mode */}
      {view === "field" ? (
        <FieldView
          allProjects={projects}
          matchingProjects={filteredProjects}
          isFiltered={isFiltered}
          onClearFilters={handleClearFilters}
        />
      ) : view === "plates" ? (
        <PlatesView
          projects={filteredProjects}
          onTogglePin={handleTogglePin}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <ListView
          projects={filteredProjects}
          searchQuery={searchQuery}
          onClearFilters={handleClearFilters}
        />
      )}
    </div>
  );
}
