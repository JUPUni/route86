"use client";
import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { useCart } from "@/store/cart";
import { computeTotals, formatMoney, lineTotal, normalizePhone } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/types";
import type { FulfillmentType, PaymentMethod } from "@/lib/brand";
import { Button, buttonClass } from "@/components/ui/Button";

const field = "mt-1 w-full rounded-2xl border-2 border-charcoal/15 bg-offwhite px-4 py-3 focus:border-orange focus:outline-none";
const label = "block text-sm font-black uppercase tracking-widest text-charcoal";

export function CheckoutForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const mounted = useHydrated();

  const [fulfillment, setFulfillment] = useState<FulfillmentType>(settings.pickup_enabled ? "pickup" : "delivery");
  const [payment, setPayment] = useState<PaymentMethod>("pay_at_pickup");
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", delivery_address: "", notes: "", notify_whatsapp: true, notify_email: true });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function chooseFulfillment(v: FulfillmentType) {
    setFulfillment(v);
    setPayment(v === "pickup" ? "pay_at_pickup" : "cash_on_delivery");
  }

  const totals = useMemo(() => computeTotals(lines, fulfillment, settings), [lines, fulfillment, settings]);
  const open = settings.store_open && settings.accepting_orders;
  const phoneOk = normalizePhone(form.customer_phone) !== null;
  const belowMin = fulfillment === "delivery" && totals.subtotalCents < settings.delivery_minimum_cents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment_type: fulfillment,
          payment_method: payment,
          ...form,
          lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, notes: l.notes, selections: l.selections.map((s) => ({ groupId: s.groupId, choiceId: s.choiceId })) })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not place your order");
      clear();
      router.push(`/order/${json.order.id}?placed=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!mounted) return <div className="py-20 text-center text-ink/50">Loading your order…</div>;

  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-[2rem] border-2 border-charcoal bg-offwhite p-10 text-center">
        <p className="script text-4xl text-orange">Empty bowl.</p>
        <p className="mt-2 text-ink/70">Add something delicious first.</p>
        <Link href="/menu" className={buttonClass("dark", "lg", "mt-6")}>Go to the menu</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        {!open && <div className="rounded-2xl bg-red-600 p-4 text-white font-bold">Online ordering is paused right now. Call us at the restaurant instead.</div>}

        <fieldset>
          <legend className={label}>How are you getting it?</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {([
              ["pickup", "Pickup", "Grab it at the counter, next to the airport."],
              ["delivery", "Delivery", `${formatMoney(settings.delivery_fee_cents)} · min ${formatMoney(settings.delivery_minimum_cents)}`],
            ] as const).map(([v, t, d]) => {
              const enabled = v === "pickup" ? settings.pickup_enabled : settings.delivery_enabled;
              return (
                <button key={v} type="button" disabled={!enabled} onClick={() => chooseFulfillment(v)} className={clsx("rounded-2xl border-2 p-4 text-left transition-colors disabled:opacity-40", fulfillment === v ? "border-orange bg-orange/10" : "border-charcoal/15 bg-offwhite hover:border-charcoal/40")}>
                  <span className="brand text-lg">{t}</span>
                  <span className="block text-xs text-ink/60">{enabled ? d : "Unavailable right now"}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={label}>Your name</span><input required className={field} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Who's this order for?" /></label>
          <label>
            <span className={label}>WhatsApp number</span>
            <input required inputMode="tel" className={clsx(field, form.customer_phone && !phoneOk && "border-red-500")} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="264-235-8686" />
            <span className="mt-1 block text-xs text-ink/60">We&apos;ll WhatsApp you when it&apos;s ready. Local numbers can skip the +1 264.</span>
          </label>
          <label>
            <span className={label}>Email <span className="text-ink/40">(optional)</span></span>
            <input type="email" className={field} value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="you@example.com" />
            <span className="mt-1 block text-xs text-ink/60">Get a receipt and ready alert by email too.</span>
          </label>
          {fulfillment === "delivery" && (
            <label className="sm:col-span-2"><span className={label}>Delivery address</span><textarea required rows={2} className={field} value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} placeholder="Villa / house name, road, village, landmarks" /></label>
          )}
          <label className="sm:col-span-2"><span className={label}>Notes for the kitchen <span className="text-ink/40">(optional)</span></span><textarea rows={2} className={field} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergies, spice level, it's Wingman Wednesday…" /></label>
        </div>

        <fieldset>
          <legend className={label}>Payment</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {(fulfillment === "pickup"
              ? ([["pay_at_pickup", "Pay at pickup", "Cash or card at the counter"]] as const)
              : ([["cash_on_delivery", "Cash on delivery", "Have exact change if you can"], ["card_on_delivery", "Card on delivery", "Driver brings the terminal"]] as const)
            ).map(([v, t, d]) => (
              <button key={v} type="button" onClick={() => setPayment(v)} className={clsx("rounded-2xl border-2 p-4 text-left", payment === v ? "border-orange bg-orange/10" : "border-charcoal/15 bg-offwhite hover:border-charcoal/40")}>
                <span className="brand">{t}</span>
                <span className="block text-xs text-ink/60">{d}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border-2 border-charcoal/10 bg-offwhite p-4">
          <legend className="px-2 text-xs font-black uppercase tracking-widest text-orange">Ready alerts</legend>
          <label className="flex items-center gap-3 py-1"><input type="checkbox" className="accent-orange h-5 w-5" checked={form.notify_whatsapp} onChange={(e) => setForm({ ...form, notify_whatsapp: e.target.checked })} /> <span>WhatsApp me when my order is ready</span></label>
          <label className="flex items-center gap-3 py-1"><input type="checkbox" className="accent-orange h-5 w-5" checked={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.checked })} disabled={!form.customer_email} /> <span className={clsx(!form.customer_email && "text-ink/40")}>Email me too</span></label>
        </fieldset>
      </div>

      <aside className="h-fit rounded-[1.6rem] border-2 border-charcoal bg-offwhite p-6 shadow-[6px_6px_0_0_#d95a00] lg:sticky lg:top-24">
        <h2 className="display text-3xl">Your order</h2>
        <ul className="mt-4 divide-y divide-charcoal/10 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3 py-2">
              <span><span className="font-black">{l.quantity}×</span> {l.name}{l.selections.length ? <span className="block text-xs text-ink/60">{l.selections.map((s) => s.choiceName).join(" · ")}</span> : null}</span>
              <span className="font-bold">{formatMoney(lineTotal(l))}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div>
          {totals.deliveryFeeCents > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>{formatMoney(totals.deliveryFeeCents)}</dd></div>}
          {totals.taxCents > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(totals.taxCents)}</dd></div>}
          <div className="flex justify-between border-t-2 border-charcoal pt-2 text-lg"><dt className="font-black">Total</dt><dd className="display text-3xl text-orange">{formatMoney(totals.totalCents)}</dd></div>
        </dl>
        {belowMin && <p className="mt-3 text-sm font-bold text-red-700">Delivery needs at least {formatMoney(settings.delivery_minimum_cents)}. Add a little more, or switch to pickup.</p>}
        {error && <p className="mt-3 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-800 animate-shake">{error}</p>}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={!open || submitting || belowMin || !phoneOk}>
          {submitting ? "Sending to the kitchen…" : `Place order · ${formatMoney(totals.totalCents)}`}
        </Button>
        <p className="mt-3 text-center text-xs text-ink/60">Ready in about {settings.prep_time_minutes}{fulfillment === "delivery" ? "–" + (settings.prep_time_minutes + 15) : ""} min.</p>
      </aside>
    </form>
  );
}
