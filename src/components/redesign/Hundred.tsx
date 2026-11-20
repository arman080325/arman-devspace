import { type CellPhase, PHASE_COLOR_VAR } from "./types";

export type SortMode = "number" | "phase" | "category" | "activity";
export type HundredSize = "hero" | "compact" | "mini";

export const HUNDRED_GEOM: Record<HundredSize, { gap: number; width: string }> = {
  hero: { gap: 4, width: "min(100%, 476px)" }, // ~44px cells at full width
  compact: { gap: 3, width: "227px" }, // 20px cells
  mini: { gap: 1, width: "49px" }, // 4px cells
};

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
