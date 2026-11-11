"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookText,
  ChevronDown,
  Compass,
  FolderGit2,
  Kanban,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  Terminal,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navLinks, secondaryNavLinks, siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/project";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/projects": FolderGit2,
  "/paths": Compass,
  "/dashboard": LayoutDashboard,
  "/kanban": Kanban,
  "/journal": BookText,
  "/analytics": BarChart3,
  "/technologies": Layers,
};

export function Navbar({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [sessionUser, setSessionUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
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
        // Silent fail if unauthenticated or offline
      }
    };

    void loadSession();
    const handler = () => {
      void loadSession();
    };
    window.addEventListener("devspace:auth-changed", handler);
    return () => {
      active = false;
      window.removeEventListener("devspace:auth-changed", handler);
    };
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSessionUser(null);
      setMobileOpen(false);
      window.dispatchEvent(new CustomEvent("devspace:auth-changed"));
      router.refresh();
    } catch {
      // Ignore network glitch on logout
    }
  };

  const triggerPalette = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
      return;
    }
    window.dispatchEvent(new CustomEvent("devspace:open-command-palette"));
  };

  const isRouteActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      <a
        href="#main-content"
        className="visually-hidden fixed top-3 left-3 z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md py-1 text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-foreground/90"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-violet-500/30 bg-violet-500/15 text-violet-400">
              <Terminal className="size-4" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap">{siteConfig.name}</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((item) => {
              const active = isRouteActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors whitespace-nowrap",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2.5 -bottom-[11px] h-0.5 rounded-full bg-violet-500"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPalette}
            className="hidden h-9 gap-2 border-border/80 bg-card/70 px-3 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
            aria-label="Open command palette (Ctrl+K)"
          >
            <Search className="size-3.5" aria-hidden="true" />
            <span>Search 100 projects…</span>
            <kbd className="pointer-events-none ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-block">
              Ctrl K
            </kbd>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={triggerPalette}
            className="size-9 sm:hidden"
            aria-label="Open search and command palette"
          >
            <Search className="size-4" aria-hidden="true" />
          </Button>

          <ThemeToggle />

          {sessionUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden h-9 gap-1.5 sm:inline-flex"
                    aria-label="Developer account menu"
                  />
                }
              >
                <User className="size-3.5 text-violet-400" aria-hidden="true" />
                <span className="max-w-28 truncate">{sessionUser.name}</span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate font-normal text-xs">
                    Signed in as {sessionUser.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <LayoutDashboard className="size-4" aria-hidden="true" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/kanban" />}>
                    <Kanban className="size-4" aria-hidden="true" />
                    <span>Kanban Board</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/journal" />}>
                    <BookText className="size-4" aria-hidden="true" />
                    <span>Engineering Journal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/analytics" />}>
                    <BarChart3 className="size-4" aria-hidden="true" />
                    <span>Analytics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/technologies" />}>
                    <Layers className="size-4" aria-hidden="true" />
                    <span>Technologies</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                  <LogOut className="size-4" aria-hidden="true" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-1.5 sm:inline-flex"
              render={<Link href="/login" />}
            >
              <LogIn className="size-3.5" aria-hidden="true" />
              <span>Sign In</span>
            </Button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="size-9 lg:hidden"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu className="size-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-4 py-3.5">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Terminal className="size-4 text-violet-400" aria-hidden="true" />
                  <span>{siteConfig.name}</span>
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 p-3">
                {[...navLinks, ...secondaryNavLinks].map((item) => {
                  const active = isRouteActive(item.href);
                  const Icon = NAV_ICONS[item.href] ?? FolderGit2;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-l-2 border-violet-500 bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <Separator className="my-2" />
                {sessionUser ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-muted/60"
                  >
                    <LogOut className="size-4 shrink-0" aria-hidden="true" />
                    <span>Sign out ({sessionUser.name})</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  >
                    <LogIn className="size-4 shrink-0" aria-hidden="true" />
                    <span>Sign In / Workspace</span>
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
