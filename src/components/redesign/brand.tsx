import { cx } from "./ui";
import { getWorkspaceBrandName } from "@/lib/brand";

export { getWorkspaceBrandName };

/** 3x3 mark. Eight cells on grid; middle-right cell knocked 2px loose (Break -> Rebuild). */
export function Mark({
  size = 24,
  className,
  loose = true,
  label,
}: {
  size?: number;
  className?: string;
  loose?: boolean;
  label?: string;
}) {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push([r, c]);
    }
  }
  const off = size <= 16 ? 1.6 : 1.4;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cx("shrink-0", className)}
      role="img"
      aria-label={label ?? "Devspace"}
    >
      {cells.map(([r, c]) => {
        const isLoose = r === 1 && c === 2;
        const x = 1 + c * 8 + (isLoose && loose ? off : 0);
        const y = 1 + r * 8 + (isLoose && loose ? off : 0);
        return (
          <rect
            key={`${r}${c}`}
            x={x}
            y={y}
            width={6}
            height={6}
            rx={0.8}
            fill={isLoose ? "var(--sodium)" : "var(--text-primary)"}
          />
        );
      })}
    </svg>
  );
}

export function Wordmark({
  name,
  brandText,
  className,
}: {
  name?: string | null;
  brandText?: string;
  className?: string;
} = {}) {
  const text = brandText ?? getWorkspaceBrandName(name);
  return (
    <span
      className={cx("whitespace-nowrap text-fg", className)}
      style={{
        fontFamily: "var(--font-display)",
        fontVariationSettings: "'wdth' 85",
        fontWeight: 600,
        letterSpacing: "-0.005em",
      }}
    >
      {text}
    </span>
  );
}

export function Lockup({
  name,
  brandText,
  size = 16,
  className,
}: {
  name?: string | null;
  brandText?: string;
  size?: number;
  className?: string;
} = {}) {
  const text = brandText ?? getWorkspaceBrandName(name);
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <Mark size={Math.round(size * 1.5)} label={text} />
      <Wordmark brandText={text} className="leading-none" />
    </span>
  );
}

/** Tagline lockup: each word on a different width. Use on auth, empty dashboard, and help. */
export function Tagline({ className, size = 20 }: { className?: string; size?: number }) {
  const w = (wdth: number) => ({ fontVariationSettings: `'wdth' ${wdth}` });
  return (
    <p
      className={cx("text-fg", className)}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "-0.005em",
      }}
      aria-label="Explore. Build. Break. Rebuild."
    >
      <span aria-hidden>
        <span style={w(130)}>Explore.</span> <span style={w(100)}>Build.</span>{" "}
        <span style={w(60)}>
          Brea<span style={{ position: "relative", top: 1 }}>k</span>.
        </span>{" "}
        <span style={w(100)}>Rebuild.</span>
      </span>
    </p>
  );
}
