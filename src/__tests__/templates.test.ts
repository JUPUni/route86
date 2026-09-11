import { describe, expect, it } from "vitest";
import { emailHtml, emailSubject, whatsappText, eventForStatus, CUSTOMER_EVENTS } from "@/lib/notify/templates";
import type { Order } from "@/lib/types";

const order: Order = {
  id: "11111111-2222-4333-8444-555555555555",
  order_number: "R86-1042",
  status: "ready",
  fulfillment_type: "pickup",
  payment_method: "pay_at_pickup",
  customer_name: "Brendon Jeffers",
  customer_phone: "+12642358686",
  customer_email: "b@example.com",
  delivery_address: null,
  notes: null,
  notify_whatsapp: true,
  notify_email: true,
  subtotal_cents: 3100,
  delivery_fee_cents: 0,
  tax_cents: 0,
  total_cents: 3100,
  eta_minutes: 25,
  cancel_reason: null,
  source: "web",
  created_at: new Date().toISOString(),
  accepted_at: null,
  ready_at: null,
  completed_at: null,
  cancelled_at: null,
  items: [
    { id: "a", order_id: "x", menu_item_id: "i", name: "Dragon Roll", quantity: 1, unit_price_cents: 1800, line_total_cents: 1800, selections: [], notes: null },
    { id: "b", order_id: "x", menu_item_id: "j", name: "Route 86 Wings · 6 pc", quantity: 1, unit_price_cents: 1300, line_total_cents: 1300, selections: [{ groupId: "sauce", groupName: "Sauce", choiceId: "gochujang-bbq", choiceName: "Gochujang BBQ", priceDeltaCents: 0 }], notes: null },
  ],
};

describe("notification templates", () => {
  it("maps statuses to events and only messages customers on meaningful ones", () => {
    expect(eventForStatus("ready")).toBe("order_ready");
    expect(CUSTOMER_EVENTS).not.toContain("order_preparing");
    expect(CUSTOMER_EVENTS).toContain("order_ready");
  });

  it("writes a ready message with the order number and first name", () => {
    const t = whatsappText("order_ready", order);
    expect(t).toContain("R86-1042");
    expect(t).toContain("Brendon");
    expect(t).toContain("READY");
  });

  it("lists items and a tracking link in the received message", () => {
    const t = whatsappText("order_received", order);
    expect(t).toContain("1× Dragon Roll");
    expect(t).toContain("Gochujang BBQ");
    expect(t).toContain(`/order/${order.id}`);
  });

  it("renders email html with totals and escapes html", () => {
    const html = emailHtml("order_received", { ...order, customer_name: "<script>x</script>" });
    expect(html).toContain("$31.00");
    expect(html).not.toContain("<script>");
    expect(emailSubject("order_ready", order)).toContain("R86-1042");
  });
});
