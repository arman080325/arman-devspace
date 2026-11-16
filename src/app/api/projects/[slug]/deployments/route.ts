import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiSession,
  requireCanonicalProject,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { createDeploymentSchema, sanitizePlainText } from "@/lib/validations";
import { addDeploymentRecord, getProjectDetail } from "@/services/devspace-store";
import {
  fetchRepositoryWorkflowRuns,
  type GitHubWorkflowRunsResult,
} from "@/services/github";
import {
  fetchVercelDeployments,
  isVercelConfigured,
  type VercelDeploymentsResult,
} from "@/services/vercel";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const { slug } = await context.params;
  const projResult = requireCanonicalProject(slug);
  if ("response" in projResult) return projResult.response;

  const detail = await getProjectDetail(slug, auth.user.id);
  const userDeployments = detail?.progress?.deployments ?? [];

  // Upstream GitHub Actions runs
  const repoUrl =
    detail?.project.verifiedRepoUrl ?? detail?.project.originalRepoUrl ?? "";
  let ciResult: GitHubWorkflowRunsResult = { available: false, totalCount: 0, runs: [] };
  if (repoUrl) {
    try {
      ciResult = await fetchRepositoryWorkflowRuns(repoUrl);
    } catch {
      ciResult = { available: false, totalCount: 0, runs: [] };
    }
  }

  // Live Vercel deployments if configured
  let vercelResult: VercelDeploymentsResult = { configured: false, deployments: [] };
  if (isVercelConfigured()) {
    try {
      vercelResult = await fetchVercelDeployments({ limit: 5 });
    } catch {
      vercelResult = { configured: true, deployments: [] };
    }
  }

  return NextResponse.json(
    {
      deployments: userDeployments,
      ci: ciResult,
      vercel: vercelResult,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

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
