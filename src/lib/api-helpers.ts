import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getCanonicalProjectBySlug } from "@/data/projects";
import { getSessionUser } from "@/lib/auth";
import { getSafeRedirectPath } from "@/lib/validations";
import type { Project, SessionUser } from "@/types/project";

export { getSafeRedirectPath };

export async function parseJsonBody(
  request: Request,
): Promise<{ data: unknown } | { response: NextResponse }> {
  try {
    const data = await request.json();
    return { data };
  } catch {
    return {
      response: NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      ),
    };
  }
}

export function zodErrorResponse(error: ZodError, status = 400): NextResponse {
  const firstIssue = error.issues[0];
  return NextResponse.json(
    {
      error: firstIssue?.message ?? "Validation failed.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status },
  );
}

export async function requireApiSession(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required. Sign in to modify workspace data." },
        { status: 401 },
      ),
    };
  }
  return { user };
}

export async function requireOwnerSession(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const sessionResult = await requireApiSession();
  if ("response" in sessionResult) {
    return sessionResult;
  }
  if (sessionResult.user.role !== "owner") {
    return {
      response: NextResponse.json(
        { error: "Forbidden. Owner privileges required." },
        { status: 403 },
      ),
    };
  }
  return sessionResult;
}

export function requireCanonicalProject(
  slug: string,
): { project: Project } | { response: NextResponse } {
  const project = getCanonicalProjectBySlug(slug);
  if (!project) {
    return {
      response: NextResponse.json(
        { error: "Project not found in canonical 100-project collection." },
        { status: 404 },
      ),
    };
  }
  return { project };
}
