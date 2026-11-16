import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-helpers";
import { markAllActivitiesAsRead } from "@/services/activity";

export async function POST() {
  const auth = await requireApiSession();
  if ("response" in auth) {
    return auth.response;
  }

  const result = await markAllActivitiesAsRead(auth.user.id);
  return NextResponse.json({ success: true, count: result.count });
}
