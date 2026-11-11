import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@/components/ui/skeleton";
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
  const redirectTarget = getSafeRedirectPath(
    params.redirect ?? params.next,
    "/dashboard",
  );

  if (user) {
    redirect(redirectTarget);
  }

  return <AuthForm mode="register" redirectTo={redirectTarget} />;
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<Skeleton className="h-[480px] w-full max-w-md rounded-xl" />}>
        <RegisterContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
