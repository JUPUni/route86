import { NextResponse } from "next/server";
import { demoLogin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";

export const runtime = "nodejs";

/** Demo-mode passcode login. In production staff sign in with Supabase Auth on the client. */
export async function POST(req: Request) {
  if (!isDemoMode()) return NextResponse.json({ error: "Use Supabase sign-in" }, { status: 400 });
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  const ok = await demoLogin(String(passcode || ""));
  if (!ok) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
