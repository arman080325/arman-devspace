import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { createTaskSchema, sanitizePlainText, toggleTaskSchema } from "@/lib/validations";
import {
  createProjectTask,
  deleteProjectTask,
  toggleProjectTask,
} from "@/services/devspace-store";

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

  const validated = createTaskSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const task = await createProjectTask(auth.user.id, projResult.project.id, {
    title: sanitizePlainText(validated.data.title),
    phase: sanitizePlainText(validated.data.phase),
  });

  return NextResponse.json({ task }, { status: 201 });
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

  const validated = toggleTaskSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const task = await toggleProjectTask(
    auth.user.id,
    projResult.project.id,
    validated.data.taskId,
    validated.data.completed,
  );

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const { slug } = await context.params;
  const projResult = requireCanonicalProject(slug);
  if ("response" in projResult) return projResult.response;

  const { searchParams } = new URL(request.url);
  let taskId = searchParams.get("taskId");

  if (!taskId) {
    try {
      const body = (await request.json()) as { taskId?: string };
      taskId = typeof body.taskId === "string" ? body.taskId : null;
    } catch {
      taskId = null;
    }
  }

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required." }, { status: 400 });
  }

  const deleted = await deleteProjectTask(auth.user.id, projResult.project.id, taskId);

  if (!deleted) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
