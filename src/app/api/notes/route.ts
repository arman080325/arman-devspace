import { NextResponse } from "next/server";
import { getCanonicalProjectById } from "@/data/projects";
import { parseJsonBody, requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { createNoteSchema, sanitizePlainText } from "@/lib/validations";
import {
  createProjectNote,
  deleteProjectNote,
  getAllNotesForUser,
} from "@/services/devspace-store";

export async function GET() {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const notes = await getAllNotesForUser(auth.user.id);
  return NextResponse.json(
    { notes },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = createNoteSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const canonical = getCanonicalProjectById(validated.data.projectId);
  if (!canonical) {
    return NextResponse.json(
      { error: "Referenced project does not exist." },
      { status: 404 },
    );
  }

  const note = await createProjectNote(auth.user.id, {
    projectId: canonical.id,
    title: sanitizePlainText(validated.data.title),
    content: sanitizePlainText(validated.data.content),
    type: validated.data.type,
  });

  return NextResponse.json(
    {
      note: {
        ...note,
        projectTitle: canonical.title,
        projectSlug: canonical.slug,
        projectNumber: canonical.number,
      },
    },
    { status: 201 },
  );
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
