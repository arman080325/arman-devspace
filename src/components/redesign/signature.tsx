"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, RefreshCw, Plug } from "lucide-react";
import {
  LOOP_ORDER,
  PHASE_COLOR_VAR,
  PHASE_LABEL,
  type Phase,
  type Severity,
  type SignalStatus,
  type SignalKind,
} from "./types";
import { SeverityTag, StatusGlyph } from "./glyphs";
import { Button, cx } from "./ui";

/* ---------------- Loop track ---------------- */
const STEP_LABEL: Record<Phase, string> = {
  exploring: "Explore",
  building: "Build",
  breaking: "Break",
  rebuilding: "Rebuild",
  shipped: "Shipped",
};

export function loopsText(n: number) {
  if (n <= 0) return null;
  if (n === 1) return "Rebuilt once";
  if (n === 2) return "Rebuilt twice";
  return `Rebuilt ${n} times`;
}

export function LoopTrack({
  phase,
  loops = 0,
  size = "full",
}: {
  phase: Phase;
  loops?: number;
  size?: "full" | "compact";
}) {
  const cur = LOOP_ORDER.indexOf(phase);
  const steps = LOOP_ORDER;

  if (size === "compact") {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        aria-label={`Loop: ${PHASE_LABEL[phase]}`}
      >
        <span className="inline-flex items-center gap-[2px]" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s}
              className={cx("h-2 rounded-[1px]", i === 4 ? "w-2" : "w-3")}
              style={
                i === cur
                  ? { background: PHASE_COLOR_VAR[s] }
                  : i < cur
                    ? { boxShadow: `inset 0 0 0 1px ${PHASE_COLOR_VAR[s]}` }
                    : { boxShadow: "inset 0 0 0 1px var(--border-default)" }
              }
            />
          ))}
        </span>
        <span className="text-2xs text-fg2">{STEP_LABEL[phase]}</span>
      </span>
    );
  }

  const lt = loopsText(loops);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ol className="flex items-center" aria-label="Loop">
        {steps.map((s, i) => {
          const isCur = i === cur;
          const past = i < cur;
          const isEnd = i === 4;
          return (
            <li
              key={s}
              className="flex items-center"
              aria-current={isCur ? "step" : undefined}
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className={cx(
                    "h-px w-3 sm:w-5",
                    isEnd && "border-t border-dashed bg-transparent",
                  )}
                  style={
                    isEnd
                      ? {
                          borderColor:
                            past || isCur
                              ? PHASE_COLOR_VAR.shipped
                              : "var(--border-default)",
                        }
                      : {
                          background:
                            past || isCur ? "var(--text-muted)" : "var(--border-default)",
                        }
                  }
                />
              )}
              <span
                className={cx(
                  "inline-flex h-6 items-center gap-1.5 whitespace-nowrap px-2 text-2xs font-medium",
                  isEnd ? "rounded-full" : "rounded-ctl",
                  !isCur && !past && "text-fg3",
                )}
                style={
                  isCur
                    ? { background: PHASE_COLOR_VAR[s], color: "var(--bg-base)" }
                    : past
                      ? {
                          boxShadow: `inset 0 0 0 1px ${PHASE_COLOR_VAR[s]}`,
                          color: "var(--text-primary)",
                        }
                      : { boxShadow: "inset 0 0 0 1px var(--border-subtle)" }
                }
              >
                {isCur && <span className="sr-only">Current step: </span>}
                {STEP_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      {lt && (
        <span className="inline-flex items-center gap-1 text-2xs text-fg2">
          <RefreshCw size={12} strokeWidth={1.5} aria-hidden /> {lt}
        </span>
      )}
    </div>
  );
}

/* ---------------- Env Chip ---------------- */
export function EnvChip({ env }: { env: "Production" | "Preview" | string | null }) {
  if (!env) return null;
  const isProd = env.toLowerCase() === "production";
  return (
    <span
      className={cx(
        "inline-flex h-[18px] items-center rounded-cell px-1.5 text-[11px] font-medium leading-none",
        isProd ? "bg-ship/15 text-ship" : "bg-fg3/15 text-fg2",
      )}
    >
      {env}
    </span>
  );
}

/* ---------------- Logbook Entry ---------------- */
export interface LogEventData {
  id: string;
  project: number;
  ts: string;
  kind: string;
  title: string;
  body?: string;
  commit?: string;
  sev: Severity;
  env?: string | null;
  url?: string | null;
  relTime?: string;
  absTime?: string;
}

export function LogbookEntry({
  event,
  showProject = true,
}: {
  event: LogEventData;
  showProject?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showProject && (
            <span className="font-mono text-2xs text-fg3">
              #{String(event.project).padStart(3, "0")}
            </span>
          )}
          <span className="font-medium text-fg">{event.title}</span>
          {event.env && <EnvChip env={event.env} />}
          <SeverityTag s={event.sev} />
        </div>
        {event.body && <p className="mt-1 text-xs text-fg2">{event.body}</p>}
        {event.commit && (
          <code className="mt-1 inline-block font-mono text-2xs text-fg3">
            {event.commit.slice(0, 7)}
          </code>
        )}
      </div>
      {event.relTime && (
        <span className="shrink-0 text-2xs text-fg3">{event.relTime}</span>
      )}
    </div>
  );
}

/* ---------------- Signal Row ---------------- */
export interface SignalData {
  id: string;
  project: number;
  title: string;
  kind: SignalKind;
  status: SignalStatus;
  env?: "Production" | "Preview" | null;
  timeRel: string;
  timeAbs: string;
  commit?: string | null;
  failingStep?: string | null;
  url?: string | null;
}

export function SignalRow({
  s,
  showProject = true,
  expandable = false,
}: {
  s: SignalData;
  showProject?: boolean;
  expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canOpen = expandable && (!!s.failingStep || !!s.commit);

  return (
    <div className="border-b border-line last:border-0">
      <div
        onClick={() => canOpen && setOpen(!open)}
        className={cx(
          "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm",
          canOpen && "cursor-pointer hover:bg-elevated",
        )}
      >
        <StatusGlyph status={s.status} />
        {showProject && (
          <span className="font-mono text-2xs text-fg3">
            #{String(s.project).padStart(3, "0")}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-fg">{s.title}</span>
        {s.env && <EnvChip env={s.env} />}
        <span className="text-2xs text-fg3">{s.timeRel}</span>
        {canOpen && (
          <span className="text-fg3">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>
      {open && (
        <div className="bg-inset px-4 py-2 text-xs text-fg2">
          {s.failingStep && (
            <p className="text-break">
              Failed step: <code>{s.failingStep}</code>
            </p>
          )}
          {s.commit && <p className="font-mono text-2xs text-fg3">Commit: {s.commit}</p>}
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sodium-text hover:underline"
            >
              View details <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Connection Plug ---------------- */
export type PlugState = "connected" | "error" | "disconnected" | "connecting";

export interface PlugProps {
  name: string;
  account?: string | null;
  state: PlugState;
  lastSync?: string | null;
  error?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectionPlug({
  name,
  account,
  state,
  lastSync,
  error,
  onConnect,
  onDisconnect,
}: PlugProps) {
  const isOk = state === "connected";
  const isErr = state === "error";

  return (
    <div className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug
            size={16}
            className={isOk ? "text-ship" : isErr ? "text-break" : "text-fg3"}
          />
          <span className="text-sm font-medium text-fg">{name}</span>
        </div>
        <span
          className={cx(
            "inline-flex h-5 items-center rounded-cell px-2 text-2xs font-medium",
            isOk
              ? "bg-ship/15 text-ship"
              : isErr
                ? "bg-break/15 text-break"
                : "bg-fg3/15 text-fg3",
          )}
        >
          {isOk ? "Connected" : isErr ? "Error" : "Disconnected"}
        </span>
      </div>

      {account && <p className="text-xs text-fg2">Account: {account}</p>}
      {lastSync && <p className="text-2xs text-fg3">Last synced: {lastSync}</p>}
      {error && <p className="text-xs text-break">{error}</p>}

      <div className="mt-2 flex gap-2">
        {isOk ? (
          <Button size="s" variant="ghost" onClick={onDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button size="s" variant="primary" onClick={onConnect}>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
