import { NextResponse } from "next/server";
import { createOrder, OrderError, broadcastOrder, publicOrderView } from "@/lib/orders";
import { notifyCustomer, notifyStoreNewOrder } from "@/lib/notify";
import { getSettings } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const order = await createOrder(body);
    // Fire-and-forget: the customer gets their confirmation, the store gets pinged, the dashboard lights up.
    const settings = await getSettings();
    void Promise.allSettled([
      notifyCustomer(order, "order_received"),
      notifyStoreNewOrder(order, { whatsapp: settings.store_whatsapp, email: settings.store_email }),
      broadcastOrder(order, "new"),
    ]);
    return NextResponse.json({ order: publicOrderView(order) }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong placing your order. Please call us." }, { status: 500 });
  }
}
