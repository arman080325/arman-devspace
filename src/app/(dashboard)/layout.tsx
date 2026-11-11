import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkspaceSubnav } from "@/components/dashboard/workspace-subnav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Suspense
        fallback={<div className="h-14 border-b border-border/70 bg-secondary/20" />}
      >
        <WorkspaceSubnav />
      </Suspense>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
