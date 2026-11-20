"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Search,
  Grid3x3,
  LayoutGrid,
  Rows3,
  ChevronDown,
  SlidersHorizontal,
  X,
  Pin,
} from "lucide-react";
import { PhaseGlyph } from "@/components/redesign/glyphs";
import {
  Button,
  Checkbox,
  FilterChip,
  Popover,
  Segmented,
  Sheet,
  cx,
  Kbd,
} from "@/components/redesign/ui";
import {
  CATEGORIES,
  PHASES,
  PHASE_LABEL,
  HEALTH_LABEL,
  type Phase,
  type Health,
  type CellPhase,
} from "@/components/redesign/types";
import type { Difficulty, Project } from "@/types/project";

export type ExplorerViewMode = "field" | "plates" | "list";

export interface ExplorerFilters {
  phase: Phase[];
  category: string[];
  difficulty: Difficulty[];
  tech: string[];
  health: Health[];
  pinned: boolean;
}

export const EMPTY_FILTERS: ExplorerFilters = {
  phase: [],
  category: [],
  difficulty: [],
  tech: [],
  health: [],
  pinned: false,
};

interface Opt {
  value: string;
  label: string;
  count: number;
  icon?: ReactNode;
}

function FilterDropdown({
  label,
  selected,
  options,
  isOn,
  onToggle,
  searchable,
}: {
  label: string;
  selected: number;
  options: Opt[];
  isOn: (v: string) => boolean;
  onToggle: (v: string) => void;
  searchable?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search, searchable]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 rounded-ctl border px-2.5 text-xs font-medium transition-colors select-none",
          selected > 0
            ? "border-sodium/70 bg-elevated text-fg"
            : "border-edge text-fg2 hover:bg-elevated hover:text-fg",
        )}
      >
        {label}
        {selected > 0 && (
          <span className="font-mono rounded-cell bg-sodium px-1 text-[11px] font-semibold leading-4 text-on-sodium">
            {selected}
          </span>
        )}
        <ChevronDown size={13} strokeWidth={1.5} className="text-fg3" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} width={260}>
        {searchable && options.length > 6 && (
          <div className="p-1">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${label.toLowerCase()}...`}
              className="h-8 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
            />
          </div>
        )}
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="max-h-60 overflow-y-auto p-1"
        >
          {shown.map((o) => (
            <div
              key={o.value}
              className="flex h-8 items-center justify-between gap-2 rounded-ctl px-2 hover:bg-base"
            >
              <Checkbox
                checked={isOn(o.value)}
                onChange={() => onToggle(o.value)}
                label={
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg">
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </span>
                }
              />
              <span className="font-mono text-2xs text-fg3">{o.count}</span>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-fg3">No options match.</p>
          )}
        </div>
      </Popover>
    </>
  );
}

export function ExplorerToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  allProjects,
  matchingCount,
  onJumpToProject,
  lockDifficulty,
  lockCategory,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: ExplorerFilters;
  onFiltersChange: (f: ExplorerFilters) => void;
  view: ExplorerViewMode;
  onViewChange: (v: ExplorerViewMode) => void;
  allProjects: Project[];
  matchingCount: number;
  onJumpToProject: (slug: string) => void;
  lockDifficulty?: Difficulty;
  lockCategory?: string;
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const cleanQuery = searchQuery.trim();

  // Suggestions
  const suggestions = useMemo(() => {
    if (!cleanQuery) return { projects: [], techs: [], categories: [], isNum: false };
    const q = cleanQuery.toLowerCase();
    const isNum = /^\d{1,3}$/.test(q) && Number(q) >= 1 && Number(q) <= 100;

    const matchedProjects = allProjects
      .filter((p) => {
        const padNum = String(p.number).padStart(3, "0");
        return (
          padNum.includes(q) ||
          String(p.number) === q ||
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
        );
      })
      .slice(0, 4);

    const allTechs = Array.from(
      new Set(allProjects.flatMap((p) => p.technologies || [])),
    );
    const matchedTechs = allTechs.filter((t) => t.toLowerCase().includes(q)).slice(0, 3);

    const matchedCats = CATEGORIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 3);

    return {
      projects: matchedProjects,
      techs: matchedTechs,
      categories: matchedCats,
      isNum,
    };
  }, [cleanQuery, allProjects]);

  // Dynamic filter options with counts
  const filterGroups = useMemo(() => {
    const countPhase = (ph: Phase) =>
      allProjects.filter((p) => {
        if (p.isPlaceholder) return false;
        if (p.verificationStatus === "archived") return false;
        if (
          p.repositoryMetadata?.latestWorkflowRun?.conclusion === "failure" ||
          p.repositoryMetadata?.health?.status === "unavailable"
        ) {
          return ph === "breaking";
        }
        if (p.status === "completed") return ph === "shipped";
        if (p.status === "in-development" || p.status === "testing")
          return ph === "building";
        if (p.status === "analyzing" || p.status === "planning")
          return ph === "rebuilding";
        return ph === "exploring";
      }).length;

    const countCat = (cat: string) =>
      allProjects.filter((p) => p.category === cat).length;

    const countDiff = (d: Difficulty) =>
      allProjects.filter((p) => p.difficulty === d).length;

    const countHealth = (h: Health) =>
      allProjects.filter((p) => {
        const s = p.repositoryMetadata?.health?.status;
        if (h === "good") return s === "healthy";
        if (h === "fair") return s === "needs-review" || s === "stale";
        if (h === "poor") return s === "unavailable";
        return !s;
      }).length;

    const techFrequency: Record<string, number> = {};
    for (const p of allProjects) {
      for (const t of p.technologies || []) {
        techFrequency[t] = (techFrequency[t] || 0) + 1;
      }
    }
    const techOptions: Opt[] = Object.entries(techFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([tech, count]) => ({ value: tech, label: tech, count }));

    return {
      phase: PHASES.map((p) => ({
        value: p,
        label: PHASE_LABEL[p as CellPhase],
        count: countPhase(p),
        icon: <PhaseGlyph phase={p} size={12} />,
      })),
      category: CATEGORIES.map((c) => ({
        value: c,
        label: c,
        count: countCat(c),
      })),
      difficulty: (["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => ({
        value: d,
        label: d.charAt(0).toUpperCase() + d.slice(1),
        count: countDiff(d),
      })),
      tech: techOptions,
      health: (["good", "fair", "poor", "unknown"] as Health[]).map((h) => ({
        value: h,
        label: HEALTH_LABEL[h],
        count: countHealth(h),
      })),
    };
  }, [allProjects]);

  const pinnedCount = useMemo(() => {
    return allProjects.filter((p) => p.bookmarked).length;
  }, [allProjects]);

  const activeFilterCount =
    filters.phase.length +
    filters.category.length +
    filters.difficulty.length +
    filters.tech.length +
    filters.health.length +
    (filters.pinned ? 1 : 0);

  const isFiltered = activeFilterCount > 0 || cleanQuery.length > 0;

  const toggleFilter = <K extends keyof Omit<ExplorerFilters, "pinned">>(
    key: K,
    value: ExplorerFilters[K][number],
  ) => {
    const list = filters[key] as string[];
    const next = list.includes(value as string)
      ? list.filter((v) => v !== value)
      : [...list, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  const clearAll = () => {
    onFiltersChange({
      phase: [],
      category: lockCategory ? [lockCategory] : [],
      difficulty: lockDifficulty ? [lockDifficulty] : [],
      tech: [],
      health: [],
      pinned: false,
    });
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Search and view toggle row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input with suggestions */}
        <div
          ref={searchContainerRef}
          className="relative min-w-[260px] flex-1 sm:max-w-md"
          onBlur={(e) => {
            if (!searchContainerRef.current?.contains(e.relatedTarget as Node)) {
              setSearchFocused(false);
            }
          }}
        >
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg3"
            aria-hidden
          />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cleanQuery) {
                if (suggestions.isNum && suggestions.projects.length > 0) {
                  onJumpToProject(suggestions.projects[0].slug);
                  setSearchFocused(false);
                }
              }
              if (e.key === "Escape") {
                setSearchFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search number (e.g. 031), title, or tech..."
            aria-label="Search projects by number, title, category or stack"
            role="combobox"
            aria-expanded={searchFocused}
            aria-controls="explorer-suggest-menu"
            className="h-9 w-full rounded-ctl border border-edge bg-inset pl-9 pr-9 text-xs text-fg placeholder:text-fg3 hover:border-border-default focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sodium/40"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search input"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-ctl text-fg3 hover:text-fg"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}

          {/* Quick Suggestions flyout */}
          {searchFocused && cleanQuery && (
            <div
              id="explorer-suggest-menu"
              className="anim-menu absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-panel border border-edge bg-elevated p-1 shadow-pop"
              role="listbox"
            >
              {suggestions.projects.length === 0 &&
              suggestions.techs.length === 0 &&
              suggestions.categories.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-fg3">
                  No matches for &ldquo;{cleanQuery}&rdquo;
                </p>
              ) : (
                <>
                  {suggestions.projects.length > 0 && (
                    <div className="p-1">
                      <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-fg3">
                        {suggestions.isNum ? "Jump to project" : "Projects"}
                      </p>
                      {suggestions.projects.map((p, idx) => (
                        <button
                          key={p.number}
                          type="button"
                          onClick={() => {
                            onJumpToProject(p.slug);
                            setSearchFocused(false);
                          }}
                          className="flex h-8 w-full items-center gap-2 rounded-ctl px-2 text-left text-xs text-fg hover:bg-base"
                        >
                          <span className="font-mono text-2xs text-sodium-text">
                            #{String(p.number).padStart(3, "0")}
                          </span>
                          <span className="truncate">{p.title}</span>
                          {suggestions.isNum && idx === 0 && (
                            <span className="ml-auto">
                              <Kbd>↵</Kbd>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {suggestions.techs.length > 0 && (
                    <div className="border-t border-line p-1">
                      <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-fg3">
                        Filter by tech
                      </p>
                      {suggestions.techs.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            toggleFilter("tech", t);
                            setSearchFocused(false);
                            onSearchChange("");
                          }}
                          className="flex h-7 w-full items-center justify-between rounded-ctl px-2 text-xs text-fg hover:bg-base"
                        >
                          <span>{t}</span>
                          <span className="text-2xs text-sodium-text">+ Add filter</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {suggestions.categories.length > 0 && (
                    <div className="border-t border-line p-1">
                      <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-fg3">
                        Filter by category
                      </p>
                      {suggestions.categories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            toggleFilter("category", c);
                            setSearchFocused(false);
                            onSearchChange("");
                          }}
                          className="flex h-7 w-full items-center justify-between rounded-ctl px-2 text-xs text-fg hover:bg-base"
                        >
                          <span>{c}</span>
                          <span className="text-2xs text-sodium-text">+ Add filter</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* View Switcher and counts */}
        <div className="flex items-center gap-2">
          <span className="font-mono hidden text-xs text-fg2 sm:inline-block">
            {isFiltered
              ? `Showing ${matchingCount} of ${allProjects.length}`
              : `${allProjects.length} projects`}
          </span>

          <Segmented<ExplorerViewMode>
            label="View presentation mode"
            value={view}
            onChange={onViewChange}
            options={[
              {
                id: "field",
                label: "Field",
                icon: <Grid3x3 size={14} strokeWidth={1.5} />,
              },
              {
                id: "plates",
                label: "Plates",
                icon: <LayoutGrid size={14} strokeWidth={1.5} />,
              },
              {
                id: "list",
                label: "List",
                icon: <Rows3 size={14} strokeWidth={1.5} />,
              },
            ]}
          />
        </div>
      </div>

      {/* Filter toolbar: Desktop Dropdowns & Mobile Sheet */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mobile Filter Button */}
        <div className="sm:hidden">
          <Button
            size="s"
            icon={<SlidersHorizontal size={14} strokeWidth={1.5} />}
            onClick={() => setMobileSheetOpen(true)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>

        {/* Desktop Filter Dropdowns */}
        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <FilterDropdown
            label="Phase"
            selected={filters.phase.length}
            options={filterGroups.phase}
            isOn={(v) => filters.phase.includes(v as Phase)}
            onToggle={(v) => toggleFilter("phase", v as Phase)}
          />

          {!lockCategory && (
            <FilterDropdown
              label="Category"
              selected={filters.category.length}
              options={filterGroups.category}
              isOn={(v) => filters.category.includes(v)}
              onToggle={(v) => toggleFilter("category", v)}
            />
          )}

          {!lockDifficulty && (
            <FilterDropdown
              label="Complexity"
              selected={filters.difficulty.length}
              options={filterGroups.difficulty}
              isOn={(v) => filters.difficulty.includes(v as Difficulty)}
              onToggle={(v) => toggleFilter("difficulty", v as Difficulty)}
            />
          )}

          <FilterDropdown
            label="Technology"
            selected={filters.tech.length}
            options={filterGroups.tech}
            isOn={(v) => filters.tech.includes(v)}
            onToggle={(v) => toggleFilter("tech", v)}
            searchable
          />

          <FilterDropdown
            label="Health"
            selected={filters.health.length}
            options={filterGroups.health}
            isOn={(v) => filters.health.includes(v as Health)}
            onToggle={(v) => toggleFilter("health", v as Health)}
          />

          <button
            type="button"
            aria-pressed={filters.pinned}
            onClick={() => onFiltersChange({ ...filters, pinned: !filters.pinned })}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-ctl border px-2.5 text-xs font-medium transition-colors select-none",
              filters.pinned
                ? "border-sodium/70 bg-elevated text-fg"
                : "border-edge text-fg2 hover:bg-elevated hover:text-fg",
            )}
          >
            <Pin
              size={12}
              strokeWidth={1.5}
              className={filters.pinned ? "fill-current" : ""}
            />
            <span>Pinned</span>
            <span className="font-mono text-2xs text-fg3">{pinnedCount}</span>
          </button>
        </div>

        {isFiltered && (
          <Button variant="ghost" size="s" onClick={clearAll} className="h-8 text-xs">
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {filters.phase.map((p) => (
            <FilterChip key={p} onRemove={() => toggleFilter("phase", p)}>
              <PhaseGlyph phase={p} size={11} />
              <span>{PHASE_LABEL[p as CellPhase]}</span>
            </FilterChip>
          ))}
          {filters.category.map((c) => (
            <FilterChip key={c} onRemove={() => toggleFilter("category", c)}>
              <span>{c}</span>
            </FilterChip>
          ))}
          {filters.difficulty.map((d) => (
            <FilterChip key={d} onRemove={() => toggleFilter("difficulty", d)}>
              <span className="capitalize">{d}</span>
            </FilterChip>
          ))}
          {filters.tech.map((t) => (
            <FilterChip key={t} onRemove={() => toggleFilter("tech", t)}>
              <span>{t}</span>
            </FilterChip>
          ))}
          {filters.health.map((h) => (
            <FilterChip key={h} onRemove={() => toggleFilter("health", h)}>
              <span>Health: {HEALTH_LABEL[h]}</span>
            </FilterChip>
          ))}
          {filters.pinned && (
            <FilterChip onRemove={() => onFiltersChange({ ...filters, pinned: false })}>
              <Pin size={11} className="fill-current" />
              <span>Pinned only</span>
            </FilterChip>
          )}
        </div>
      )}

      {/* Mobile Filters Sheet */}
      <Sheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        side="bottom"
        title={`Filter Projects (${activeFilterCount})`}
      >
        <div className="space-y-5 p-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg2">
              Phase
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {filterGroups.phase.map((o) => (
                <div key={o.value} className="flex items-center justify-between">
                  <Checkbox
                    checked={filters.phase.includes(o.value as Phase)}
                    onChange={() => toggleFilter("phase", o.value as Phase)}
                    label={
                      <span className="inline-flex items-center gap-1 text-xs">
                        {o.icon} {o.label}
                      </span>
                    }
                  />
                  <span className="font-mono text-2xs text-fg3">{o.count}</span>
                </div>
              ))}
            </div>
          </fieldset>

          {!lockCategory && (
            <fieldset className="border-t border-line pt-4">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg2">
                Category
              </legend>
              <div className="grid grid-cols-1 gap-2">
                {filterGroups.category.map((o) => (
                  <div key={o.value} className="flex items-center justify-between">
                    <Checkbox
                      checked={filters.category.includes(o.value)}
                      onChange={() => toggleFilter("category", o.value)}
                      label={<span className="text-xs">{o.label}</span>}
                    />
                    <span className="font-mono text-2xs text-fg3">{o.count}</span>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {!lockDifficulty && (
            <fieldset className="border-t border-line pt-4">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg2">
                Complexity
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {filterGroups.difficulty.map((o) => (
                  <div key={o.value} className="flex items-center justify-between">
                    <Checkbox
                      checked={filters.difficulty.includes(o.value as Difficulty)}
                      onChange={() => toggleFilter("difficulty", o.value as Difficulty)}
                      label={<span className="text-xs">{o.label}</span>}
                    />
                    <span className="font-mono text-2xs text-fg3">{o.count}</span>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="border-t border-line pt-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg2">
              Technology (Top)
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {filterGroups.tech.slice(0, 10).map((o) => (
                <div key={o.value} className="flex items-center justify-between">
                  <Checkbox
                    checked={filters.tech.includes(o.value)}
                    onChange={() => toggleFilter("tech", o.value)}
                    label={<span className="truncate text-xs">{o.label}</span>}
                  />
                  <span className="font-mono text-2xs text-fg3">{o.count}</span>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="border-t border-line pt-4">
            <Checkbox
              checked={filters.pinned}
              onChange={(b) => onFiltersChange({ ...filters, pinned: b })}
              label={<span className="text-xs">Pinned only ({pinnedCount})</span>}
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-line bg-elevated p-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              clearAll();
              setMobileSheetOpen(false);
            }}
          >
            Clear all
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => setMobileSheetOpen(false)}
          >
            Show {matchingCount} projects
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
