"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip } from "@/components/redesign/ui";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useIsMounted();

  const isLight =
    mounted && (resolvedTheme === "light" || (!resolvedTheme && theme === "light"));

  // Keep DOM attributes synchronized on theme updates
  React.useEffect(() => {
    if (!mounted) return;
    const currentMode = isLight ? "day" : "night";
    document.documentElement.setAttribute("data-theme", currentMode);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute("content", isLight ? "light" : "dark");
    }
  }, [isLight, mounted]);

  const handleToggle = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const nextTheme = isLight ? "dark" : "light";
      setTheme(nextTheme);

      // Instant client-side DOM sync for immediate zero-latency feedback
      const nextMode = nextTheme === "light" ? "day" : "night";
      document.documentElement.setAttribute("data-theme", nextMode);
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) {
        meta.setAttribute("content", nextTheme === "light" ? "light" : "dark");
      }
    },
    [isLight, setTheme],
  );

  const label = isLight ? "Switch to Night Shift (dark)" : "Switch to Day Shift (light)";
  const icon = isLight ? (
    <Sun
      className="size-4 text-sodium transition-transform duration-150 rotate-0"
      aria-hidden="true"
    />
  ) : (
    <Moon
      className="size-4 text-fg2 transition-transform duration-150 rotate-0"
      aria-hidden="true"
    />
  );

  return (
    <Tooltip label={label} shortcut={["T"]}>
      <button
        type="button"
        onClick={handleToggle}
        className={
          className ??
          "inline-flex h-8 w-8 items-center justify-center rounded-ctl text-fg2 transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-2 focus-visible:outline-sodium"
        }
        aria-label={label}
        aria-pressed={isLight}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
