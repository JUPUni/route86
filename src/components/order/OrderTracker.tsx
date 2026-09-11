"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { BRAND, STATUS_META, type OrderStatus } from "@/lib/brand";
import type { PublicOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/pricing";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "received", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Done" },
];

export function OrderTracker({ initial, justPlaced, realtime }: { initial: PublicOrder; justPlaced?: boolean; realtime: boolean }) {
  const [order, setOrder] = useState(initial);
  const [flash, setFlash] = useState(false);
  const prev = useRef(initial.status);

  useEffect(() => {
    if (prev.current !== order.status) {
      prev.current = order.status;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      if (order.status === "ready" && "vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
      return () => clearTimeout(t);
    }
  }, [order.status]);

  // Realtime broadcast (Supabase) + polling fallback so the page is never stale.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (alive) setOrder(json.order);
        }
      } catch {}
    };
    const interval = setInterval(refresh, realtime ? 15000 : 4000);
    const supabase = realtime ? getBrowserSupabase() : null;
    const channel = supabase
      ?.channel(`order:${order.id}`)
      .on("broadcast", { event: "status" }, (msg: { payload?: PublicOrder }) => {
        if (alive && msg.payload?.id === order.id) setOrder(msg.payload as PublicOrder);
      })
      .subscribe();
    return () => {
      alive = false;
      clearInterval(interval);
      channel?.unsubscribe();
    };
  }, [order.id, realtime]);

  const meta = STATUS_META[order.status];
  const step = meta.step;
  const done = order.status === "completed";
  const cancelled = order.status === "cancelled";
  const readyish = order.status === "ready" || order.status === "out_for_delivery";

  return (
    <div>
      {justPlaced && (
        <div className="mb-6 rounded-2xl border-2 border-palm bg-lime/30 p-4 text-center">
          <p className="brand text-lg text-palm">Order sent to the kitchen! 🎉</p>
          <p className="text-sm text-ink/70">Keep this page open or watch your WhatsApp. We&apos;ll ping you the moment it&apos;s ready.</p>
        </div>
      )}

      {/* Boarding-pass card */}
      <article className={clsx("overflow-hidden rounded-[2rem] border-2 border-charcoal bg-offwhite shadow-[8px_8px_0_0_#d95a00] transition-transform", flash && "animate-shake")}>
        <header className={clsx("relative px-6 py-5 text-cream", cancelled ? "bg-red-700" : readyish ? "bg-palm" : "bg-charcoal")}>
          <div className="grain absolute inset-0" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="brand text-xs uppercase tracking-[0.3em] text-orange-bright">Route 86 · boarding pass</p>
              <h1 className="display text-4xl sm:text-5xl">{order.order_number}</h1>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-cream/70">{order.fulfillment_type}</p>
              <p className="brand text-lg">{order.customer_name}</p>
            </div>
          </div>
        </header>

        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <span className={clsx("relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl", readyish ? "bg-palm text-cream animate-pulse-ring" : cancelled ? "bg-red-100" : "bg-orange/15", !done && !cancelled && !readyish && "animate-pulse")}>
              {cancelled ? "✕" : done ? "🧡" : readyish ? "✈️" : order.status === "preparing" ? "🍳" : "🛫"}
            </span>
            <div>
              <p className="script text-2xl text-orange">{meta.flavor}</p>
              <h2 className="display text-3xl">{meta.label}</h2>
              <p className="text-ink/70">{meta.customer}</p>
              {order.status === "cancelled" && order.cancel_reason && <p className="mt-1 text-sm font-bold text-red-700">{order.cancel_reason}</p>}
            </div>
          </div>

          {!cancelled && (
            <ol className="mt-6 grid grid-cols-4 gap-2">
              {STEPS.map((s, i) => {
                const n = i + 1;
                const active = n <= step;
                return (
                  <li key={s.key} className="text-center">
                    <div className={clsx("mx-auto h-2 rounded-full transition-colors", active ? "bg-orange" : "bg-charcoal/10")} />
                    <span className={clsx("mt-2 block text-[11px] font-black uppercase tracking-widest", active ? "text-charcoal" : "text-ink/40")}>{s.key === "ready" && order.fulfillment_type === "delivery" ? "On the way" : s.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {order.eta_minutes && !readyish && !done && !cancelled && (
            <p className="mt-4 text-center text-sm text-ink/70">Estimated ready in about <span className="font-black text-charcoal">{order.eta_minutes} min</span> from {new Date(order.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</p>
          )}
        </div>

        <div className="tear h-5 w-full" />

        <div className="px-6 pb-6">
          <ul className="divide-y divide-charcoal/10 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span><span className="font-black">{i.quantity}×</span> {i.name}{i.selections?.length ? <span className="block text-xs text-ink/60">{i.selections.map((s) => s.choiceName).join(" · ")}</span> : null}</span>
                <span className="font-bold">{formatMoney(i.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            {order.delivery_fee_cents > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>{formatMoney(order.delivery_fee_cents)}</dd></div>}
            {order.tax_cents > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.tax_cents)}</dd></div>}
            <div className="flex justify-between border-t-2 border-charcoal pt-2"><dt className="font-black">Total</dt><dd className="display text-2xl text-orange">{formatMoney(order.total_cents)}</dd></div>
          </dl>
        </div>
      </article>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href={`https://wa.me/${BRAND.whatsappE164.replace("+", "")}?text=${encodeURIComponent(`Hi Route 86! About my order ${order.order_number}…`)}`} target="_blank" rel="noreferrer" className={buttonClass("outline", "md")}>WhatsApp the restaurant</a>
        <a href={`tel:${BRAND.phoneE164}`} className={buttonClass("ghost", "md")}>Call {BRAND.phoneDisplay}</a>
        <Link href="/menu" className={buttonClass("dark", "md")}>Order again</Link>
      </div>
      <p className="mt-6 text-center text-xs text-ink/50">This page updates itself. Bookmark it or keep the WhatsApp we sent you.</p>
    </div>
  );
}
