import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-helpers";
import { getOperationalDiagnostics } from "@/services/diagnostics";

export async function GET() {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const diagnostics = await getOperationalDiagnostics();

  return NextResponse.json(
    { diagnostics },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
