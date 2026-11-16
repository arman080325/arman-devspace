import { NextResponse } from "next/server";
import {
  getCanonicalProjectById,
  getCanonicalProjectBySlug,
  projects,
} from "@/data/projects";
import { parseJsonBody, requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { githubBatchSyncSchema } from "@/lib/validations";
import { syncRepositoriesBatch } from "@/services/github";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = githubBatchSyncSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  let targetProjects = [...projects];

  if (validated.data.projectIds && validated.data.projectIds.length > 0) {
    targetProjects = validated.data.projectIds
      .map((id) => getCanonicalProjectById(id) ?? getCanonicalProjectBySlug(id))
      .filter((p): p is (typeof projects)[number] => Boolean(p));
  } else if (validated.data.difficulty && validated.data.difficulty !== "all") {
    targetProjects = targetProjects.filter(
      (p) => p.difficulty === validated.data.difficulty,
    );
  }

  const items = targetProjects.map((p) => ({
    projectId: p.id,
    originalRepoUrl: p.originalRepoUrl,
  }));

  const summary = await syncRepositoriesBatch(items, auth.user.id, {
    forceRefresh: validated.data.forceRefresh,
  });

  return NextResponse.json({ summary });
}
