import "server-only";
import type { Order, NotificationLog } from "@/lib/types";
import { sendWhatsApp } from "./whatsapp";
import { sendEmail } from "./email";
import { CUSTOMER_EVENTS, emailHtml, emailSubject, storeNewOrderText, whatsappText, type NotifyEvent } from "./templates";
import { logNotification } from "@/lib/orders";

type Outcome = Omit<NotificationLog, "id" | "created_at">;

function toOutcome(orderId: string, channel: "whatsapp" | "email", event: string, recipient: string, r: Awaited<ReturnType<typeof sendWhatsApp>> | Awaited<ReturnType<typeof sendEmail>>): Outcome {
  if (r.ok === true) return { order_id: orderId, channel, event, recipient, provider: r.provider, provider_id: r.id, status: "sent", error: null };
  if (r.ok === "skipped") return { order_id: orderId, channel, event, recipient, provider: r.provider, provider_id: null, status: "skipped", error: r.reason };
  return { order_id: orderId, channel, event, recipient, provider: r.provider, provider_id: null, status: "failed", error: r.error };
}

/**
 * Notify the customer about an order event over WhatsApp and email (both, in parallel).
 * Never throws: every outcome is written to the notifications log so staff can see what happened.
 */
export async function notifyCustomer(order: Order, event: NotifyEvent): Promise<Outcome[]> {
  if (!CUSTOMER_EVENTS.includes(event)) return [];
  const jobs: Promise<Outcome>[] = [];
  if (order.notify_whatsapp && order.customer_phone) {
    jobs.push(sendWhatsApp(order.customer_phone, whatsappText(event, order), event).then((r) => toOutcome(order.id, "whatsapp", event, order.customer_phone, r)));
  }
  if (order.notify_email && order.customer_email) {
    jobs.push(sendEmail(order.customer_email, emailSubject(event, order), emailHtml(event, order)).then((r) => toOutcome(order.id, "email", event, order.customer_email!, r)));
  }
  const outcomes = await Promise.all(jobs);
  await Promise.all(outcomes.map((o) => logNotification(o)));
  return outcomes;
}

/** Ping the store (WhatsApp + email) about a brand-new order, in addition to the live dashboard alert. */
export async function notifyStoreNewOrder(order: Order, store: { whatsapp?: string | null; email?: string | null }): Promise<Outcome[]> {
  const jobs: Promise<Outcome>[] = [];
  const wa = store.whatsapp || process.env.STORE_WHATSAPP;
  const em = store.email || process.env.STORE_EMAIL;
  if (wa) jobs.push(sendWhatsApp(wa, storeNewOrderText(order), "store_new_order").then((r) => toOutcome(order.id, "whatsapp", "store_new_order", wa, r)));
  if (em) jobs.push(sendEmail(em, `🔔 New order ${order.order_number} · ${order.customer_name}`, `<pre style="font-family:monospace;font-size:14px">${storeNewOrderText(order).replace(/</g, "&lt;")}</pre>`).then((r) => toOutcome(order.id, "email", "store_new_order", em, r)));
  const outcomes = await Promise.all(jobs);
  await Promise.all(outcomes.map((o) => logNotification(o)));
  return outcomes;
}
