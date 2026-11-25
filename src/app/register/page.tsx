import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSafeRedirectPath } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a personal developer account in Arman's Devspace.",
  robots: { index: false, follow: false },
};

async function RegisterContent({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const rawRedirect = params.redirect ?? params.next;
  const hasExplicitRedirect = Boolean(rawRedirect && rawRedirect.trim().length > 0);
  const redirectTarget = getSafeRedirectPath(rawRedirect, "/dashboard");

  if (user) {
    redirect(redirectTarget);
  }

  return (
    <AuthForm
      mode="register"
      redirectTo={redirectTarget}
      hasExplicitRedirect={hasExplicitRedirect}
    />
  );
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-inset px-4">
          <div className="h-[520px] w-full max-w-[432px] animate-pulse rounded-panel border border-line bg-surface" />
        </div>
      }
    >
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
