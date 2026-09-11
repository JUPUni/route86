import "server-only";
import { z } from "zod";
import { getAdminSupabase } from "./supabase/admin";
import { demoState } from "./demo-store";
import { getMenu, getSettings } from "./data";
import { computeTotals, lineUnitPrice, normalizePhone } from "./pricing";
import { ORDER_STATUSES, type OrderStatus } from "./brand";
import type { CartLine, NotificationLog, Order, OrderItem } from "./types";

export const orderInputSchema = z.object({
  fulfillment_type: z.enum(["pickup", "delivery"]),
  payment_method: z.enum(["pay_at_pickup", "cash_on_delivery", "card_on_delivery"]).default("pay_at_pickup"),
  customer_name: z.string().trim().min(2, "Please tell us your name").max(80),
  customer_phone: z.string().trim().min(7, "We need a WhatsApp number to reach you"),
  customer_email: z.string().trim().email("That email doesn't look right").max(120).optional().or(z.literal("")),
  delivery_address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  notify_whatsapp: z.boolean().default(true),
  notify_email: z.boolean().default(true),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        notes: z.string().max(200).optional(),
        selections: z
          .array(z.object({ groupId: z.string(), choiceId: z.string() }))
          .default([]),
      }),
    )
    .min(1, "Your cart is empty"),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

export class OrderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Re-price the cart on the server against the live menu so the client can never set prices. */
export async function priceLines(input: OrderInput["lines"]): Promise<CartLine[]> {
  const { items } = await getMenu();
  const byId = new Map(items.map((i) => [i.id, i]));
  return input.map((l) => {
    const item = byId.get(l.itemId);
    if (!item) throw new OrderError(`Sorry, one of your items is no longer available.`);
    const selections = l.selections.map((s) => {
      const group = item.options.find((g) => g.id === s.groupId);
      const choice = group?.choices.find((c) => c.id === s.choiceId);
      if (!group || !choice) throw new OrderError(`Invalid option for ${item.name}.`);
      return { groupId: group.id, groupName: group.name, choiceId: choice.id, choiceName: choice.name, priceDeltaCents: choice.priceDeltaCents || 0 };
    });
    for (const g of item.options) {
      if (g.required && !selections.some((s) => s.groupId === g.id)) throw new OrderError(`Please choose a ${g.name.toLowerCase()} for ${item.name}.`);
    }
    return { key: `${item.id}:${selections.map((s) => s.choiceId).join("+")}`, itemId: item.id, name: item.name, unitPriceCents: item.price_cents, quantity: l.quantity, selections, notes: l.notes };
  });
}

export async function createOrder(raw: unknown): Promise<Order> {
  const parsed = orderInputSchema.safeParse(raw);
  if (!parsed.success) throw new OrderError(parsed.error.issues[0]?.message || "Invalid order");
  const input = parsed.data;
  const settings = await getSettings();
  if (!settings.store_open || !settings.accepting_orders) throw new OrderError("We're not taking online orders right now. Please call us.", 409);
  if (input.fulfillment_type === "delivery" && !settings.delivery_enabled) throw new OrderError("Delivery is unavailable right now. Pickup is open!", 409);
  if (input.fulfillment_type === "pickup" && !settings.pickup_enabled) throw new OrderError("Pickup is unavailable right now.", 409);
  if (input.fulfillment_type === "delivery" && !input.delivery_address) throw new OrderError("Please add a delivery address.");
  const phone = normalizePhone(input.customer_phone);
  if (!phone) throw new OrderError("Please enter a valid WhatsApp number (e.g. 264-235-8686).");

  const lines = await priceLines(input.lines);
  const totals = computeTotals(lines, input.fulfillment_type, settings);
  if (input.fulfillment_type === "delivery" && totals.subtotalCents < settings.delivery_minimum_cents) {
    throw new OrderError(`Delivery orders need a minimum of $${(settings.delivery_minimum_cents / 100).toFixed(0)}.`);
  }

  const base = {
    status: "received" as OrderStatus,
    fulfillment_type: input.fulfillment_type,
    payment_method: input.payment_method,
    customer_name: input.customer_name,
    customer_phone: phone,
    customer_email: input.customer_email || null,
    delivery_address: input.fulfillment_type === "delivery" ? input.delivery_address || null : null,
    notes: input.notes || null,
    notify_whatsapp: input.notify_whatsapp,
    notify_email: input.notify_email && Boolean(input.customer_email),
    subtotal_cents: totals.subtotalCents,
    delivery_fee_cents: totals.deliveryFeeCents,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents,
    eta_minutes: settings.prep_time_minutes + (input.fulfillment_type === "delivery" ? 15 : 0),
    cancel_reason: null,
    source: "web",
  };
  const itemRows = lines.map((l) => ({
    menu_item_id: l.itemId,
    name: l.name,
    quantity: l.quantity,
    unit_price_cents: lineUnitPrice(l),
    line_total_cents: lineUnitPrice(l) * l.quantity,
    selections: l.selections,
    notes: l.notes || null,
  }));

  const admin = getAdminSupabase();
  if (!admin) {
    const s = demoState();
    const id = crypto.randomUUID();
    const order: Order = {
      id,
      order_number: `R86-${++s.seq}`,
      ...base,
      created_at: new Date().toISOString(),
      accepted_at: null,
      ready_at: null,
      completed_at: null,
      cancelled_at: null,
      items: itemRows.map((r) => ({ id: crypto.randomUUID(), order_id: id, ...r })),
    };
    s.orders.set(id, order);
    return order;
  }

  const { data: order, error } = await admin.from("orders").insert(base).select("*").single();
  if (error) throw new OrderError(error.message, 500);
  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .insert(itemRows.map((r) => ({ ...r, order_id: order.id })))
    .select("*");
  if (itemsErr) throw new OrderError(itemsErr.message, 500);
  return { ...(order as Order), items: (items || []) as OrderItem[] };
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const admin = getAdminSupabase();
  if (!admin) return demoState().orders.get(id) ?? null;
  const { data: order } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;
  const { data: items } = await admin.from("order_items").select("*").eq("order_id", id);
  return { ...(order as Order), items: (items || []) as OrderItem[] };
}

/** Fields safe to show the customer on the public tracking page. */
export function publicOrderView(o: Order) {
  return {
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    fulfillment_type: o.fulfillment_type,
    customer_name: o.customer_name.split(" ")[0],
    eta_minutes: o.eta_minutes,
    cancel_reason: o.cancel_reason,
    subtotal_cents: o.subtotal_cents,
    delivery_fee_cents: o.delivery_fee_cents,
    tax_cents: o.tax_cents,
    total_cents: o.total_cents,
    created_at: o.created_at,
    ready_at: o.ready_at,
    completed_at: o.completed_at,
    items: (o.items || []).map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, line_total_cents: i.line_total_cents, selections: i.selections })),
  };
}
export type PublicOrder = ReturnType<typeof publicOrderView>;

export async function listOrders(opts: { active?: boolean; limit?: number } = {}): Promise<Order[]> {
  const limit = opts.limit ?? 100;
  const activeStatuses: OrderStatus[] = ["received", "preparing", "ready", "out_for_delivery"];
  const admin = getAdminSupabase();
  if (!admin) {
    const all = [...demoState().orders.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return (opts.active ? all.filter((o) => activeStatuses.includes(o.status)) : all).slice(0, limit);
  }
  let q = admin.from("orders").select("*, items:order_items(*)").order("created_at", { ascending: false }).limit(limit);
  if (opts.active) q = q.in("status", activeStatuses);
  const { data } = await q;
  return (data || []) as Order[];
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  received: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "out_for_delivery", "cancelled"],
  ready: ["out_for_delivery", "completed", "preparing", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: ["received"],
};

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  extra: { eta_minutes?: number | null; cancel_reason?: string | null } = {},
): Promise<Order> {
  if (!ORDER_STATUSES.includes(status)) throw new OrderError("Unknown status");
  const current = await getOrder(id);
  if (!current) throw new OrderError("Order not found", 404);
  if (current.status !== status && !transitions[current.status].includes(status)) {
    throw new OrderError(`Can't move an order from ${current.status} to ${status}.`, 409);
  }
  const now = new Date().toISOString();
  const patch: Partial<Order> = { status, ...extra };
  if (status === "preparing" && !current.accepted_at) patch.accepted_at = now;
  if ((status === "ready" || status === "out_for_delivery") && !current.ready_at) patch.ready_at = now;
  if (status === "completed") patch.completed_at = now;
  if (status === "cancelled") patch.cancelled_at = now;
  if (status === "received") { patch.cancelled_at = null; patch.cancel_reason = null; }

  const admin = getAdminSupabase();
  if (!admin) {
    const updated = { ...current, ...patch };
    demoState().orders.set(id, updated);
    return updated;
  }
  const { error } = await admin.from("orders").update(patch).eq("id", id);
  if (error) throw new OrderError(error.message, 500);
  return { ...current, ...patch };
}

/**
 * Push a realtime event to the customer's tracking page (topic order:{id}) and the staff board.
 * Uses Supabase Realtime broadcast over HTTP; a no-op in demo mode (the client polls instead).
 */
export async function broadcastOrder(order: Order, event: "new" | "status"): Promise<void> {
  const admin = getAdminSupabase();
  if (!admin) return;
  const payload = publicOrderView(order);
  try {
    await Promise.all([
      admin.channel(`order:${order.id}`).send({ type: "broadcast", event: "status", payload }),
      admin.channel("store:orders").send({ type: "broadcast", event, payload: { id: order.id, status: order.status, order_number: order.order_number } }),
    ]);
  } catch (e) {
    console.warn("[realtime] broadcast failed", e);
  }
}

export async function logNotification(entry: Omit<NotificationLog, "id" | "created_at">): Promise<void> {
  const admin = getAdminSupabase();
  if (!admin) {
    console.info(`[notify:${entry.status}] ${entry.channel} → ${entry.recipient} (${entry.event}) ${entry.error ?? ""}`);
    return;
  }
  await admin.from("notifications").insert(entry);
}

export async function listNotifications(orderId: string): Promise<NotificationLog[]> {
  const admin = getAdminSupabase();
  if (!admin) return [];
  const { data } = await admin.from("notifications").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  return (data || []) as NotificationLog[];
}
