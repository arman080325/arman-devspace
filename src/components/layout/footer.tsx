import Link from "next/link";
import { GitBranch, Terminal } from "lucide-react";

import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <span className="flex size-6 items-center justify-center rounded border border-violet-500/30 bg-violet-500/15 text-violet-400">
                <Terminal className="size-3.5" aria-hidden="true" />
              </span>
              <span>{siteConfig.name}</span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              {siteConfig.supportingStatement}
            </p>
            <p className="mt-1 font-mono text-xs text-violet-400">{siteConfig.tagline}</p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-wider text-foreground uppercase">
              Workspace
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/projects"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  100-Project Explorer
                </Link>
              </li>
              <li>
                <Link
                  href="/paths"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Learning Paths
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Developer Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/kanban"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Development Kanban
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-wider text-foreground uppercase">
              Engineering
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/technologies"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Technology Tracker
                </Link>
              </li>
              <li>
                <Link
                  href="/journal"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Engineering Journal
                </Link>
              </li>
              <li>
                <Link
                  href="/analytics"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Learning Analytics
                </Link>
              </li>
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <GitBranch className="size-3.5" aria-hidden="true" />
                  <span>GitHub Repository</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            &copy; 2026 {siteConfig.name}. Built for long-term software craftsmanship.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/80">
            100 Repositories &bull; Independent Workspaces
          </p>
        </div>
      </div>
    </footer>
  );
}
