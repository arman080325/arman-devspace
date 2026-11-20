"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { projects as canonicalProjects } from "@/data/projects";
import { cx } from "@/components/redesign/ui";

export interface Crumb {
  label: string;
  href?: string;
  num?: boolean;
}

export function computeBreadcrumbs(pathname: string): Crumb[] {
  if (!pathname || pathname === "/") {
    return [{ label: "Overview" }];
  }

  if (pathname === "/dashboard") {
    return [{ label: "Overview" }];
  }

  if (pathname === "/projects") {
    return [{ label: "All projects" }];
  }

  if (pathname.startsWith("/projects/")) {
    const slug = pathname.replace("/projects/", "").split("/")[0];
    const p = canonicalProjects.find((x) => x.slug === slug || String(x.number) === slug);
    const projectTitle = p ? `${String(p.number).padStart(3, "0")} ${p.title}` : slug;
    return [
      { label: "All projects", href: "/projects" },
      { label: projectTitle, href: `/projects/${slug}`, num: true },
    ];
  }

  if (pathname === "/paths" || pathname.startsWith("/paths/")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 1) {
      return [{ label: "Categories" }];
    }
    const level = parts[1];
    const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
    return [{ label: "Categories", href: "/paths" }, { label: levelLabel }];
  }

  if (pathname === "/activity") {
    return [{ label: "Activity" }];
  }

  if (pathname === "/kanban") {
    return [{ label: "Roadmaps" }];
  }

  if (pathname === "/technologies") {
    return [{ label: "Repository intelligence" }];
  }

  if (pathname === "/journal") {
    return [{ label: "Engineering Journal" }];
  }

  if (pathname === "/analytics") {
    return [{ label: "Learning Analytics" }];
  }

  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return [{ label: "Settings" }];
  }

  // Fallback for custom or secondary paths
  const name = pathname.slice(1).replace(/-/g, " ");
  return [{ label: name.charAt(0).toUpperCase() + name.slice(1) }];
}

export function PageBreadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = computeBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li
              key={i}
              className={cx("flex min-w-0 items-center gap-1", !isLast && "shrink-0")}
            >
              {i > 0 && (
                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                  className="text-fg3"
                  aria-hidden="true"
                />
              )}
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="truncate rounded-ctl px-1 text-fg2 transition-colors hover:text-fg"
                >
                  {c.num ? (
                    <>
                      <span className="tnum font-medium text-fg">
                        {c.label.slice(0, 3)}
                      </span>
                      <span>{c.label.slice(3)}</span>
                    </>
                  ) : (
                    c.label
                  )}
                </Link>
              ) : (
                <span aria-current="page" className="truncate px-1 font-medium text-fg">
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
