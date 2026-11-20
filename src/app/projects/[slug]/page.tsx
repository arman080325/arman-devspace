import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCanonicalProjectByNumber,
  getCanonicalProjectBySlug,
  projects as canonicalProjects,
} from "@/data/projects";
import { getSessionUser } from "@/lib/auth";
import { getProjectDetail } from "@/services/devspace-store";

export function generateStaticParams() {
  return canonicalProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const canonical = getCanonicalProjectBySlug(slug);
  if (!canonical) {
    return { title: "Project Not Found" };
  }

  const padded = String(canonical.number).padStart(3, "0");
  return {
    title: `#${padded} ${canonical.title}`,
    description: canonical.description,
  };
}

async function ProjectDetailContent({ slug, tab }: { slug: string; tab?: string }) {
  const user = await getSessionUser();
  const detail = await getProjectDetail(slug, user?.id);

  if (!detail) {
    notFound();
  }

  const prev =
    detail.project.number > 1
      ? getCanonicalProjectByNumber(detail.project.number - 1)
      : undefined;
  const next =
    detail.project.number < 100
      ? getCanonicalProjectByNumber(detail.project.number + 1)
      : undefined;

  return (
    <ProjectWorkspace
      initialProject={detail.project}
      initialProgress={detail.progress}
      isAuthenticated={Boolean(user)}
      prevProject={
        prev ? { number: prev.number, title: prev.title, slug: prev.slug } : null
      }
      nextProject={
        next ? { number: next.number, title: next.title, slug: next.slug } : null
      }
      initialTab={tab}
    />
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const canonical = getCanonicalProjectBySlug(slug);
  if (!canonical) {
    notFound();
  }

  const resolvedSearch = searchParams ? await searchParams : undefined;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-6 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        }
      >
        <ProjectDetailContent slug={slug} tab={resolvedSearch?.tab} />
      </Suspense>
    </div>
  );
}
