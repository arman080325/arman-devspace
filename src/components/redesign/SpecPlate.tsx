import Link from "next/link";
import { Pin, Star, OctagonX, RefreshCcw, ArrowUpRight } from "lucide-react";
import { PHASE_COLOR_VAR, type SpecPlateProject } from "./types";
import { PhaseBadge, HealthTag, GithubIcon } from "./glyphs";
import { StackChip, cx } from "./ui";

export function PhaseLine({ p, className }: { p: SpecPlateProject; className?: string }) {
  if (p.phase === "breaking") {
    return (
      <p className={cx("flex items-start gap-1.5 text-xs text-break", className)}>
        <OctagonX size={14} strokeWidth={1.5} className="mt-[3px]" aria-hidden />
        <span className="line-clamp-2">{p.reason ?? "Needs attention"}</span>
      </p>
    );
  }
  if (p.phase === "rebuilding") {
    return (
      <p className={cx("flex items-start gap-1.5 text-xs text-fg2", className)}>
        <RefreshCcw
          size={14}
          strokeWidth={1.5}
          className="mt-[3px] text-rebuild"
          aria-hidden
        />
        <span className="line-clamp-2">
          <span className="text-fg3">Rebuilding: </span>
          {p.reason ?? "Active refactor"}
        </span>
      </p>
    );
  }
  if (p.phase === "shipped" && p.deployUrl) {
    return (
      <a
        href={p.deployUrl.startsWith("http") ? p.deployUrl : `https://${p.deployUrl}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "relative z-10 inline-flex max-w-full items-center gap-1 font-mono text-[12px] text-fg2 hover:text-fg hover:underline",
          className,
        )}
      >
        <span className="truncate">{p.deployUrl.replace(/^https?:\/\//, "")}</span>
        <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden />
      </a>
    );
  }
  if (p.focus) {
    return (
      <p className={cx("line-clamp-2 text-xs text-fg2", className)}>
        <span className="text-fg3">Now: </span>
        {p.focus}
      </p>
    );
  }
  return null;
}

export function SpecPlate({
  p,
  pinned,
  tooltip,
}: {
  p: SpecPlateProject;
  pinned?: boolean;
  onTogglePin?: () => void;
  tooltip?: boolean;
}) {
  const extra = p.stack.length - 3;
  const targetHref = `/projects/${p.slug || p.id}`;

  return (
    <article
      className={cx(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-panel border bg-surface pl-[3px] transition-colors duration-[120ms]",
        tooltip
          ? "w-[300px] border-edge bg-elevated shadow-pop"
          : "border-line hover:border-edge",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: PHASE_COLOR_VAR[p.phase] ?? "var(--border-default)" }}
      />
      <div className="flex flex-1 flex-col gap-2 px-4 pb-3 pt-3">
        <div className="flex items-start justify-between gap-3">
          <span className="display-num text-[40px] leading-[36px] text-fg">{p.id}</span>
          <span className="flex items-center gap-2 pt-1">
            {pinned && (
              <Pin
                size={14}
                strokeWidth={1.5}
                className="text-sodium-text"
                aria-label="Pinned"
              />
            )}
            <PhaseBadge phase={p.phase} />
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-fg">
            {tooltip ? (
              p.name
            ) : (
              <Link
                href={targetHref}
                className="outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:after:outline-2 focus-visible:after:outline-sodium focus-visible:after:outline-offset-2"
              >
                {p.name}
              </Link>
            )}
          </h3>
          <p className="line-clamp-2 text-xs text-fg2" title={p.description}>
            {p.description}
          </p>
        </div>
        <PhaseLine p={p} />
      </div>
      {p.repo ? (
        <div className="flex min-h-10 items-center gap-2 border-t border-line px-4 py-1.5">
          <div
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden"
            style={{ maxHeight: 24 }}
          >
            {p.stack.slice(0, 3).map((s) => (
              <StackChip key={s}>{s}</StackChip>
            ))}
            {extra > 0 && <StackChip>+{extra}</StackChip>}
          </div>
          <span className="flex shrink-0 items-center gap-2.5 text-xs text-fg3">
            <GithubIcon size={13} className="text-fg3" />
            {p.health && <HealthTag h={p.health} />}
            {p.stars !== null && p.stars !== undefined && p.stars > 0 && (
              <span
                className="tnum hidden items-center gap-0.5 sm:inline-flex"
                title={`${p.stars} stars`}
              >
                <Star size={12} strokeWidth={1.5} aria-hidden />
                {p.stars}
              </span>
            )}
          </span>
        </div>
      ) : null}
    </article>
  );
}
