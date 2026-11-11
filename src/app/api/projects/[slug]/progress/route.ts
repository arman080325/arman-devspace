import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { projectProgressUpdateSchema, sanitizePlainText } from "@/lib/validations";
import { updateProjectProgress } from "@/services/devspace-store";

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

  const validated = projectProgressUpdateSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const input = validated.data;
  const patch: Parameters<typeof updateProjectProgress>[2] = {};

  if (input.status !== undefined) patch.status = input.status;
  if (input.bookmarked !== undefined) patch.bookmarked = input.bookmarked;
  if (input.completionPercentage !== undefined) {
    patch.completionPercentage = input.completionPercentage;
  }
  if (input.localClonePath !== undefined) {
    patch.localClonePath =
      input.localClonePath === null || input.localClonePath === ""
        ? null
        : sanitizePlainText(input.localClonePath);
  }
  if (input.deploymentUrl !== undefined) {
    patch.deploymentUrl =
      input.deploymentUrl === null || input.deploymentUrl === ""
        ? null
        : input.deploymentUrl;
  }
  if (input.originalArchitecture !== undefined) {
    patch.originalArchitecture =
      input.originalArchitecture === null
        ? null
        : sanitizePlainText(input.originalArchitecture);
  }
  if (input.modernizationArchitecture !== undefined) {
    patch.modernizationArchitecture =
      input.modernizationArchitecture === null
        ? null
        : sanitizePlainText(input.modernizationArchitecture);
  }
  if (input.technicalDocumentation !== undefined) {
    patch.technicalDocumentation =
      input.technicalDocumentation === null
        ? null
        : sanitizePlainText(input.technicalDocumentation);
  }
  if (input.testingSummary !== undefined) {
    patch.testingSummary =
      input.testingSummary === null ? null : sanitizePlainText(input.testingSummary);
  }

  const progress = await updateProjectProgress(
    auth.user.id,
    projResult.project.id,
    patch,
  );

  return NextResponse.json({ progress });
}
