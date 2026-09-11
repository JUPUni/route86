import { describe, expect, it } from "vitest";
import { computeTotals, formatMoney, lineUnitPrice, normalizePhone } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  key: "k",
  itemId: "item-1",
  name: "Wings",
  unitPriceCents: 1200,
  quantity: 2,
  selections: [],
  ...over,
});

describe("pricing", () => {
  it("adds option deltas to the unit price", () => {
    expect(lineUnitPrice(line({ selections: [{ groupId: "p", groupName: "Protein", choiceId: "shrimp", choiceName: "Shrimp", priceDeltaCents: 400 }] }))).toBe(1600);
  });

  it("computes pickup totals without delivery fee", () => {
    const t = computeTotals([line()], "pickup", { delivery_fee_cents: 500, tax_rate: 0 });
    expect(t).toMatchObject({ subtotalCents: 2400, deliveryFeeCents: 0, taxCents: 0, totalCents: 2400, itemCount: 2 });
  });

  it("adds delivery fee and tax for delivery", () => {
    const t = computeTotals([line()], "delivery", { delivery_fee_cents: 500, tax_rate: 0.13 });
    expect(t.deliveryFeeCents).toBe(500);
    expect(t.taxCents).toBe(Math.round(2900 * 0.13));
    expect(t.totalCents).toBe(2900 + Math.round(2900 * 0.13));
  });

  it("formats USD", () => {
    expect(formatMoney(1250)).toBe("$12.50");
  });
});

describe("normalizePhone", () => {
  it("adds the Anguilla prefix to 7-digit local numbers", () => {
    expect(normalizePhone("235-8686")).toBe("+12642358686");
  });
  it("handles 10 and 11 digit NANP numbers", () => {
    expect(normalizePhone("(264) 235 8686")).toBe("+12642358686");
    expect(normalizePhone("1 264 235 8686")).toBe("+12642358686");
  });
  it("keeps international numbers", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
  });
  it("rejects junk", () => {
    expect(normalizePhone("hello")).toBeNull();
    expect(normalizePhone("12")).toBeNull();
  });
});
