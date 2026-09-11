import type { CartLine, StoreSettings } from "./types";
import type { FulfillmentType } from "./brand";

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function lineUnitPrice(line: Pick<CartLine, "unitPriceCents" | "selections">): number {
  return line.unitPriceCents + line.selections.reduce((s, sel) => s + (sel.priceDeltaCents || 0), 0);
}

export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

export type Totals = {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
};

export function computeTotals(
  lines: CartLine[],
  fulfillment: FulfillmentType,
  settings: Pick<StoreSettings, "delivery_fee_cents" | "tax_rate">,
): Totals {
  const subtotalCents = lines.reduce((s, l) => s + lineTotal(l), 0);
  const deliveryFeeCents = fulfillment === "delivery" && subtotalCents > 0 ? settings.delivery_fee_cents : 0;
  const taxCents = Math.round((subtotalCents + deliveryFeeCents) * (settings.tax_rate || 0));
  return {
    subtotalCents,
    deliveryFeeCents,
    taxCents,
    totalCents: subtotalCents + deliveryFeeCents + taxCents,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };
}

/**
 * Normalise a phone number to E.164. Anguilla local numbers (7 digits) get the +1 264 prefix;
 * 10-digit NANP numbers get +1. Returns null when the input can't be a phone number.
 */
export function normalizePhone(input: string, defaultAreaCode = "264"): string | null {
  const digits = (input || "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    const d = digits.slice(1).replace(/\D/g, "");
    return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
  }
  const d = digits.replace(/\D/g, "");
  if (d.length === 7) return `+1${defaultAreaCode}${d}`;
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
