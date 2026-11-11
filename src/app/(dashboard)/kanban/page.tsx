import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Kanban } from "lucide-react";

import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { getAllProjects } from "@/services/devspace-store";

export const metadata: Metadata = {
  title: "Kanban Board",
  description:
    "Manage modernization stages across Backlog, Cloned, Analyzing, Planning, In Development, Testing, and Completed.",
  robots: { index: false, follow: false },
};

async function KanbanContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/kanban");
  }

  const projects = await getAllProjects(user.id);
  return <KanbanBoard initialProjects={projects} />;
}

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-400">
          <Kanban className="size-4" aria-hidden="true" />
          <span>7-Column Engineering Workflow</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Development Kanban
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Transition repositories across Backlog, Cloned, Analyzing, Planning, In
          Development, Testing, and Completed via drag-and-drop or accessible stage
          controls.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-xl" />}>
        <KanbanContent />
      </Suspense>
    </div>
  );
}
