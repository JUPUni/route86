import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/brand";
import { OrderError, broadcastOrder, getOrder, updateOrderStatus, listNotifications } from "@/lib/orders";
import { notifyCustomer } from "@/lib/notify";
import { eventForStatus } from "@/lib/notify/templates";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(ORDER_STATUSES),
  eta_minutes: z.number().int().min(0).max(240).nullable().optional(),
  cancel_reason: z.string().max(200).nullable().optional(),
  /** Set false to change status silently (no customer message). Defaults to true. */
  notify: z.boolean().optional(),
});

/** Staff only: one click moves the order and messages the customer on WhatsApp + email. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const { status, notify = true, ...extra } = parsed.data;
    const order = await updateOrderStatus(id, status, extra);
    const event = eventForStatus(status);
    const [notifications] = await Promise.all([
      notify && event ? notifyCustomer(order, event) : Promise.resolve([]),
      broadcastOrder(order, "status"),
    ]);
    return NextResponse.json({ order, notifications });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order, notifications: await listNotifications(id) });
}
