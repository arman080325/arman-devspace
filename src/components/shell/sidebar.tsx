"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Moon,
  Sun,
  Monitor,
  Settings2,
  ShieldCheck,
  Plug,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Mark, Wordmark } from "@/components/redesign/brand";
import { getWorkspaceBrandName } from "@/lib/brand";
import { IconButton, Tooltip, Popover, MenuItem, cx } from "@/components/redesign/ui";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./nav-items";
import { MiniHundred } from "./mini-hundred";
import type { SessionUser } from "@/types/project";

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  sessionUser,
  onSignOut,
  activeProjectNumber,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  sessionUser?: SessionUser | null;
  onSignOut?: () => void;
  activeProjectNumber?: number;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountAnchor = useRef<HTMLButtonElement>(null);

  const isNavActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const userInitials = sessionUser?.name
    ? sessionUser.name
        .split(" ")
        .map((x) => x[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : sessionUser?.email
      ? sessionUser.email[0].toUpperCase()
      : "AD";

  const brandName = getWorkspaceBrandName(sessionUser?.name);

  return (
    <nav
      aria-label="Main Navigation"
      className={cx(
        "flex h-full flex-col border-r border-line bg-surface select-none",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand Header */}
      <div
        className={cx(
          "flex h-12 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center" : "justify-between pl-4 pr-2",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 rounded-ctl focus-visible:outline-2 focus-visible:outline-sodium"
          aria-label={`${brandName}, overview`}
        >
          <Mark size={24} label={brandName} />
          {!collapsed && (
            <Wordmark name={sessionUser?.name} className="truncate text-[15px]" />
          )}
        </Link>
        {!collapsed && onToggleCollapse && (
          <IconButton
            label="Collapse sidebar"
            shortcut={["["]}
            size="s"
            onClick={onToggleCollapse}
          >
            <PanelLeftClose size={16} strokeWidth={1.5} />
          </IconButton>
        )}
      </div>

      {/* Mini Hundred Matrix */}
      <MiniHundred
        collapsed={collapsed}
        activeNumber={activeProjectNumber}
        onNavigate={onNavigate}
      />

      {/* Navigation Links Scrollable Region */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const on = isNavActive(item.path);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.path}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "relative flex items-center gap-2.5 rounded-ctl text-sm transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-sodium",
                  collapsed ? "h-10 w-12 justify-center" : "h-8 px-2.5",
                  on
                    ? "bg-elevated font-medium text-fg"
                    : "text-fg2 hover:bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] hover:text-fg",
                )}
              >
                {on && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-[1px] bg-sodium"
                  />
                )}
                <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            return (
              <li key={item.id}>
                {collapsed ? (
                  <Tooltip
                    label={item.label}
                    shortcut={item.key ? ["G", item.key] : undefined}
                    side="right"
                  >
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>

        {/* Secondary Navigation Section */}
        {!collapsed && (
          <div className="mt-4 px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-fg3">
            Workspace
          </div>
        )}
        <ul className="flex flex-col gap-0.5">
          {SECONDARY_NAV_ITEMS.map((item) => {
            const on = isNavActive(item.path);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.path}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "relative flex items-center gap-2.5 rounded-ctl text-sm transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-sodium",
                  collapsed ? "h-10 w-12 justify-center" : "h-8 px-2.5",
                  on
                    ? "bg-elevated font-medium text-fg"
                    : "text-fg2 hover:bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] hover:text-fg",
                )}
              >
                {on && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-[1px] bg-sodium"
                  />
                )}
                <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            return (
              <li key={item.id}>
                {collapsed ? (
                  <Tooltip
                    label={item.label}
                    shortcut={item.key ? ["G", item.key] : undefined}
                    side="right"
                  >
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Footer Section: Settings, Appearance & Account */}
      <div className="shrink-0 border-t border-line p-2 space-y-1.5">
        {(() => {
          const settingsActive = isNavActive("/settings");
          const settingsLink = (
            <Link
              href="/settings"
              onClick={onNavigate}
              aria-current={settingsActive ? "page" : undefined}
              className={cx(
                "relative flex items-center gap-2.5 rounded-ctl text-sm transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-sodium",
                collapsed ? "mx-auto h-9 w-12 justify-center" : "h-8 px-2.5",
                settingsActive
                  ? "bg-elevated font-medium text-fg"
                  : "text-fg2 hover:bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] hover:text-fg",
              )}
            >
              {settingsActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-[1px] bg-sodium"
                />
              )}
              <Settings2 size={16} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && <span className="truncate">Settings</span>}
            </Link>
          );

          return collapsed ? (
            <Tooltip label="Settings" shortcut={["G", "S"]} side="right">
              {settingsLink}
            </Tooltip>
          ) : (
            settingsLink
          );
        })()}

        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <IconButton
              ref={accountAnchor}
              label={sessionUser ? sessionUser.name || sessionUser.email : "Account"}
              size="s"
              onClick={() => setAccountOpen((prev) => !prev)}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-elevated text-xs font-semibold text-sodium-text">
                {userInitials}
              </span>
            </IconButton>
            {onToggleCollapse && (
              <IconButton
                label="Expand sidebar"
                shortcut={["["]}
                size="s"
                onClick={onToggleCollapse}
              >
                <PanelLeftOpen size={16} strokeWidth={1.5} />
              </IconButton>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <button
              ref={accountAnchor}
              onClick={() => setAccountOpen((prev) => !prev)}
              aria-label="Account menu"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-ctl p-1.5 text-left transition-colors hover:bg-elevated"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated border border-edge text-xs font-semibold text-sodium-text">
                {userInitials}
              </span>
              <div className="min-w-0 flex-1 truncate">
                <p className="truncate text-xs font-medium text-fg">
                  {sessionUser ? sessionUser.name || "Developer" : "Devspace Account"}
                </p>
                <p className="truncate text-2xs text-fg3">
                  {sessionUser ? sessionUser.email : "Explore & build"}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Account & Appearance Popover */}
        <Popover
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          anchor={accountAnchor}
          width={230}
          align="start"
        >
          {sessionUser ? (
            <>
              <div className="border-b border-line px-3 py-2 text-xs">
                <p className="font-semibold text-fg">{sessionUser.name || "Owner"}</p>
                <p className="truncate text-2xs text-fg3">{sessionUser.email}</p>
              </div>
              <MenuItem
                icon={<User size={14} />}
                onClick={() => {
                  setAccountOpen(false);
                  onNavigate?.();
                }}
              >
                <Link href="/settings?section=profile" className="block w-full">
                  Account profile
                </Link>
              </MenuItem>
              <MenuItem
                icon={<ShieldCheck size={14} />}
                onClick={() => {
                  setAccountOpen(false);
                  onNavigate?.();
                }}
              >
                <Link href="/settings?section=security" className="block w-full">
                  Account security
                </Link>
              </MenuItem>
              <MenuItem
                icon={<Plug size={14} />}
                onClick={() => {
                  setAccountOpen(false);
                  onNavigate?.();
                }}
              >
                <Link href="/settings?section=integrations" className="block w-full">
                  Integrations
                </Link>
              </MenuItem>
              <div className="my-1 h-px bg-line" />
              <MenuItem
                icon={<LogOut size={14} />}
                danger
                onClick={() => {
                  setAccountOpen(false);
                  onSignOut?.();
                }}
              >
                Sign out
              </MenuItem>
            </>
          ) : (
            <MenuItem
              icon={<User size={14} />}
              onClick={() => {
                setAccountOpen(false);
                onNavigate?.();
              }}
            >
              <Link href="/login" className="block w-full">
                Sign in
              </Link>
            </MenuItem>
          )}

          <div className="border-t border-line px-2 py-1 text-2xs font-medium uppercase tracking-wider text-fg3">
            Appearance
          </div>
          <MenuItem
            icon={<Moon size={14} />}
            selected={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            Night Shift
          </MenuItem>
          <MenuItem
            icon={<Sun size={14} />}
            selected={theme === "light"}
            onClick={() => setTheme("light")}
          >
            Day Shift
          </MenuItem>
          <MenuItem
            icon={<Monitor size={14} />}
            selected={theme === "system"}
            onClick={() => setTheme("system")}
          >
            System
          </MenuItem>
        </Popover>
      </div>
    </nav>
  );
}
