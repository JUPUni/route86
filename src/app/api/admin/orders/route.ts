import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { listOrders } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const active = url.searchParams.get("scope") !== "all";
  const orders = await listOrders({ active, limit: Number(url.searchParams.get("limit") || 100) });
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
