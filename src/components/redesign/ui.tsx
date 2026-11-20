"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, CircleAlert, Loader, X } from "lucide-react";

export const cx = (...a: Array<string | false | null | undefined>) =>
  a.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "s" | "m" | "l";

const VAR: Record<ButtonVariant, string> = {
  primary:
    "bg-sodium text-on-sodium font-medium hover:bg-[color-mix(in_srgb,var(--sodium)_88%,white)] active:bg-[color-mix(in_srgb,var(--sodium)_85%,black)]",
  secondary:
    "border border-edge text-fg hover:bg-elevated hover:border-[color-mix(in_srgb,var(--border-default)_60%,var(--text-muted))] active:bg-inset",
  ghost: "text-fg2 hover:text-fg hover:bg-elevated active:bg-inset",
  destructive:
    "border border-break/60 text-break hover:bg-[color-mix(in_srgb,var(--ph-break)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--ph-break)_18%,transparent)]",
};

const SIZE: Record<ButtonSize, string> = {
  s: "h-7 px-2.5 text-xs gap-1.5",
  m: "h-8 px-3 text-sm gap-2",
  l: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "secondary",
  size = "m",
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center whitespace-nowrap rounded-ctl transition-colors duration-[120ms] select-none",
        "disabled:opacity-45 disabled:pointer-events-none",
        VAR[variant],
        SIZE[size],
        className,
      )}
    >
      {loading ? (
        <Loader size={14} strokeWidth={1.5} className="anim-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ---------------- Tooltip (portal, fixed) ---------------- */
export function Tooltip({
  label,
  shortcut,
  side = "bottom",
  children,
}: {
  label: ReactNode;
  shortcut?: string[];
  side?: "bottom" | "right" | "top";
  children: ReactElement;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | null>(null);

  const show = (el: HTMLElement, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (side === "right") setPos({ x: r.right + 8, y: r.top + r.height / 2 });
      else if (side === "top") setPos({ x: r.left + r.width / 2, y: r.top - 8 });
      else setPos({ x: r.left + r.width / 2, y: r.bottom + 8 });
    }, delay);
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setPos(null);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (typeof document === "undefined") {
    return children;
  }

  return (
    <>
      <span
        className="inline-flex"
        onMouseEnter={(e) => show(e.currentTarget, 350)}
        onMouseLeave={() => hide()}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) show(e.currentTarget, 0);
        }}
        onBlur={() => hide()}
        onClick={() => hide()}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            className="anim-fade pointer-events-none fixed z-[90] flex items-center gap-2 rounded-ctl border border-edge bg-elevated px-2 py-1 text-2xs font-medium text-fg shadow-pop"
            style={{
              left: Math.min(pos.x, window.innerWidth - 8),
              top: pos.y,
              transform:
                side === "right"
                  ? "translateY(-50%)"
                  : side === "top"
                    ? "translate(-50%, -100%)"
                    : "translateX(-50%)",
            }}
          >
            <span className="whitespace-nowrap">{label}</span>
            {shortcut && <Kbds keys={shortcut} />}
          </div>,
          document.body,
        )}
    </>
  );
}

export function IconButton({
  label,
  shortcut,
  side,
  children,
  className,
  size = "m",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  shortcut?: string[];
  side?: "bottom" | "right" | "top";
  size?: "s" | "m" | "touch";
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Tooltip label={label} shortcut={shortcut} side={side}>
      <button
        aria-label={label}
        {...rest}
        className={cx(
          "inline-flex items-center justify-center rounded-ctl text-fg2 transition-colors duration-[120ms] hover:bg-elevated hover:text-fg active:bg-inset disabled:opacity-40",
          size === "s" ? "h-7 w-7" : size === "touch" ? "h-11 w-11" : "h-8 w-8",
          className,
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/* ---------------- Kbd ---------------- */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[3px] border border-edge border-b-2 bg-surface px-1 font-sans text-[11px] font-medium leading-none text-fg2">
      {children}
    </kbd>
  );
}

export function Kbds({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}

/* ---------------- Chips ---------------- */
export function StackChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[22px] max-w-[140px] items-center truncate rounded-ctl border border-line bg-inset px-1.5 text-2xs font-medium text-fg2">
      {children}
    </span>
  );
}

export function FilterChip({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-ctl border border-edge bg-surface pl-2 pr-0.5 text-xs text-fg">
      {children}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${typeof children === "string" ? children : ""}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] text-fg3 hover:bg-elevated hover:text-fg"
      >
        <X size={12} strokeWidth={1.5} />
      </button>
    </span>
  );
}

export function SampleTag({ className }: { className?: string }) {
  return (
    <span
      title="Sample data for design review. Not connected to a live provider."
      className={cx(
        "inline-flex h-[18px] items-center rounded-cell border border-dashed border-edge px-1 text-[11px] font-medium leading-none text-fg3",
        className,
      )}
    >
      Sample
    </span>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  label,
  scroll,
}: {
  tabs: Array<{ id: T; label: ReactNode; count?: number | null }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label: string;
  scroll?: boolean;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (n >= 0) {
      e.preventDefault();
      onChange(tabs[n].id);
      refs.current[tabs[n].id]?.focus();
    }
  };
  return (
    <div className={cx("relative", className)}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKey}
        className={cx(
          "flex gap-1 border-b border-line",
          scroll && "scrollbar-none overflow-x-auto",
        )}
        style={
          scroll
            ? {
                maskImage:
                  "linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 24px), transparent 100%)",
              }
            : undefined
        }
      >
        {tabs.map((t) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={cx(
                "relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 text-sm transition-colors duration-[180ms]",
                on ? "text-fg font-medium" : "text-fg2 hover:text-fg",
              )}
            >
              {t.label}
              {t.count != null && (
                <span className="tnum text-2xs text-fg3">{t.count}</span>
              )}
              <span
                aria-hidden
                className={cx(
                  "absolute inset-x-1.5 bottom-0 h-0.5 bg-sodium transition-opacity duration-[180ms]",
                  on ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "m",
}: {
  options: Array<{ id: T; label: ReactNode; icon?: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "s" | "m";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-ctl border border-edge bg-inset p-0.5"
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-[3px] px-2.5 transition-colors duration-[120ms]",
              size === "s" ? "h-6 text-2xs" : "h-7 text-xs",
              on
                ? "bg-elevated text-fg font-medium shadow-[inset_0_0_0_1px_var(--border-default)]"
                : "text-fg2 hover:text-fg",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Switch / Checkbox / Radio ---------------- */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-[120ms] disabled:opacity-40",
        checked ? "border-sodium bg-sodium" : "border-edge bg-inset",
      )}
    >
      <span
        className={cx(
          "absolute h-3.5 w-3.5 rounded-full transition-transform duration-[120ms]",
          checked ? "translate-x-[18px] bg-on-sodium" : "translate-x-[2px] bg-fg3",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cx(
        "inline-flex items-center gap-2 text-sm",
        disabled ? "opacity-45" : "cursor-pointer",
      )}
    >
      <span className="relative inline-flex h-4 w-4">
        <input
          type="checkbox"
          className="peer absolute inset-0 cursor-pointer opacity-0"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cx(
            "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-cell border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sodium",
            checked ? "border-sodium bg-sodium text-on-sodium" : "border-edge bg-inset",
          )}
        >
          {checked && <Check size={12} strokeWidth={2.5} />}
        </span>
      </span>
      {label}
    </label>
  );
}

export function Radio({
  checked,
  onChange,
  label,
  name,
  desc,
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  name: string;
  desc?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <span className="relative mt-[3px] inline-flex h-4 w-4 shrink-0">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          className={cx(
            "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sodium",
            checked ? "border-sodium" : "border-edge bg-inset",
          )}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-sodium" />}
        </span>
      </span>
      <span>
        <span className="text-fg">{label}</span>
        {desc && <span className="block text-xs text-fg3">{desc}</span>}
      </span>
    </label>
  );
}

/* ---------------- Text field ---------------- */
export function Field({
  label,
  error,
  hint,
  trailing,
  className,
  inputClassName,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: ReactNode;
  hint?: ReactNode;
  trailing?: ReactNode;
  inputClassName?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={fid} className="text-2xs font-medium text-fg2">
        {label}
      </label>
      <div className="relative">
        <input
          id={fid}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          {...rest}
          className={cx(
            "h-10 w-full rounded-ctl border bg-inset px-3 text-sm text-fg placeholder:text-fg3 transition-colors duration-[120ms]",
            "hover:border-[color-mix(in_srgb,var(--border-default)_50%,var(--text-muted))] focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40",
            "disabled:opacity-50",
            error ? "border-break" : "border-edge",
            trailing ? "pr-11" : "",
            inputClassName,
          )}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        )}
      </div>
      {error ? (
        <p id={`${fid}-err`} className="flex items-start gap-1.5 text-2xs text-break">
          <CircleAlert size={14} strokeWidth={1.5} className="mt-px" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="text-2xs text-fg3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- Segmented progress (10 segments = 10%) ---------------- */
export function SegBar({
  value,
  total = 100,
  color = "var(--ph-ship)",
  label,
  className,
}: {
  value: number;
  total?: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  const filled = total === 0 ? 0 : Math.round((value / total) * 10);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      aria-label={label}
      className={cx("flex gap-0.5", className)}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="h-2 flex-1 rounded-[1px]"
          style={
            i < filled
              ? { background: color }
              : { boxShadow: "inset 0 0 0 1px var(--border-default)" }
          }
        />
      ))}
    </div>
  );
}

/* ---------------- Panel ---------------- */
export function Panel({
  title,
  actions,
  children,
  className,
  footer,
  bodyClass,
  id,
  titleId,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  bodyClass?: string;
  id?: string;
  titleId?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cx(
        "flex min-w-0 flex-col rounded-panel border border-line bg-surface",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-2">
          <h2
            id={titleId}
            className="flex items-center gap-2 text-base font-semibold text-fg"
          >
            {title}
          </h2>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cx("min-w-0 flex-1", bodyClass)}>{children}</div>
      {footer && (
        <footer className="border-t border-line px-4 py-2.5 text-2xs text-fg3">
          {footer}
        </footer>
      )}
    </section>
  );
}

/* ---------------- Popover ---------------- */
export function Popover({
  open,
  onClose,
  anchor,
  children,
  align = "start",
  width,
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "start" | "end";
  width?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const place = () => {
      const r = anchor.current!.getBoundingClientRect();
      const w = width ?? ref.current?.offsetWidth ?? 240;
      let left = align === "end" ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      const top = r.bottom + 4;
      setPos({ left, top, maxH: Math.max(160, window.innerHeight - top - 12) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        ref.current?.contains(e.target as Node) ||
        anchor.current?.contains(e.target as Node)
      )
        return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchor.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className={cx(
        "anim-menu fixed z-[70] overflow-auto rounded-panel border border-edge bg-elevated p-1 shadow-pop",
        className,
      )}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? 0,
        width,
        maxHeight: pos?.maxH,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  trailing,
  selected,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cx(
        "flex h-8 w-full items-center gap-2 rounded-ctl px-2 text-left text-sm hover:bg-base focus-visible:bg-base",
        danger ? "text-break" : "text-fg",
      )}
    >
      {icon && <span className="text-fg3">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
      {selected !== undefined && (
        <Check
          size={14}
          strokeWidth={1.5}
          className={selected ? "text-sodium-text" : "invisible"}
        />
      )}
    </button>
  );
}

/* ---------------- Focus Trap Hook ---------------- */
export function useFocusTrap(
  open: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const sel =
      'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    requestAnimationFrame(() => {
      const auto = el?.querySelector<HTMLElement>("[data-autofocus]");
      (
        auto ??
        el?.querySelectorAll<HTMLElement>(sel)[1] ??
        el?.querySelector<HTMLElement>(sel)
      )?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab" && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>(sel));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open, ref]);
}

/* ---------------- Dialog ---------------- */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 440,
  labelId,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  labelId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const auto = useId();
  const lid = labelId ?? auto;
  useFocusTrap(open, ref, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="anim-fade absolute inset-0 bg-scrim"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={lid}
        className="anim-pop relative flex max-h-[calc(100dvh-32px)] w-full flex-col rounded-dialog border border-edge bg-elevated shadow-pop"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <h2 id={lid} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <IconButton
            label="Close"
            shortcut={["Esc"]}
            size="s"
            onClick={onClose}
            className="-mr-1.5 -mt-0.5"
          >
            <X size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-2 text-sm text-fg2">
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Sheet / drawer ---------------- */
export function Sheet({
  open,
  onClose,
  side = "right",
  title,
  children,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  side?: "right" | "bottom" | "left" | "full";
  title: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lid = useId();
  useFocusTrap(open, ref, onClose);

  if (!open || typeof document === "undefined") return null;

  const pos =
    side === "right"
      ? "anim-drawer-right right-0 top-0 h-full border-l rounded-l-dialog"
      : side === "left"
        ? "anim-drawer left-0 top-0 h-full border-r"
        : side === "full"
          ? "anim-sheet inset-0"
          : "anim-sheet bottom-0 inset-x-0 max-h-[85dvh] rounded-t-dialog border-t";

  return createPortal(
    <div className="fixed inset-0 z-[75]">
      <div
        className="anim-fade absolute inset-0 bg-scrim"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={lid}
        className={cx(
          "absolute flex w-full flex-col border-edge bg-elevated shadow-pop",
          pos,
        )}
        style={side === "right" || side === "left" ? { maxWidth: width } : undefined}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <h2 id={lid} className="min-w-0 truncate text-base font-semibold">
            {title}
          </h2>
          <IconButton
            label="Close"
            shortcut={["Esc"]}
            size="touch"
            onClick={onClose}
            className="-mr-2"
          >
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Empty state ---------------- */
export function Empty({
  title,
  children,
  action,
  glyph,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  glyph?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {glyph ?? <EmptyGlyph />}
      <div className="max-w-[44ch]">
        <p className="text-sm font-medium text-fg">{title}</p>
        {children && <div className="mt-1 text-xs text-fg3">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyGlyph() {
  return (
    <span aria-hidden className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-cell border border-dashed border-edge"
        />
      ))}
    </span>
  );
}

/* ---------------- Skeleton rows ---------------- */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="skeleton h-3 w-3" style={{ animationDelay: `${i * 90}ms` }} />
          <span
            className="skeleton h-3 w-14"
            style={{ animationDelay: `${i * 90 + 40}ms` }}
          />
          <span
            className="skeleton h-3 flex-1"
            style={{
              animationDelay: `${i * 90 + 80}ms`,
              maxWidth: `${60 - (i % 3) * 12}%`,
            }}
          />
          <span
            className="skeleton ml-auto h-3 w-10"
            style={{ animationDelay: `${i * 90 + 120}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Inline error banner ---------------- */
export function ErrorBanner({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-break/50 bg-[color-mix(in_srgb,var(--ph-break)_7%,var(--bg-surface))] px-3 py-2.5 text-sm"
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-break">
        <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
        Error
      </span>
      <span className="min-w-0 flex-1 text-fg">{children}</span>
      {action}
    </div>
  );
}

/* ---------------- Rel time with absolute tooltip ---------------- */
export function Time({ rel, abs, mono }: { rel: string; abs: string; mono?: boolean }) {
  return (
    <Tooltip label={abs}>
      <time
        tabIndex={0}
        className={cx(
          "tnum whitespace-nowrap text-fg3 outline-none focus-visible:underline",
          mono && "font-mono text-[12px]",
        )}
      >
        {rel}
      </time>
    </Tooltip>
  );
}
