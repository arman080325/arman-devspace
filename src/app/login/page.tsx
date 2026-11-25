import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSafeRedirectPath } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to access your Arman's Devspace developer workspace.",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  "oauth-failed": "Google authentication could not be completed. Please try again.",
  "oauth-not-configured": "Supabase OAuth is not configured in environment variables.",
  "oauth-missing-code": "Missing OAuth authorization code.",
  "session-expired": "Your session has expired. Please sign in again.",
  "unverified-email":
    "Email address verification is required by the authentication provider.",
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const rawRedirect = params.redirect ?? params.next;
  const hasExplicitRedirect = Boolean(rawRedirect && rawRedirect.trim().length > 0);
  const redirectTarget = getSafeRedirectPath(rawRedirect, "/dashboard");

  if (user) {
    redirect(redirectTarget);
  }

  const initialError = params.error ? (ERROR_MESSAGES[params.error] ?? null) : null;

  return (
    <AuthForm
      mode="login"
      redirectTo={redirectTarget}
      hasExplicitRedirect={hasExplicitRedirect}
      initialError={initialError}
    />
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string; error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-inset px-4">
          <div className="h-[440px] w-full max-w-[432px] animate-pulse rounded-panel border border-line bg-surface" />
        </div>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
