import { NextResponse } from "next/server";
import { parseJsonBody, zodErrorResponse } from "@/lib/api-helpers";
import { setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { authenticateUserAccount } from "@/services/devspace-store";

export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = loginSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const result = await authenticateUserAccount({
    email: validated.data.email,
    password: validated.data.password,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  await setSessionCookie(result.user);

  return NextResponse.json({ user: result.user }, { status: 200 });
}
