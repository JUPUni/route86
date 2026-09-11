import { NextResponse } from "next/server";
import { getOrder, publicOrderView } from "@/lib/orders";

export const runtime = "nodejs";

/** Public, limited view of an order for the tracking page. The UUID is the only credential. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order: publicOrderView(order) }, { headers: { "Cache-Control": "no-store" } });
}
