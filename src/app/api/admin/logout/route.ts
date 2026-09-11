import { NextResponse } from "next/server";
import { demoLogout } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  await demoLogout();
  const supabase = await getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
