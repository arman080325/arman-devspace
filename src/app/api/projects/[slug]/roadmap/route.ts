import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { updateRoadmapItemSchema } from "@/lib/validations";
import { updateRoadmapPhaseStatus } from "@/services/devspace-store";

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

  const validated = updateRoadmapItemSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const roadmap = await updateRoadmapPhaseStatus(
    auth.user.id,
    projResult.project.id,
    validated.data.roadmapId,
    validated.data.status,
  );

  return NextResponse.json({ roadmap });
}
