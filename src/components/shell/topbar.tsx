"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, LogIn } from "lucide-react";
import { Mark } from "@/components/redesign/brand";
import { getWorkspaceBrandName } from "@/lib/brand";
import { IconButton, Kbd, Tooltip } from "@/components/redesign/ui";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PageBreadcrumbs, computeBreadcrumbs } from "./breadcrumbs";
import type { SessionUser } from "@/types/project";

export function TopBar({
  onOpenMobileNav,
  onOpenCommandPalette,
  sessionUser,
}: {
  onOpenMobileNav: () => void;
  onOpenCommandPalette: () => void;
  sessionUser?: SessionUser | null;
}) {
  const pathname = usePathname();
  const crumbs = computeBreadcrumbs(pathname);
  const brandName = getWorkspaceBrandName(sessionUser?.name);
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? brandName;

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-base px-2 md:px-4">
      {/* Mobile Drawer Toggle */}
      <IconButton
        label="Open navigation menu"
        size="touch"
        onClick={onOpenMobileNav}
        className="md:hidden"
      >
        <Menu size={18} strokeWidth={1.5} />
      </IconButton>

      {/* Mobile Brand Mark */}
      <Link
        href="/dashboard"
        className="inline-flex h-10 w-8 items-center justify-center md:hidden"
        aria-label={`${brandName}, overview`}
      >
        <Mark size={20} label={brandName} />
      </Link>

      {/* Mobile Page Title */}
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-fg md:hidden">
        {pageTitle}
      </h1>

      {/* Desktop Breadcrumbs */}
      <div className="hidden min-w-0 flex-1 md:block">
        <PageBreadcrumbs pathname={pathname} />
      </div>

      {/* Desktop Search Trigger Button */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden h-8 w-[260px] items-center gap-2 rounded-ctl border border-edge bg-inset px-2.5 text-sm text-fg3 transition-colors hover:border-edge hover:text-fg2 lg:flex"
        aria-label="Open command palette"
      >
        <Search size={14} strokeWidth={1.5} />
        <span className="flex-1 text-left">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      {/* Tablet/Mobile Search Icon Button */}
      <IconButton
        label="Search or jump to (Cmd+K)"
        shortcut={["⌘", "K"]}
        onClick={onOpenCommandPalette}
        className="h-10 w-10 lg:hidden md:h-8 md:w-8"
      >
        <Search size={16} strokeWidth={1.5} />
      </IconButton>

      {/* Activity / Notification Bell Link */}
      <Tooltip label="Activity Center" shortcut={["G", "A"]}>
        <Link
          href="/activity"
          aria-label="Activity Center"
          className="inline-flex h-8 w-8 items-center justify-center rounded-ctl text-fg2 transition-colors hover:bg-elevated hover:text-fg"
        >
          <Bell size={16} strokeWidth={1.5} />
        </Link>
      </Tooltip>

      {/* Theme Toggle Component */}
      <ThemeToggle />

      {/* User Login Link if Unauthenticated */}
      {!sessionUser && (
        <Link
          href="/login"
          className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-ctl border border-edge bg-surface text-xs font-medium text-fg hover:bg-elevated transition-colors"
        >
          <LogIn size={13} />
          <span>Sign in</span>
        </Link>
      )}
    </header>
  );
}
