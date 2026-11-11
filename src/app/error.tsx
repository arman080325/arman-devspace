"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(`[${siteConfig.name}] Route error:`, error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-xs tracking-wider text-muted-foreground uppercase">
        {siteConfig.name} &bull; Runtime Recovery
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Something went wrong in this workspace
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while rendering this route."}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground/80">
          Digest: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="gap-2">
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="outline" render={<Link href="/" />}>
          Return Home
        </Button>
      </div>
    </div>
  );
}
