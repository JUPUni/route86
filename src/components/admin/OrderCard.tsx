"use client";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { Order } from "@/lib/types";
import { STATUS_META, type OrderStatus } from "@/lib/brand";
import { formatMoney } from "@/lib/pricing";

function ActionButton({ onClick, disabled, primary, label }: { onClick: () => void; disabled: boolean; primary?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-transform active:scale-95 disabled:opacity-50",
        primary ? "flex-1 bg-orange text-white shadow-[3px_3px_0_0_#f6efe4] hover:bg-orange-bright" : "border-2 border-cream/25 text-cream/80 hover:border-cream/60",
      )}
    >
      {label}
    </button>
  );
}

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function OrderCard({ order, onStatus, muted }: { order: Order; onStatus: (o: Order, s: OrderStatus, extra?: { cancel_reason?: string }) => Promise<void>; muted?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const mins = (now - new Date(order.created_at).getTime()) / 60000;
  const late = order.status !== "completed" && order.status !== "cancelled" && order.eta_minutes != null && mins > order.eta_minutes;
  const meta = STATUS_META[order.status];

  async function go(s: OrderStatus, extra?: { cancel_reason?: string }) {
    setBusy(s);
    await onStatus(order, s, extra);
    setBusy(null);
  }
  function cancel() {
    const reason = window.prompt("Cancel this order? Add a short reason for the customer (optional):", "");
    if (reason === null) return;
    go("cancelled", { cancel_reason: reason || undefined });
  }

  const btn = (s: OrderStatus, label: string, primary?: boolean) => (
    <ActionButton onClick={() => go(s)} disabled={busy !== null} primary={primary} label={busy === s ? "…" : label} />
  );

  return (
    <article className={clsx("rounded-2xl border-2 bg-charcoal p-4 text-cream", muted ? "border-cream/10 opacity-70" : late ? "border-red-500" : order.status === "received" ? "border-orange animate-pulse-ring" : "border-cream/15")}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="display text-2xl leading-none">{order.order_number}</p>
          <p className="mt-1 text-xs text-cream/60">
            {ago(order.created_at, now)} ago · {new Date(order.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {late && <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">Late</span>}
          </p>
        </div>
        <div className="text-right">
          <span className={clsx("rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest", order.fulfillment_type === "delivery" ? "bg-sky-500/20 text-sky-300" : "bg-cream/10 text-cream/80")}>{order.fulfillment_type}</span>
          <p className="display mt-1 text-xl text-orange-bright">{formatMoney(order.total_cents)}</p>
        </div>
      </header>

      <div className="mt-3 rounded-xl bg-ink/70 p-3 text-sm">
        <p className="font-black">{order.customer_name}</p>
        <p className="flex flex-wrap gap-x-3 text-xs text-cream/70">
          <a className="hover:text-cream" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
          <a className="text-[#25D366] hover:underline" href={`https://wa.me/${order.customer_phone.replace("+", "")}?text=${encodeURIComponent(`Hi ${order.customer_name.split(" ")[0]}, this is Route 86 about order ${order.order_number}.`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          {order.customer_email && <span>{order.customer_email}</span>}
        </p>
        {order.delivery_address && <p className="mt-1 text-xs text-sky-200">📍 {order.delivery_address}</p>}
        <p className="mt-1 text-[10px] uppercase tracking-widest text-cream/40">{order.payment_method.replace(/_/g, " ")}</p>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {(order.items || []).map((i) => (
          <li key={i.id} className="flex gap-2">
            <span className="w-7 shrink-0 rounded-md bg-orange/20 text-center font-black text-orange-bright">{i.quantity}</span>
            <span>
              {i.name}
              {i.selections?.length ? <span className="block text-xs text-cream/60">{i.selections.map((s) => s.choiceName).join(" · ")}</span> : null}
              {i.notes && <span className="block text-xs italic text-yellow-300">“{i.notes}”</span>}
            </span>
          </li>
        ))}
      </ul>
      {order.notes && <p className="mt-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-2 text-xs text-yellow-200">📝 {order.notes}</p>}
      {order.cancel_reason && <p className="mt-2 text-xs text-red-300">Cancelled: {order.cancel_reason}</p>}

      {!muted && (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === "received" && (
            <>
              {btn("preparing", "Start cooking", true)}
              {btn("ready", "Ready ✈️")}
              <button onClick={cancel} className="rounded-full px-3 py-2 text-xs font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10">Cancel</button>
            </>
          )}
          {order.status === "preparing" && (
            <>
              {order.fulfillment_type === "delivery" ? btn("out_for_delivery", "Out for delivery 🛵", true) : btn("ready", "Ready · notify customer ✈️", true)}
              {order.fulfillment_type === "delivery" && btn("ready", "Ready")}
              <button onClick={cancel} className="rounded-full px-3 py-2 text-xs font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10">Cancel</button>
            </>
          )}
          {order.status === "ready" && (
            <>
              {btn("completed", "Picked up · done", true)}
              {order.fulfillment_type === "delivery" && btn("out_for_delivery", "Out for delivery")}
            </>
          )}
          {order.status === "out_for_delivery" && btn("completed", "Delivered · done", true)}
        </div>
      )}
      {muted && order.status === "cancelled" && (
        <button onClick={() => go("received")} className="mt-3 text-xs font-black uppercase tracking-widest text-cream/50 hover:text-cream">Restore</button>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-widest text-cream/40">{meta.label} · {meta.flavor}</p>
    </article>
  );
}
