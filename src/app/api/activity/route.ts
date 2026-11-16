import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { getActivityFeed } from "@/services/activity";
import type { ActivityCategory, ActivitySeverity } from "@/types/activity";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(["repository", "deployment", "ci", "workspace", "all"]).optional(),
  severity: z.enum(["critical", "warning", "success", "info", "all"]).optional(),
  status: z.enum(["read", "unread", "all"]).optional(),
  project: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiSession();
  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    severity: searchParams.get("severity") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    project: searchParams.get("project") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const feed = await getActivityFeed(auth.user.id, {
    page: parsed.data.page,
    limit: parsed.data.limit,
    category: parsed.data.category as ActivityCategory | "all" | undefined,
    severity: parsed.data.severity as ActivitySeverity | "all" | undefined,
    status: parsed.data.status,
    projectSlugOrId: parsed.data.project,
    search: parsed.data.search,
  });

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
