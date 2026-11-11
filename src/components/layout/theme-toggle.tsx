"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useIsMounted();

  React.useEffect(() => {
    if (!mounted) return;
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute(
        "content",
        theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark",
      );
    }
  }, [theme, mounted]);

  const currentIcon = !mounted ? (
    <Moon className="size-4" aria-hidden="true" />
  ) : resolvedTheme === "light" ? (
    <Sun className="size-4" aria-hidden="true" />
  ) : (
    <Moon className="size-4" aria-hidden="true" />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-9 border border-transparent hover:border-border"
            aria-label="Color theme"
          />
        }
      >
        {currentIcon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = mounted && theme === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {option.label}
              </span>
              {isSelected ? (
                <Check className="size-3.5 text-primary" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
