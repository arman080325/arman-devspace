import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";

import { JournalClient } from "@/components/dashboard/journal-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { getAllNotesForUser, getAllProjects } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Engineering Journal",
  description:
    "Chronological technical journal logging architecture decisions, debugging notes, and modernization discoveries.",
  robots: { index: false, follow: false },
};

async function JournalContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/journal");
  }

  const [notes, projects] = await Promise.all([
    getAllNotesForUser(user.id),
    getAllProjects(user.id),
  ]);

  return (
    <JournalClient
      initialNotes={notes}
      projects={projects.map((p) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        slug: p.slug,
        isPlaceholder: p.isPlaceholder,
      }))}
    />
  );
}

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
          <BookText className="size-4" aria-hidden="true" />
          <span>Persisted Engineering Log</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Engineering Journal
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Capture architectural write-ups, root-cause bug analyses, and implementation
          lessons across every project workspace.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[460px] w-full rounded-xl" />}>
        <JournalContent />
      </Suspense>
    </div>
  );
}
