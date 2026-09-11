import { BRAND, STATUS_META, type OrderStatus } from "@/lib/brand";
import { formatMoney } from "@/lib/pricing";
import type { Order } from "@/lib/types";

export type NotifyEvent = "order_received" | "order_preparing" | "order_ready" | "order_out_for_delivery" | "order_completed" | "order_cancelled";

export function eventForStatus(status: OrderStatus): NotifyEvent | null {
  switch (status) {
    case "received": return "order_received";
    case "preparing": return "order_preparing";
    case "ready": return "order_ready";
    case "out_for_delivery": return "order_out_for_delivery";
    case "completed": return "order_completed";
    case "cancelled": return "order_cancelled";
    default: return null;
  }
}

/** Which events actually message the customer. "preparing" is intentionally quiet to avoid spam. */
export const CUSTOMER_EVENTS: NotifyEvent[] = ["order_received", "order_ready", "order_out_for_delivery", "order_cancelled"];

/** Public site origin: explicit env, else Vercel's production URL, else local dev. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function trackingUrl(orderId: string): string {
  return `${siteUrl()}/order/${orderId}`;
}

function itemLines(order: Order): string {
  return (order.items || []).map((i) => `• ${i.quantity}× ${i.name}${i.selections?.length ? ` (${i.selections.map((s) => s.choiceName).join(", ")})` : ""}`).join("\n");
}

export function whatsappText(event: NotifyEvent, order: Order): string {
  const n = order.order_number;
  const first = order.customer_name.split(" ")[0];
  const link = trackingUrl(order.id);
  const pickupOrDelivery = order.fulfillment_type === "delivery" ? "delivery" : "pickup";
  switch (event) {
    case "order_received":
      return `🌴 *${BRAND.name}* — Hi ${first}! We've received order *${n}* for ${pickupOrDelivery}.\n\n${itemLines(order)}\n\nTotal: *${formatMoney(order.total_cents)}*${order.eta_minutes ? `\nEstimated ready in ~${order.eta_minutes} min.` : ""}\n\nWe'll message you the moment it's ready. Track it live: ${link}`;
    case "order_ready":
      return `✈️ *Smooth landing!* ${first}, order *${n}* is READY.\n\n${order.fulfillment_type === "delivery" ? "Our driver is heading out shortly." : `Come grab it while it's hot — ${BRAND.address.line1}, next to the airport.`}\n\nQuestions? Call ${BRAND.phoneDisplay}. See you at Route 86! 🍜`;
    case "order_out_for_delivery":
      return `🛵 ${first}, order *${n}* is on its way to you now. Final approach! Track: ${link}`;
    case "order_completed":
      return `Thanks for riding ${BRAND.name}, ${first}! Enjoy order *${n}*. Tag us @${BRAND.instagram} 🧡`;
    case "order_cancelled":
      return `Hi ${first}, unfortunately order *${n}* has been cancelled${order.cancel_reason ? `: ${order.cancel_reason}` : ""}. Please call us at ${BRAND.phoneDisplay} if you have questions. Sorry about that.`;
    case "order_preparing":
      return `👨‍🍳 ${first}, order *${n}* is being prepared now. Track: ${link}`;
  }
}

export function emailSubject(event: NotifyEvent, order: Order): string {
  const n = order.order_number;
  switch (event) {
    case "order_received": return `Order ${n} received · ${BRAND.name}`;
    case "order_ready": return `✈️ Order ${n} is ready! · ${BRAND.name}`;
    case "order_out_for_delivery": return `Order ${n} is on its way · ${BRAND.name}`;
    case "order_completed": return `Thanks for your order ${n} · ${BRAND.name}`;
    case "order_cancelled": return `Order ${n} cancelled · ${BRAND.name}`;
    case "order_preparing": return `Order ${n} is being prepared · ${BRAND.name}`;
  }
}

export function emailHtml(event: NotifyEvent, order: Order): string {
  const status = order.status;
  const meta = STATUS_META[status];
  const headline =
    event === "order_ready" ? "Smooth landing. Your order is ready!" :
    event === "order_received" ? "Now boarding. We've got your order." :
    event === "order_out_for_delivery" ? "Final approach. Your order is on its way." :
    event === "order_cancelled" ? "Your order was cancelled." :
    event === "order_completed" ? "Thanks for riding Route 86." : "Your order is being prepared.";
  const rows = (order.items || [])
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.quantity}× ${escapeHtml(i.name)}${i.selections?.length ? `<div style="color:#777;font-size:12px">${escapeHtml(i.selections.map((s) => s.choiceName).join(", "))}</div>` : ""}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee">${formatMoney(i.line_total_cents)}</td></tr>`)
    .join("");
  const link = trackingUrl(order.id);
  return `<!doctype html><html><body style="margin:0;background:#f6efe4;font-family:Helvetica,Arial,sans-serif;color:#1b1b1b">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#1b1b1b;color:#f6efe4;border-radius:20px 20px 0 0;padding:28px 28px 20px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#f26b12;letter-spacing:0.5px">ROUTE 86</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.8">Asian · Caribbean Fusion</div>
    </div>
    <div style="background:#fffdf9;padding:28px;border-radius:0 0 20px 20px">
      <div style="display:inline-block;background:#f26b12;color:#fff;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px">${escapeHtml(meta.flavor)}</div>
      <h1 style="font-size:24px;margin:14px 0 6px">${escapeHtml(headline)}</h1>
      <p style="margin:0 0 18px;color:#444">Hi ${escapeHtml(order.customer_name.split(" ")[0])}, order <strong>${escapeHtml(order.order_number)}</strong> · ${order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}${order.eta_minutes && event === "order_received" ? ` · ready in ~${order.eta_minutes} min` : ""}</p>
      ${event === "order_cancelled" && order.cancel_reason ? `<p style="background:#fdecea;padding:12px;border-radius:10px">${escapeHtml(order.cancel_reason)}</p>` : ""}
      <table width="100%" style="border-collapse:collapse;font-size:14px">${rows}
        <tr><td style="padding:8px 0;color:#666">Subtotal</td><td align="right" style="padding:8px 0">${formatMoney(order.subtotal_cents)}</td></tr>
        ${order.delivery_fee_cents ? `<tr><td style="padding:4px 0;color:#666">Delivery</td><td align="right">${formatMoney(order.delivery_fee_cents)}</td></tr>` : ""}
        ${order.tax_cents ? `<tr><td style="padding:4px 0;color:#666">Tax</td><td align="right">${formatMoney(order.tax_cents)}</td></tr>` : ""}
        <tr><td style="padding:10px 0;font-weight:800;font-size:16px">Total</td><td align="right" style="padding:10px 0;font-weight:800;font-size:16px">${formatMoney(order.total_cents)}</td></tr>
      </table>
      <a href="${link}" style="display:block;text-align:center;background:#d95a00;color:#fff;text-decoration:none;font-weight:800;padding:14px;border-radius:999px;margin:18px 0 8px">Track your order live</a>
      <p style="font-size:12px;color:#777;text-align:center;margin:16px 0 0">${escapeHtml(BRAND.address.line1)}, ${escapeHtml(BRAND.address.line2)}<br>${escapeHtml(BRAND.phoneDisplay)} · @${BRAND.instagram}</p>
    </div>
  </div></body></html>`;
}

export function storeNewOrderText(order: Order): string {
  return `🔔 *NEW ORDER ${order.order_number}* (${order.fulfillment_type})\n${order.customer_name} · ${order.customer_phone}\n\n${itemLines(order)}\n\nTotal ${formatMoney(order.total_cents)}${order.notes ? `\nNotes: ${order.notes}` : ""}${order.delivery_address ? `\nAddress: ${order.delivery_address}` : ""}\n\nOpen the board: ${siteUrl()}/admin`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
