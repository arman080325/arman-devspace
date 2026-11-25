import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-helpers";
import { getOperationalDiagnostics } from "@/services/diagnostics";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const probeVercel =
    searchParams.get("probe") === "vercel" || searchParams.get("probe") === "all";

  const diagnostics = await getOperationalDiagnostics({ probeVercel });

  return NextResponse.json(
    { diagnostics },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
