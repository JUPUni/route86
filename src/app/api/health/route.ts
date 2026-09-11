import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/data";

export function GET() {
  return NextResponse.json({ ok: true, mode: isDemoMode() ? "demo" : "supabase", time: new Date().toISOString() });
}
