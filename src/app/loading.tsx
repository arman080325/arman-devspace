import { Terminal } from "lucide-react";

import { siteConfig } from "@/config/site";

export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center"
      role="status"
      aria-label={`Loading ${siteConfig.name}`}
    >
      <div className="flex size-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400">
        <Terminal className="size-6 animate-pulse" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{siteConfig.name}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        Initializing workspace…
      </p>
    </div>
  );
}
