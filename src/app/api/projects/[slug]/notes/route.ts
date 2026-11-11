import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { createNoteSchema, sanitizePlainText } from "@/lib/validations";
import { createProjectNote, deleteProjectNote } from "@/services/devspace-store";

const projectNoteInputSchema = createNoteSchema.omit({ projectId: true });

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

  const validated = projectNoteInputSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const note = await createProjectNote(auth.user.id, {
    projectId: projResult.project.id,
    title: sanitizePlainText(validated.data.title),
    content: sanitizePlainText(validated.data.content),
    type: validated.data.type,
  });

  return NextResponse.json({ note }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  let noteId = searchParams.get("noteId");

  if (!noteId) {
    try {
      const body = (await request.json()) as { noteId?: string };
      noteId = typeof body.noteId === "string" ? body.noteId : null;
    } catch {
      noteId = null;
    }
  }

  if (!noteId) {
    return NextResponse.json({ error: "noteId is required." }, { status: 400 });
  }

  const deleted = await deleteProjectNote(auth.user.id, noteId);
  if (!deleted) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
