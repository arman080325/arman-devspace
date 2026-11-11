import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAllProjects } from "@/services/devspace-store";
import type { Difficulty, Project } from "@/types/project";

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function matchesSearch(project: Project, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const numQuery = q.replace(/^#/, "");
  if (String(project.number) === numQuery) return true;

  const haystack = [
    project.title,
    project.slug,
    project.description,
    project.category,
    project.originalRepoUrl ?? "",
    ...project.technologies,
    ...project.recommendedStack,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "all";
  const category = searchParams.get("category") ?? "all";
  const technology = searchParams.get("technology") ?? searchParams.get("tech") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const verification = searchParams.get("verification") ?? "all";
  const bookmarkedOnly = searchParams.get("bookmarked") === "true";
  const includePlaceholders = searchParams.get("includePlaceholders") !== "false";
  const sort = searchParams.get("sort") ?? "number";

  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 100;

  const allProjects = await getAllProjects(user?.id);

  const filtered = allProjects.filter((project) => {
    if (!includePlaceholders && project.isPlaceholder) return false;
    if (search && !matchesSearch(project, search)) return false;
    if (difficulty !== "all" && project.difficulty !== difficulty) return false;
    if (category !== "all" && project.category.toLowerCase() !== category.toLowerCase()) {
      return false;
    }
    if (
      technology !== "all" &&
      !project.technologies.some(
        (tech) => tech.toLowerCase() === technology.toLowerCase(),
      )
    ) {
      return false;
    }
    if (status === "active") {
      if (project.status === "awaiting" || project.status === "completed") {
        return false;
      }
    } else if (status !== "all" && project.status !== status) {
      return false;
    }
    if (verification !== "all" && project.verificationStatus !== verification) {
      return false;
    }
    if (bookmarkedOnly && !project.bookmarked) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "number-desc":
        return b.number - a.number;
      case "title":
        return a.title.localeCompare(b.title);
      case "difficulty":
        return (
          DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
          a.number - b.number
        );
      case "completion":
        return (
          (b.completionPercentage ?? 0) - (a.completionPercentage ?? 0) ||
          a.number - b.number
        );
      case "recent":
        return (
          (b.lastAccessedAt ?? "").localeCompare(a.lastAccessedAt ?? "") ||
          a.number - b.number
        );
      case "number":
      default:
        return a.number - b.number;
    }
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const paginated = sorted.slice(startIndex, startIndex + limit);

  return NextResponse.json(
    {
      projects: paginated,
      total,
      page: safePage,
      limit,
      totalPages,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
