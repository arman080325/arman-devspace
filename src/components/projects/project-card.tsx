"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  ExternalLink,
  FolderGit2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getVerificationMeta } from "@/config/workflow";
import {
  cn,
  getDifficultyBgColor,
  getDifficultyColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  onBookmarkToggled?: (projectId: string, bookmarked: boolean) => void;
  showBookmarkButton?: boolean;
}

export function ProjectCard({
  project,
  onBookmarkToggled,
  showBookmarkButton = true,
}: ProjectCardProps) {
  const router = useRouter();
  const [bookmarkOverride, setBookmarkOverride] = React.useState<{
    id: string;
    value: boolean;
  } | null>(null);
  const [savingBookmark, setSavingBookmark] = React.useState(false);

  const bookmarked =
    bookmarkOverride?.id === project.id
      ? bookmarkOverride.value
      : Boolean(project.bookmarked);

  const verification = getVerificationMeta(project.verificationStatus);
  const paddedNumber = String(project.number).padStart(3, "0");
  const repoHref = project.verifiedRepoUrl ?? project.originalRepoUrl?.trim() ?? null;

  const handleToggleBookmark = async () => {
    if (savingBookmark) return;
    setSavingBookmark(true);
    const nextValue = !bookmarked;
    try {
      const response = await fetch(`/api/projects/${project.slug}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: nextValue }),
      });

      if (response.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(`/projects/${project.slug}`)}`);
        return;
      }

      if (response.ok) {
        setBookmarkOverride({ id: project.id, value: nextValue });
        onBookmarkToggled?.(project.id, nextValue);
      }
    } finally {
      setSavingBookmark(false);
    }
  };

  return (
    <Card
      className={cn(
        "flex h-full flex-col justify-between border-border/80 bg-card transition-colors hover:border-violet-500/40",
        project.isPlaceholder && "border-dashed opacity-90",
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              #{paddedNumber}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] capitalize",
                getDifficultyBgColor(project.difficulty),
                getDifficultyColor(project.difficulty),
              )}
            >
              {project.difficulty}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[11px]", getStatusColor(project.status))}
            >
              {getStatusLabel(project.status)}
            </Badge>
          </div>

          {showBookmarkButton && !project.isPlaceholder ? (
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={savingBookmark}
              aria-pressed={bookmarked}
              aria-label={
                bookmarked
                  ? `Remove bookmark for ${project.title}`
                  : `Bookmark ${project.title}`
              }
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                bookmarked
                  ? "text-violet-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bookmark
                className={cn("size-4", bookmarked && "fill-current")}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>

        <div className="space-y-1">
          <CardTitle className="text-base leading-snug font-semibold tracking-tight">
            <Link
              href={`/projects/${project.slug}`}
              className="hover:text-violet-400 focus-visible:underline focus-visible:outline-none"
            >
              {project.title}
            </Link>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{project.category}</p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-4">
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        {project.technologies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Technologies">
            {project.technologies.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 4 ? (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                +{project.technologies.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}

        {project.verificationStatus !== "verified" || project.discrepancyNotes ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge
              variant="outline"
              className={cn("gap-1 text-[11px]", verification.classes)}
            >
              {project.verificationStatus !== "verified" && !project.isPlaceholder ? (
                <AlertTriangle className="size-3" aria-hidden="true" />
              ) : null}
              <span>{verification.label}</span>
            </Badge>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        {repoHref ? (
          <a
            href={repoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FolderGit2 className="size-3.5" aria-hidden="true" />
            <span>Repository</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <FolderGit2 className="size-3.5" aria-hidden="true" />
            <span>Awaiting repo URL</span>
          </span>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1 px-2.5 text-xs"
          render={<Link href={`/projects/${project.slug}`} />}
        >
          <span>{project.isPlaceholder ? "Inspect Slot" : "Open Workspace"}</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
