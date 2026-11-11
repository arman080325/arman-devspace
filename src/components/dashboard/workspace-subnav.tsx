"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookText, FolderGit2, Kanban, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

const WORKSPACE_LINKS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kanban Board", href: "/kanban", icon: Kanban },
  { label: "Engineering Journal", href: "/journal", icon: BookText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function WorkspaceSubnav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/70 bg-secondary/20">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <nav aria-label="Workspace" className="flex flex-wrap items-center gap-1">
          {WORKSPACE_LINKS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/projects"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border/80 bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <FolderGit2 className="size-3.5 text-violet-400" aria-hidden="true" />
          <span>Explore 100 Projects</span>
        </Link>
      </div>
    </div>
  );
}
