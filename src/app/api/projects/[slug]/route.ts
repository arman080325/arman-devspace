import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectDetail } from "@/services/devspace-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const user = await getSessionUser();
  const detail = await getProjectDetail(slug, user?.id);

  if (!detail) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json(detail, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
