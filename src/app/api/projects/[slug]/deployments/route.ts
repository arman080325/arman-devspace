import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { createDeploymentSchema, sanitizePlainText } from "@/lib/validations";
import { addDeploymentRecord } from "@/services/devspace-store";

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

  const validated = createDeploymentSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const deployment = await addDeploymentRecord(auth.user.id, projResult.project.id, {
    environment: validated.data.environment,
    url: validated.data.url,
    provider: sanitizePlainText(validated.data.provider),
    status: validated.data.status,
    notes: validated.data.notes ? sanitizePlainText(validated.data.notes) : null,
  });

  return NextResponse.json({ deployment }, { status: 201 });
}
