import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { createMilestoneSchema, sanitizePlainText } from "@/lib/validations";
import {
  createProjectMilestone,
  toggleProjectMilestone,
} from "@/services/devspace-store";

const toggleMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  completed: z.boolean(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const { slug } = await context.params;
  const projResult = requireCanonicalProject(slug);
  if ("response" in projResult) return projResult.response;

  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = createMilestoneSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const milestone = await createProjectMilestone(auth.user.id, projResult.project.id, {
    title: sanitizePlainText(validated.data.title),
    dueDate: validated.data.dueDate ? sanitizePlainText(validated.data.dueDate) : null,
  });

  return NextResponse.json({ milestone }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const { slug } = await context.params;
  const projResult = requireCanonicalProject(slug);
  if ("response" in projResult) return projResult.response;

  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = toggleMilestoneSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const milestone = await toggleProjectMilestone(
    auth.user.id,
    projResult.project.id,
    validated.data.milestoneId,
    validated.data.completed,
  );

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  }

  return NextResponse.json({ milestone });
}
