import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { markActivityAsRead } from "@/services/activity";

const patchBodySchema = z.object({
  isRead: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await props.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid activity ID." }, { status: 400 });
  }

  const bodyResult = await parseJsonBody(request);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const parsed = patchBodySchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const updated = await markActivityAsRead(auth.user.id, id, parsed.data.isRead);

  if (!updated) {
    return NextResponse.json(
      { error: "Activity event not found or access denied." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, event: updated });
}
