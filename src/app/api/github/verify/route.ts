import { NextResponse } from "next/server";
import { getCanonicalProjectById, getCanonicalProjectBySlug } from "@/data/projects";
import { parseJsonBody, requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { githubVerifySchema } from "@/lib/validations";
import { saveRepositoryVerification } from "@/services/devspace-store";
import { inspectGitHubRepository } from "@/services/github";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = githubVerifySchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const canonical =
    getCanonicalProjectById(validated.data.projectId) ??
    getCanonicalProjectBySlug(validated.data.projectId);

  if (!canonical) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const effectiveOverride = validated.data.overrideUrl?.trim() || undefined;
  const targetUrl = effectiveOverride ?? canonical.originalRepoUrl;

  if (!targetUrl) {
    return NextResponse.json(
      {
        error:
          "This reserved placeholder slot does not have a source repository URL yet.",
      },
      { status: 400 },
    );
  }

  const inspection = await inspectGitHubRepository(
    canonical.originalRepoUrl ?? targetUrl,
    effectiveOverride,
  );

  if (inspection.rateLimited) {
    return NextResponse.json(
      {
        error:
          inspection.error ??
          "GitHub API rate limit reached. Add GITHUB_TOKEN in .env to raise your hourly quota.",
        rateLimited: true,
        rateLimitResetAt: inspection.rateLimitResetAt ?? null,
        verification: inspection,
      },
      { status: 429 },
    );
  }

  await saveRepositoryVerification(auth.user.id, canonical.id, {
    verificationStatus: inspection.verificationStatus,
    verifiedRepoUrl: inspection.verifiedRepoUrl,
    discrepancyNotes: inspection.discrepancyNotes,
    metadata: inspection.metadata,
  });

  return NextResponse.json({ verification: inspection });
}
