import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  await clearSessionCookie();

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-fatal if Supabase session wasn't present
    }
  }

  return NextResponse.json({ ok: true });
}
