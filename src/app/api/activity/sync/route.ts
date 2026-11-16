import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { syncProjectActivityIntelligence } from "@/services/activity";

const syncBodySchema = z
  .object({
    projectSlug: z.string().trim().max(100).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  const auth = await requireApiSession();
  if ("response" in auth) {
    return auth.response;
  }

  let projectSlug: string | undefined;

  // Body is optional
  const bodyResult = await parseJsonBody(request);
  if (!("response" in bodyResult) && bodyResult.data) {
    const parsed = syncBodySchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    projectSlug = parsed.data?.projectSlug;
  }

  try {
    const result = await syncProjectActivityIntelligence(auth.user.id, projectSlug);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronization failed.";
    return NextResponse.json({ error: message, synced: false }, { status: 500 });
  }
}
