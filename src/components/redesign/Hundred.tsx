"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { projects as canonicalProjects } from "@/data/projects";
import type { Project } from "@/types/project";
import { SpecPlate } from "./SpecPlate";
import { PhaseGlyph } from "./glyphs";
import { cx } from "./ui";
import {
  phaseCounts,
  projectToCellPhase,
  projectToSpecPlate,
  sortProjects,
  type SortMode,
} from "@/lib/hundred-utils";
import {
  PHASES,
  PHASE_COLOR_VAR,
  PHASE_LABEL,
  type CellPhase,
  type Phase,
  type SpecPlateProject,
} from "./types";

export {
  phaseCounts,
  projectToCellPhase,
  projectToSpecPlate,
  sortProjects,
  type SortMode,
};
export type HundredSize = "hero" | "compact" | "mini";

export const HUNDRED_GEOM: Record<HundredSize, { gap: number; width: string }> = {
  hero: { gap: 4, width: "min(100%, 476px)" }, // ~44px cells at full width
  compact: { gap: 3, width: "227px" }, // 20px cells
  mini: { gap: 1, width: "49px" }, // 4px cells
};

/* ============================================================================
   CELL FACE (GEOMETRIC SHAPE ENCODING)
   ============================================================================ */

/** Visual face of one cell. Shape encodes phase so it reads in greyscale without colour dependence. */
export function CellFace({ phase, mini }: { phase: CellPhase; mini?: boolean }) {
  const c = PHASE_COLOR_VAR[phase] ?? "var(--border-default)";
  const base = "absolute inset-0 rounded-cell";

  switch (phase) {
    case "exploring":
      return (
        <span
          className={base}
          style={{
            border: `1px ${mini ? "solid" : "dashed"} ${c}`,
            opacity: mini ? 0.9 : 1,
          }}
        />
      );
    case "building":
      return (
        <span className={base} style={{ boxShadow: `inset 0 0 0 1px ${c}` }}>
          <span
            className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-cell"
            style={{ background: c }}
          />
        </span>
      );
    case "shipped":
      return <span className={base} style={{ background: c }} />;
    case "breaking":
      return (
        <span className={base} style={{ background: c }}>
          {!mini && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 10 10"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M2.2 8.6 L5.2 5.1 L4.5 4.4 L7.9 1.4"
                stroke="var(--bg-inset)"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
                fill="none"
              />
            </svg>
          )}
        </span>
      );
    case "rebuilding":
      return (
        <span
          className={base}
          style={{
            background: c,
            clipPath: mini
              ? undefined
              : "polygon(0 0, 60% 0, 60% 40%, 100% 40%, 100% 100%, 0 100%)",
          }}
        />
      );
    case "archived":
      return <span className={base} style={{ background: c, opacity: 0.3 }} />;
    case "unknown":
    default:
      return (
        <span
          className={base}
          style={
            mini
              ? { background: "var(--border-default)" }
              : { boxShadow: "inset 0 0 0 1px var(--border-default)" }
          }
        >
          {!mini && (
            <span className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg3" />
          )}
        </span>
      );
  }
}

/* ============================================================================
   HOVER FLOATING PLATE (PORTAL)
   ============================================================================ */

function HoverPlate({ p, rect }: { p: SpecPlateProject; rect: DOMRect }) {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const W = 300;
  const right = rect.right + 10 + W < window.innerWidth;
  const left = right ? rect.right + 10 : Math.max(8, rect.left - 10 - W);
  const top = Math.min(Math.max(8, rect.top - 20), Math.max(8, window.innerHeight - 250));

  return createPortal(
    <div className="anim-fade pointer-events-none fixed z-[85]" style={{ left, top }}>
      <SpecPlate p={p} tooltip />
    </div>,
    document.body,
  );
}

/* ============================================================================
   THE HUNDRED GRID COMPONENT
   ============================================================================ */

export interface HundredProps {
  size: HundredSize;
  projects?: Project[];
  sort?: SortMode;
  current?: number;
  isLit?: (p: Project) => boolean;
  mode?: "data" | "unknown" | "loading";
  label?: string;
  onOpen?: (p: Project) => void;
  miniCell?: 3 | 4;
  interactive?: boolean;
  className?: string;
}

export function Hundred({
  size,
  projects = canonicalProjects,
  sort = "number",
  current,
  isLit,
  mode = "data",
  label = "The Hundred: all 100 projects by phase",
  onOpen,
  miniCell = 4,
  interactive = true,
  className,
}: HundredProps) {
  const router = useRouter();
  const ordered = useMemo(() => sortProjects(projects, sort), [projects, sort]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [hover, setHover] = useState<{ p: SpecPlateProject; rect: DOMRect } | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const g = HUNDRED_GEOM[size];
  const gap = size === "mini" ? 1 : g.gap;
  const width = size === "mini" ? `${miniCell * 10 + 9}px` : g.width;
  const mini = size === "mini";

  const handleOpen = useCallback(
    (p: Project) => {
      if (onOpen) {
        onOpen(p);
      } else {
        router.push(`/projects/${p.slug}`);
      }
    },
    [onOpen, router],
  );

  const handleKeyDown = (e: KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight") next = Math.min(99, idx + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
    else if (e.key === "ArrowDown") next = Math.min(99, idx + 10);
    else if (e.key === "ArrowUp") next = Math.max(0, idx - 10);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 99;
    else return;

    e.preventDefault();
    setFocusIdx(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={cx("relative select-none", className)} style={{ width }}>
      <div
        role={interactive ? "grid" : "img"}
        aria-label={label}
        className="grid grid-cols-10 aspect-square w-full"
        style={{ gap: `${gap}px` }}
      >
        {ordered.map((p, idx) => {
          const phase = mode === "unknown" ? "unknown" : projectToCellPhase(p);
          const isCurrent = current === p.number;
          const dim = isLit ? !isLit(p) : false;
          const padNum = String(p.number).padStart(3, "0");

          const face =
            mode === "loading" ? (
              <span className="skeleton absolute inset-0 rounded-cell" />
            ) : (
              <CellFace phase={phase} mini={mini} />
            );

          const ring = isCurrent ? (
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-[3px]"
              style={{
                inset: mini ? -2 : -3,
                boxShadow: `0 0 0 ${mini ? 1 : 2}px var(--sodium)`,
              }}
            />
          ) : null;

          if (!interactive) {
            return (
              <div
                key={p.number}
                className="relative aspect-square w-full"
                style={{ opacity: dim ? 0.2 : 1 }}
              >
                {face}
                {ring}
              </div>
            );
          }

          return (
            <button
              key={p.number}
              ref={(el) => {
                refs.current[idx] = el;
              }}
              type="button"
              role="gridcell"
              tabIndex={idx === focusIdx ? 0 : -1}
              aria-label={`${padNum} ${p.title}, ${PHASE_LABEL[phase]}${
                isCurrent ? ", current project" : ""
              }${dim ? ", filtered out" : ""}`}
              onClick={() => handleOpen(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOpen(p);
                } else {
                  handleKeyDown(e, idx);
                }
              }}
              onMouseEnter={(e) => {
                if (!mini) {
                  setHover({
                    p: projectToSpecPlate(p),
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }
              }}
              onMouseLeave={() => setHover(null)}
              onFocus={(e) => {
                setFocusIdx(idx);
                if (!mini && e.currentTarget.matches(":focus-visible")) {
                  setHover({
                    p: projectToSpecPlate(p),
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }
              }}
              onBlur={() => setHover(null)}
              className={cx(
                "relative aspect-square w-full rounded-cell outline-none transition-all duration-100",
                mini
                  ? "hover:outline hover:outline-1 hover:outline-offset-1 hover:outline-sodium focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-sodium"
                  : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-sodium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sodium",
              )}
              style={{ opacity: dim ? 0.2 : 1 }}
            >
              {face}
              {ring}
            </button>
          );
        })}
      </div>

      {hover && mode !== "unknown" && <HoverPlate p={hover.p} rect={hover.rect} />}
    </div>
  );
}

/* ============================================================================
   HUNDRED LEGEND WITH LENS FILTERING
   ============================================================================ */

export function HundredLegend({
  projects = canonicalProjects,
  lens,
  onLens,
  unknown,
  layout = "row",
}: {
  projects?: Project[];
  lens?: Phase | null;
  onLens?: (p: Phase | null) => void;
  unknown?: boolean;
  layout?: "row" | "column";
}) {
  const counts = useMemo(() => phaseCounts(projects), [projects]);

  return (
    <div
      className={cx(
        "flex gap-x-4 gap-y-1.5",
        layout === "row" ? "flex-wrap items-center" : "flex-col",
      )}
    >
      <div className="flex items-baseline gap-1.5 text-fg">
        <span className="font-mono text-2xl font-bold leading-none">
          {projects.length}
        </span>
        <span className="text-xs text-fg2">projects</span>
      </div>

      {unknown ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-fg2">
          <PhaseGlyph phase="unknown" /> 100 unknown until a source is connected
        </span>
      ) : (
        PHASES.map((ph) => {
          const on = lens === ph;
          const Comp = onLens ? "button" : "span";
          return (
            <Comp
              key={ph}
              {...(onLens
                ? {
                    type: "button",
                    onClick: () => onLens(on ? null : ph),
                    "aria-pressed": on,
                    title: on ? "Show all" : `Show only ${PHASE_LABEL[ph].toLowerCase()}`,
                  }
                : {})}
              className={cx(
                "inline-flex h-7 items-center gap-1.5 rounded-ctl text-xs transition-colors",
                onLens && "px-1.5 -mx-1.5 hover:bg-elevated cursor-pointer",
                on && "bg-elevated shadow-[inset_0_0_0_1px_var(--border-default)]",
                lens && !on && "opacity-50",
              )}
            >
              <PhaseGlyph phase={ph} />
              <span className="font-mono text-xs font-semibold text-fg">
                {counts[ph]}
              </span>
              <span className="text-fg2">{PHASE_LABEL[ph].toLowerCase()}</span>
            </Comp>
          );
        })
      )}
    </div>
  );
}
