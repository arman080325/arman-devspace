import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { createScreenshotSchema, sanitizePlainText } from "@/lib/validations";
import { addProjectScreenshot } from "@/services/devspace-store";

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

  const validated = createScreenshotSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const screenshot = await addProjectScreenshot(auth.user.id, projResult.project.id, {
    title: sanitizePlainText(validated.data.title),
    url: validated.data.url,
    caption: validated.data.caption ? sanitizePlainText(validated.data.caption) : null,
  });

  return NextResponse.json({ screenshot }, { status: 201 });
}
