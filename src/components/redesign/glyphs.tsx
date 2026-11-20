import {
  Ban,
  CircleCheck,
  CircleDashed,
  Clock,
  Loader,
  OctagonX,
  TriangleAlert,
  Info,
} from "lucide-react";
import {
  PHASE_COLOR_VAR,
  PHASE_LABEL,
  HEALTH_LABEL,
  DEPLOY_LABEL,
  STATUS_WORD,
  SEVERITY_COLOR,
  SEVERITY_WORD,
  type CellPhase,
  type Health,
  type DeployState,
  type Severity,
  type SignalStatus,
} from "./types";
import { cx } from "./ui";

/** The phase glyph mirrors the Hundred cell geometry, so status reads without colour. */
export function PhaseGlyph({
  phase,
  size = 12,
  className,
}: {
  phase: CellPhase;
  size?: number;
  className?: string;
}) {
  const c = PHASE_COLOR_VAR[phase] ?? "var(--border-default)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={cx("shrink-0", className)}
      aria-hidden
    >
      {phase === "exploring" && (
        <rect
          x="1"
          y="1"
          width="10"
          height="10"
          rx="1"
          fill="none"
          stroke={c}
          strokeWidth="1.2"
          strokeDasharray="2 1.4"
        />
      )}
      {phase === "building" && (
        <>
          <rect
            x="1.5"
            y="1.5"
            width="9"
            height="9"
            rx="1"
            fill="none"
            stroke={c}
            strokeWidth="1"
          />
          <rect x="1" y="6" width="10" height="5" rx="0.6" fill={c} />
        </>
      )}
      {phase === "shipped" && <rect x="1" y="1" width="10" height="10" rx="1" fill={c} />}
      {phase === "breaking" && (
        <>
          <rect x="1" y="1" width="10" height="10" rx="1" fill={c} />
          <path
            d="M3 10.2 L6.4 5.8 L5.6 5 L9.4 1.6"
            stroke="var(--bg-inset)"
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}
      {phase === "rebuilding" && (
        <path
          d="M1 2 a1 1 0 0 1 1 -1 H6.6 V5.4 H11 V10 a1 1 0 0 1 -1 1 H2 a1 1 0 0 1 -1 -1 Z"
          fill={c}
        />
      )}
      {phase === "archived" && (
        <rect x="1" y="1" width="10" height="10" rx="1" fill={c} opacity="0.35" />
      )}
      {phase === "unknown" && (
        <>
          <rect
            x="1.5"
            y="1.5"
            width="9"
            height="9"
            rx="1"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1"
          />
          <circle cx="6" cy="6" r="1.3" fill="var(--text-muted)" />
        </>
      )}
    </svg>
  );
}

export function PhaseBadge({
  phase,
  className,
  plain,
}: {
  phase: CellPhase;
  className?: string;
  plain?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium",
        className,
      )}
      style={{ color: plain ? undefined : PHASE_COLOR_VAR[phase] }}
    >
      <PhaseGlyph phase={phase} />
      <span className={plain ? "text-fg" : ""}>{PHASE_LABEL[phase] ?? phase}</span>
    </span>
  );
}

export function StatusGlyph({
  status,
  size = 14,
}: {
  status: SignalStatus;
  size?: number;
}) {
  const p = { size, strokeWidth: 1.5 };
  switch (status) {
    case "success":
      return <CircleCheck {...p} className="text-ship" aria-label="Succeeded" />;
    case "failed":
      return <OctagonX {...p} className="text-break" aria-label="Failed" />;
    case "running":
      return <Loader {...p} className="anim-spin text-build" aria-label="Running" />;
    case "queued":
      return <Clock {...p} className="text-fg3" aria-label="Queued" />;
    case "canceled":
      return <Ban {...p} className="text-fg3" aria-label="Canceled" />;
  }
}

export { STATUS_WORD, SEVERITY_COLOR, SEVERITY_WORD };

export function SeverityGlyph({ s, size = 14 }: { s: Severity; size?: number }) {
  const p = {
    size,
    strokeWidth: 1.5,
    style: { color: SEVERITY_COLOR[s] },
    "aria-hidden": true as const,
  };
  if (s === "error") return <OctagonX {...p} />;
  if (s === "warning") return <TriangleAlert {...p} />;
  if (s === "success") return <CircleCheck {...p} />;
  return <Info {...p} />;
}

export function SeverityTag({ s }: { s: Severity }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-2xs font-medium"
      style={{ color: SEVERITY_COLOR[s] }}
    >
      <SeverityGlyph s={s} size={12} />
      {SEVERITY_WORD[s]}
    </span>
  );
}

export function HealthTag({ h }: { h: Health }) {
  const map: Record<Health, { s: Severity | null; cls: string }> = {
    good: { s: "success", cls: "text-ship" },
    fair: { s: "warning", cls: "text-warn" },
    poor: { s: "error", cls: "text-break" },
    unknown: { s: null, cls: "text-fg3" },
  };
  const m = map[h] ?? map.unknown;
  return (
    <span
      className={cx("inline-flex items-center gap-1 whitespace-nowrap text-xs", m.cls)}
    >
      {m.s ? (
        <SeverityGlyph s={m.s} size={12} />
      ) : (
        <CircleDashed size={12} strokeWidth={1.5} aria-hidden />
      )}
      {HEALTH_LABEL[h] ?? h}
    </span>
  );
}

export function DeployTag({ d }: { d: DeployState }) {
  const map: Record<DeployState, { st: SignalStatus | null; cls: string }> = {
    ready: { st: "success", cls: "text-ship" },
    failed: { st: "failed", cls: "text-break" },
    building: { st: "running", cls: "text-build" },
    preview: { st: null, cls: "text-fg2" },
    none: { st: null, cls: "text-fg3" },
  };
  const m = map[d] ?? map.none;
  return (
    <span
      className={cx("inline-flex items-center gap-1 whitespace-nowrap text-xs", m.cls)}
    >
      {m.st ? (
        <StatusGlyph status={m.st} size={12} />
      ) : (
        <CircleDashed size={12} strokeWidth={1.5} aria-hidden />
      )}
      {DEPLOY_LABEL[d] ?? d}
    </span>
  );
}

export function GithubIcon({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
