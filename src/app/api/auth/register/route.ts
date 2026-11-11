import { NextResponse } from "next/server";
import { parseJsonBody, zodErrorResponse } from "@/lib/api-helpers";
import { setSessionCookie } from "@/lib/auth";
import { sanitizePlainText, signupSchema } from "@/lib/validations";
import { registerUserAccount } from "@/services/devspace-store";

export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const validated = signupSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return zodErrorResponse(validated.error);
  }

  const result = await registerUserAccount({
    name: sanitizePlainText(validated.data.name),
    email: validated.data.email,
    password: validated.data.password,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await setSessionCookie(result.user);

  return NextResponse.json({ user: result.user }, { status: 201 });
}
