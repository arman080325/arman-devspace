import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getSafeRedirectPath } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to access your Arman's Devspace developer workspace.",
  robots: { index: false, follow: false },
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const redirectTarget = getSafeRedirectPath(
    params.redirect ?? params.next,
    "/dashboard",
  );

  if (user) {
    redirect(redirectTarget);
  }

  const oauthErrorMessage =
    params.error === "oauth-failed"
      ? "Google authentication could not be completed. Please try again."
      : params.error === "oauth-not-configured"
        ? "Supabase OAuth is not configured in environment variables."
        : params.error === "oauth-missing-code"
          ? "Missing OAuth authorization code."
          : null;

  return (
    <AuthForm mode="login" redirectTo={redirectTarget} initialError={oauthErrorMessage} />
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string; error?: string }>;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<Skeleton className="h-[420px] w-full max-w-md rounded-xl" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
