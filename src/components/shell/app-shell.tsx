"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { projects as canonicalProjects } from "@/data/projects";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { CommandPalette } from "./command-palette";
import { NumericJump } from "./numeric-jump";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./nav-items";
import { cx } from "@/components/redesign/ui";
import {
  PREFERENCES_CHANGED_EVENT,
  PREFERENCES_STORAGE_KEY,
  applyWorkspacePreferences,
  loadWorkspacePreferences,
} from "@/lib/preferences";
import type { SessionUser } from "@/types/project";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [jumpBuffer, setJumpBuffer] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  const gMode = useRef(false);
  const jumpTimer = useRef<number | null>(null);
  const gTimer = useRef<number | null>(null);

  // Sync theme attributes & color-scheme meta even on routes without TopBar (e.g. /login)
  useEffect(() => {
    const mode = resolvedTheme === "light" ? "day" : "night";
    document.documentElement.setAttribute("data-theme", mode);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute(
        "content",
        theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark",
      );
    }
  }, [theme, resolvedTheme]);

  // Apply and listen for browser workspace preferences (reduce-motion, density)
  useEffect(() => {
    const syncPrefs = () => {
      applyWorkspacePreferences(loadWorkspacePreferences());
    };
    syncPrefs();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === PREFERENCES_STORAGE_KEY) {
        syncPrefs();
      }
    };

    window.addEventListener(PREFERENCES_CHANGED_EVENT, syncPrefs);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, syncPrefs);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Fetch session on load and route changes
  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { user?: SessionUser | null };
        if (active) {
          setSessionUser(json.user ?? null);
        }
      } catch {
        // Unauthenticated or offline
      }
    };

    void loadSession();
    const onAuthChanged = () => {
      void loadSession();
    };

    window.addEventListener("devspace:auth-changed", onAuthChanged);
    return () => {
      active = false;
      window.removeEventListener("devspace:auth-changed", onAuthChanged);
    };
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSessionUser(null);
      window.dispatchEvent(new CustomEvent("devspace:auth-changed"));
      router.refresh();
    } catch {
      // Ignore network errors on logout
    }
  };

  // Close mobile nav on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileNavOpen(false);
  }

  // Active project calculation
  const activeProjectNumber = (() => {
    if (!pathname.startsWith("/projects/")) return undefined;
    const slug = pathname.replace("/projects/", "").split("/")[0];
    const p = canonicalProjects.find((x) => x.slug === slug || String(x.number) === slug);
    return p?.number;
  })();

  // Numeric jump buffer management
  const updateJumpBuffer = (val: string) => {
    setJumpBuffer(val);
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
    if (val) {
      jumpTimer.current = window.setTimeout(() => {
        setJumpBuffer("");
      }, 4000);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 1. Command Palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      // Ignore shortcuts if typing in form inputs or palette is open or modal is active
      if (isTypingTarget(e.target) || paletteOpen || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // 2. Numeric Jump: digits 0-9
      if (/^\d$/.test(e.key)) {
        const next = (jumpBuffer + e.key).slice(-3);
        updateJumpBuffer(next);
        return;
      }

      if (jumpBuffer) {
        if (e.key === "Enter") {
          e.preventDefault();
          const n = parseInt(jumpBuffer, 10);
          const p = canonicalProjects.find((x) => x.number === n);
          if (p) {
            router.push(`/projects/${p.slug}`);
          }
          updateJumpBuffer("");
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          updateJumpBuffer("");
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          updateJumpBuffer(jumpBuffer.slice(0, -1));
          return;
        }
      }

      // 3. 'g' navigation mode
      if (gMode.current) {
        gMode.current = false;
        const k = e.key.toUpperCase();
        if (k === "S") {
          e.preventDefault();
          router.push("/settings");
          return;
        }
        const allNavs = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];
        const match = allNavs.find((n) => n.key === k);
        if (match) {
          e.preventDefault();
          router.push(match.path);
        }
        return;
      }

      if (e.key === "g" || e.key === "G") {
        gMode.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = window.setTimeout(() => {
          gMode.current = false;
        }, 1200);
        return;
      }

      // 4. Sidebar toggle: '['
      if (e.key === "[") {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
        return;
      }
    };

    const onOpenCustom = () => setPaletteOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("devspace:open-command-palette", onOpenCustom);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("devspace:open-command-palette", onOpenCustom);
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [paletteOpen, jumpBuffer, router]);

  // Auth pages (login, register) bypass the workstation chrome
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-base text-fg">
      {/* Desktop Fixed Sidebar */}
      <div
        className={cx(
          "hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:flex-col transition-[width] duration-150 ease-out",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          sessionUser={sessionUser}
          onSignOut={handleSignOut}
          activeProjectNumber={activeProjectNumber}
        />
      </div>

      {/* Main Content Region with TopBar */}
      <div
        className={cx(
          "flex min-w-0 flex-1 flex-col transition-[margin-left] duration-150 ease-out",
          sidebarCollapsed ? "md:ml-16" : "md:ml-60",
        )}
      >
        <TopBar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          sessionUser={sessionUser}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 outline-none overflow-x-hidden"
        >
          {children}
        </main>
      </div>

      {/* Mobile Nav Drawer */}
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        sessionUser={sessionUser}
        onSignOut={handleSignOut}
        activeProjectNumber={activeProjectNumber}
      />

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        sessionUser={sessionUser}
        onSignOut={handleSignOut}
      />

      {/* Numeric Jump Floating HUD */}
      <NumericJump buffer={jumpBuffer} onDismiss={() => updateJumpBuffer("")} />
    </div>
  );
}
