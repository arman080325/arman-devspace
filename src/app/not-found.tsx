import Link from "next/link";
import { Compass, FolderGit2, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-violet-400">
        <Terminal className="size-6" aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-xs tracking-wider text-muted-foreground uppercase">
        {siteConfig.name} &bull; 404
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Workspace route not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The requested project or page could not be located inside the 100-project
        engineering catalogue.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/projects" />} className="gap-2">
          <FolderGit2 className="size-4" aria-hidden="true" />
          Explore 100 Projects
        </Button>
        <Button variant="outline" render={<Link href="/" />} className="gap-2">
          <Compass className="size-4" aria-hidden="true" />
          Homepage
        </Button>
      </div>
    </div>
  );
}
