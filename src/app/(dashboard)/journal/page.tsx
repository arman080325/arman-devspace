import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EngineeringJournalClient } from "@/components/journal";
import { getSessionUser } from "@/lib/auth";
import { getAllNotesForUser, getAllProjects } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Engineering Journal | Arman's Devspace",
  description:
    "Chronological technical journal logging architecture decisions, debugging notes, and modernization discoveries.",
  robots: { index: false, follow: false },
};

function JournalSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-5">
      <div className="h-14 w-64 rounded-panel bg-elevated/50 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-[420px] rounded-panel border border-line bg-surface animate-pulse lg:col-span-4" />
        <div className="h-[460px] rounded-panel border border-line bg-surface animate-pulse lg:col-span-8" />
      </div>
    </div>
  );
}

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
    <EngineeringJournalClient
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
    <Suspense fallback={<JournalSkeleton />}>
      <JournalContent />
    </Suspense>
  );
}
