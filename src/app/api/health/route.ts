import { NextResponse } from "next/server";
import { projects as canonicalProjects } from "@/data/projects";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { hasAnyRegisteredUser } from "@/services/devspace-store";
import { isVercelConfigured } from "@/services/vercel";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  let dbHealthy = false;
  let dbError: string | null = null;

  if (dbConfigured) {
    const prisma = getPrismaClient();
    if (prisma) {
      try {
        await prisma.$queryRawUnsafe("SELECT 1");
        dbHealthy = true;
      } catch {
        dbHealthy = false;
        dbError = "Database connectivity check failed.";
      }
    }
  }

  // Determine storage status
  let storageStatus: "healthy" | "unhealthy" | "local";
  if (dbConfigured) {
    storageStatus = dbHealthy ? "healthy" : "unhealthy";
  } else {
    storageStatus = "local";
  }

  let hasOwner = false;
  try {
    hasOwner = await hasAnyRegisteredUser();
  } catch {
    hasOwner = false;
  }

  const overallOk = !dbConfigured || dbHealthy;

  return NextResponse.json(
    {
      status: overallOk ? "ok" : "degraded",
      product: "Arman's Devspace",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      projectsCount: canonicalProjects.length,
      storageMode: dbConfigured ? "postgresql" : "local-store",
      storageStatus,
      ...(dbError ? { storageError: dbError } : {}),
      supabaseAuthEnabled: isSupabaseConfigured(),
      vercelConfigured: isVercelConfigured(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      initialized: hasOwner,
    },
    {
      status: overallOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
