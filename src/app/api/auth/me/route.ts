import { NextResponse } from "next/server";
import { parseJsonBody, requireApiSession, zodErrorResponse } from "@/lib/api-helpers";
import { getSessionUser, setSessionCookie } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validations";
import { updateUserProfileName } from "@/services/devspace-store";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = updateProfileSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const result = await updateUserProfileName(auth.user.id, validated.data.name);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Re-sign HttpOnly session cookie with updated display name (never touches role/email/id)
  await setSessionCookie(result.user);

  return NextResponse.json(
    {
      user: result.user,
      profile: result.profile,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
