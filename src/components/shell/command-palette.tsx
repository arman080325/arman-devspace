"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Moon,
  Sun,
  Monitor,
  FolderGit2,
  Rows3,
  Shapes,
  NotebookText,
  Milestone,
  Home,
  LogOut,
  LogIn,
  BookText,
  BarChart3,
  Settings2,
  ShieldCheck,
  Plug,
  X,
} from "lucide-react";
import { projects as canonicalProjects } from "@/data/projects";
import { PhaseGlyph } from "@/components/redesign/glyphs";
import { Kbd, Kbds, cx } from "@/components/redesign/ui";
import { statusToPhase } from "./mini-hundred";
import type { SessionUser } from "@/types/project";

export interface PaletteItem {
  id: string;
  group: "Projects" | "Navigation" | "Appearance" | "Account";
  label: ReactNode;
  text: string;
  secondary?: string;
  icon: ReactNode;
  keys?: string[];
  run: () => void;
}

function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-transparent text-sodium-text underline decoration-sodium decoration-1 underline-offset-2">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  sessionUser,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionUser?: SessionUser | null;
  onSignOut?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const labelId = useId();

  // Track previous open and query to adjust state during render without cascading effects
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActiveIndex(0);
  }

  // Save previous focus and autofocus on open
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  const navigate = useCallback(
    (path: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(path);
    },
    [onOpenChange, router],
  );

  // Items compilation
  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // 1. Projects search
    const matchedProjects = canonicalProjects
      .filter((p) => {
        if (!q) return false;
        const numStr = String(p.number);
        const paddedNum = numStr.padStart(3, "0");
        return (
          p.title.toLowerCase().includes(q) ||
          numStr === q ||
          paddedNum === q ||
          `#${numStr}` === q ||
          `#${paddedNum}` === q ||
          p.category.toLowerCase().includes(q) ||
          p.technologies.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);

    for (const p of matchedProjects) {
      const paddedId = String(p.number).padStart(3, "0");
      const phase = statusToPhase(p.status);
      result.push({
        id: `proj-${p.number}`,
        group: "Projects",
        text: `${paddedId} ${p.title}`,
        label: (
          <span className="flex items-center gap-2">
            <span className="tnum font-medium">{highlight(paddedId, q)}</span>
            <span>{highlight(p.title, q)}</span>
          </span>
        ),
        secondary: p.category,
        icon: <PhaseGlyph phase={phase} size={14} />,
        run: () => navigate(`/projects/${p.slug}`),
      });
    }

    // 2. Navigation items
    const navEntries: Array<{
      label: string;
      path: string;
      icon: ReactNode;
      keys?: string[];
    }> = [
      {
        label: "Overview",
        path: "/dashboard",
        icon: <Home size={14} />,
        keys: ["G", "O"],
      },
      {
        label: "All projects",
        path: "/projects",
        icon: <Rows3 size={14} />,
        keys: ["G", "P"],
      },
      {
        label: "Categories",
        path: "/paths",
        icon: <Shapes size={14} />,
        keys: ["G", "C"],
      },
      {
        label: "Activity",
        path: "/activity",
        icon: <NotebookText size={14} />,
        keys: ["G", "A"],
      },
      {
        label: "Roadmaps",
        path: "/kanban",
        icon: <Milestone size={14} />,
        keys: ["G", "R"],
      },
      {
        label: "Repository intelligence",
        path: "/technologies",
        icon: <FolderGit2 size={14} />,
        keys: ["G", "I"],
      },
      { label: "Engineering Journal", path: "/journal", icon: <BookText size={14} /> },
      { label: "Learning Analytics", path: "/analytics", icon: <BarChart3 size={14} /> },
      {
        label: "Settings",
        path: "/settings",
        icon: <Settings2 size={14} />,
        keys: ["G", "S"],
      },
      {
        label: "Integrations",
        path: "/settings?section=integrations",
        icon: <Plug size={14} />,
      },
      {
        label: "Account security",
        path: "/settings?section=security",
        icon: <ShieldCheck size={14} />,
      },
    ];

    for (const n of navEntries) {
      if (!q || n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)) {
        result.push({
          id: `nav-${n.path}`,
          group: "Navigation",
          text: n.label,
          label: highlight(n.label, q),
          icon: n.icon,
          keys: n.keys,
          run: () => navigate(n.path),
        });
      }
    }

    // 3. Appearance items
    const appearanceEntries = [
      {
        id: "theme-night",
        label: "Switch to Night Shift (Dark)",
        icon: <Moon size={14} />,
        run: () => {
          setTheme("dark");
          onOpenChange(false);
        },
      },
      {
        id: "theme-day",
        label: "Switch to Day Shift (Light)",
        icon: <Sun size={14} />,
        run: () => {
          setTheme("light");
          onOpenChange(false);
        },
      },
      {
        id: "theme-system",
        label: "Follow System Appearance",
        icon: <Monitor size={14} />,
        run: () => {
          setTheme("system");
          onOpenChange(false);
        },
      },
    ];

    for (const a of appearanceEntries) {
      if (!q || a.label.toLowerCase().includes(q)) {
        result.push({
          id: a.id,
          group: "Appearance",
          text: a.label,
          label: highlight(a.label, q),
          icon: a.icon,
          run: a.run,
        });
      }
    }

    // 4. Account items
    if (sessionUser) {
      if (!q || "sign out logout".includes(q)) {
        result.push({
          id: "account-signout",
          group: "Account",
          text: "Sign out",
          label: "Sign out",
          icon: <LogOut size={14} />,
          run: () => {
            onOpenChange(false);
            onSignOut?.();
          },
        });
      }
    } else {
      if (!q || "sign in login".includes(q)) {
        result.push({
          id: "account-signin",
          group: "Account",
          text: "Sign in to Arman’s Devspace",
          label: "Sign in to Arman’s Devspace",
          icon: <LogIn size={14} />,
          run: () => navigate("/login"),
        });
      }
    }

    return result;
  }, [query, sessionUser, setTheme, onSignOut, navigate, onOpenChange]);

  // Keyboard navigation within palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        items.length > 0 ? (prev - 1 + items.length) % items.length : 0,
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIndex]) {
        items[activeIndex].run();
      }
      return;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(
        `[data-index="${activeIndex}"]`,
      );
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 pt-[14dvh] md:p-4 md:pt-[16dvh]"
    >
      <div
        className="anim-fade fixed inset-0 bg-scrim"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className="anim-pop relative flex w-full max-w-[580px] flex-col overflow-hidden rounded-dialog border border-edge bg-elevated shadow-pop"
      >
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-3">
          <Search size={16} strokeWidth={1.5} className="text-fg3" aria-hidden="true" />
          <h2 id={labelId} className="sr-only">
            Command Palette
          </h2>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects (#number, title, stack), routes, or appearance…"
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg3 outline-none"
            aria-autocomplete="list"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="rounded-ctl p-1 text-fg3 hover:bg-base hover:text-fg"
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          ) : (
            <Kbd>Esc</Kbd>
          )}
        </div>

        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="max-h-[340px] overflow-y-auto p-1.5"
        >
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-fg3">
              No matching projects or navigation commands found.
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === activeIndex;
              const isFirstInGroup = index === 0 || items[index - 1].group !== item.group;

              return (
                <div key={item.id}>
                  {isFirstInGroup && (
                    <div className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-fg3">
                      {item.group}
                    </div>
                  )}
                  <div
                    role="option"
                    id={`palette-item-${item.id}`}
                    aria-selected={isSelected}
                    data-index={index}
                    onClick={() => item.run()}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cx(
                      "flex cursor-pointer items-center gap-2.5 rounded-ctl px-2.5 py-2 text-sm transition-colors duration-75",
                      isSelected
                        ? "bg-base text-fg font-medium"
                        : "text-fg2 hover:text-fg",
                    )}
                  >
                    <span className="shrink-0 text-fg3">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.secondary && (
                      <span className="truncate text-2xs text-fg3">{item.secondary}</span>
                    )}
                    {item.keys && <Kbds keys={item.keys} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-2xs text-fg3">
          <div className="flex items-center gap-3">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate
            </span>
            <span>
              <Kbd>↵</Kbd> Select
            </span>
            <span>
              <Kbd>Esc</Kbd> Close
            </span>
          </div>
          <span>100 projects in catalog</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
