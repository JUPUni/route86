"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import type { Order } from "@/lib/types";
import { STATUS_META, type OrderStatus } from "@/lib/brand";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { OrderCard } from "./OrderCard";
import { useAlerts } from "./useAlerts";

type Toast = { id: number; text: string; tone: "ok" | "warn" | "err" };

const COLUMNS: { key: string; title: string; flavor: string; statuses: OrderStatus[]; tone: string }[] = [
  { key: "new", title: "New", flavor: "Now boarding", statuses: ["received"], tone: "border-orange" },
  { key: "prep", title: "Preparing", flavor: "In flight", statuses: ["preparing"], tone: "border-yellow-400" },
  { key: "ready", title: "Ready", flavor: "Smooth landing", statuses: ["ready", "out_for_delivery"], tone: "border-lime" },
];

export function OrderBoard({ initialOrders, realtime }: { initialOrders: Order[]; realtime: boolean }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [connected, setConnected] = useState<"live" | "polling" | "offline">(realtime ? "polling" : "polling");
  const known = useRef(new Set(initialOrders.map((o) => o.id)));
  const { soundOn, enableSound, disableSound, alert } = useAlerts();

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders?scope=all&limit=150", { cache: "no-store" });
      if (!res.ok) return;
      const { orders: fresh } = (await res.json()) as { orders: Order[] };
      const newOnes = fresh.filter((o) => !known.current.has(o.id));
      newOnes.forEach((o) => known.current.add(o.id));
      setOrders(fresh);
      if (newOnes.length) {
        const o = newOnes[0];
        alert(`New order ${o.order_number}`, `${o.customer_name} · ${o.fulfillment_type} · $${(o.total_cents / 100).toFixed(2)}`);
        toast(`🔔 New order ${o.order_number} from ${o.customer_name}`);
      }
    } catch {
      setConnected("offline");
    }
  }, [alert, toast]);

  // Poll always (cheap, resilient); add Supabase realtime on top when configured.
  useEffect(() => {
    const iv = setInterval(refresh, realtime ? 20000 : 3000);
    const supabase = realtime ? getBrowserSupabase() : null;
    const channel = supabase
      ?.channel("orders-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .on("broadcast", { event: "new" }, () => refresh())
      .on("broadcast", { event: "status" }, () => refresh())
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED" ? "live" : "polling"));
    return () => {
      clearInterval(iv);
      channel?.unsubscribe();
    };
  }, [refresh, realtime]);

  const setStatus = useCallback(
    async (order: Order, status: OrderStatus, extra: { cancel_reason?: string; eta_minutes?: number } = {}) => {
      // optimistic
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
      const res = await fetch(`/api/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...extra }) });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error || "Update failed", "err");
        refresh();
        return;
      }
      const n = (json.notifications || []) as { channel: string; status: string; error?: string | null }[];
      if (n.length) {
        const parts = n.map((x) => `${x.channel === "whatsapp" ? "WhatsApp" : "Email"} ${x.status === "sent" ? "✓" : x.status === "skipped" ? "skipped" : "✗"}`);
        toast(`${order.order_number} → ${STATUS_META[status].label}. ${parts.join(" · ")}`, n.some((x) => x.status === "failed") ? "warn" : "ok");
      } else {
        toast(`${order.order_number} → ${STATUS_META[status].label}`);
      }
      refresh();
    },
    [refresh, toast],
  );

  const active = useMemo(() => orders.filter((o) => !["completed", "cancelled"].includes(o.status)), [orders]);
  const done = useMemo(() => orders.filter((o) => ["completed", "cancelled"].includes(o.status)), [orders]);
  const todayRevenue = orders.filter((o) => o.status !== "cancelled" && new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((s, o) => s + o.total_cents, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Live orders</h1>
          <p className="text-sm text-cream/60">
            <span className={clsx("mr-2 inline-block h-2 w-2 rounded-full", connected === "live" ? "bg-lime" : connected === "polling" ? "bg-yellow-400" : "bg-red-500")} />
            {connected === "live" ? "Realtime connected" : connected === "polling" ? "Auto-refreshing" : "Connection lost, retrying"} · {active.length} active · today ${(todayRevenue / 100).toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {soundOn ? (
            <button onClick={disableSound} className="rounded-full border-2 border-lime/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-lime">🔔 Sound on</button>
          ) : (
            <button onClick={enableSound} className="animate-pulse rounded-full bg-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white">🔕 Enable sound alerts</button>
          )}
          <button onClick={refresh} className="rounded-full border-2 border-cream/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-cream/70 hover:border-cream/50">Refresh</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = active.filter((o) => col.statuses.includes(o.status)).sort((a, b) => a.created_at.localeCompare(b.created_at));
          return (
            <section key={col.key} className={clsx("rounded-[1.6rem] border-t-4 bg-ink/60 p-3", col.tone)}>
              <header className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="display text-2xl">{col.title} <span className="text-cream/40">{list.length}</span></h2>
                <span className="script text-lg text-orange-bright">{col.flavor}</span>
              </header>
              <div className="space-y-3">
                {list.length === 0 && <p className="rounded-2xl border border-dashed border-cream/15 p-6 text-center text-sm text-cream/40">Nothing here</p>}
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} onStatus={setStatus} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-8">
        <button onClick={() => setShowDone((v) => !v)} className="text-xs font-black uppercase tracking-widest text-cream/60 hover:text-cream">
          {showDone ? "▾" : "▸"} Completed &amp; cancelled ({done.length})
        </button>
        {showDone && (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {done.map((o) => (
              <OrderCard key={o.id} order={o} onStatus={setStatus} muted />
            ))}
          </div>
        )}
      </section>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={clsx("rounded-2xl border-2 px-4 py-3 text-sm font-bold shadow-xl", t.tone === "ok" ? "border-lime bg-charcoal text-lime" : t.tone === "warn" ? "border-yellow-400 bg-charcoal text-yellow-300" : "border-red-500 bg-charcoal text-red-300")}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}
