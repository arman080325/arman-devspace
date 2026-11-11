import { NextResponse } from "next/server";
import { projects as canonicalProjects } from "@/data/projects";
import { isDatabaseConfigured } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { hasAnyRegisteredUser } from "@/services/devspace-store";

export async function GET() {
  const hasOwner = await hasAnyRegisteredUser();

  return NextResponse.json(
    {
      status: "ok",
      product: "Arman's Devspace",
      timestamp: new Date().toISOString(),
      projectsCount: canonicalProjects.length,
      storageMode: isDatabaseConfigured() ? "postgresql+local" : "local-store",
      supabaseAuthEnabled: isSupabaseConfigured(),
      initialized: hasOwner,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
