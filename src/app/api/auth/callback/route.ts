import { NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/lib/api-helpers";
import { setSessionCookie } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncExternalAuthUser } from "@/services/devspace-store";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = getSafeRedirectPath(searchParams.get("next"), "/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth-missing-code", origin));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=oauth-not-configured", origin));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user || !data.user.email) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", origin));
  }

  const displayName =
    (typeof data.user.user_metadata?.full_name === "string" &&
      data.user.user_metadata.full_name) ||
    (typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name) ||
    data.user.email.split("@")[0] ||
    "Developer";

  // Strict provider-verified email check: only trust provider-controlled email_confirmed_at.
  // Never trust user_metadata.email_verified which could be set by arbitrary OAuth payload or user metadata.
  const isEmailVerified =
    typeof data.user.email_confirmed_at === "string" &&
    data.user.email_confirmed_at.trim().length > 0;

  const sessionUser = await syncExternalAuthUser({
    email: data.user.email,
    name: displayName,
    supabaseId: data.user.id,
    isEmailVerified,
  });

  await setSessionCookie(sessionUser);

  return NextResponse.redirect(new URL(nextPath, origin));
}
