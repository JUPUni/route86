"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreSettings } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const field = "mt-1 w-full rounded-2xl border-2 border-cream/15 bg-ink px-4 py-3 text-cream focus:border-orange focus:outline-none";
const label = "block text-xs font-black uppercase tracking-widest text-cream/70";

function Toggle({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border-2 border-cream/10 bg-ink/60 p-4">
      <span>
        <span className="block font-black">{title}</span>
        <span className="block text-xs text-cream/60">{desc}</span>
      </span>
      <input type="checkbox" className="h-6 w-6 accent-orange" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SettingsForm({ initial }: { initial: StoreSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(null);
    const { id: _id, currency: _c, ...patch } = s;
    void _id; void _c;
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...patch, tax_rate: Number(patch.tax_rate) }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setSaved(`Error: ${json.error}`);
    setS(json.settings);
    setSaved("Saved ✓");
    router.refresh();
  }

  const toggle = (k: keyof StoreSettings, title: string, desc: string) => (
    <Toggle title={title} desc={desc} checked={Boolean(s[k])} onChange={(v) => setS({ ...s, [k]: v })} />
  );

  return (
    <form onSubmit={save} className="max-w-3xl space-y-8">
      <div>
        <h1 className="display text-4xl">Store settings</h1>
        <p className="text-sm text-cream/60">Everything the ordering site reads live: open/closed, fees, timings, hours and where store alerts go.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {toggle("store_open", "Store open", "Shows the open badge on the site")}
        {toggle("accepting_orders", "Accepting online orders", "Turn off to pause checkout without closing")}
        {toggle("pickup_enabled", "Pickup", "Offer pickup at checkout")}
        {toggle("delivery_enabled", "Delivery", "Offer delivery at checkout")}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Prep time (minutes)</span><input type="number" min={0} className={field} value={s.prep_time_minutes} onChange={(e) => setS({ ...s, prep_time_minutes: Number(e.target.value) })} /></label>
        <label><span className={label}>Tax rate (0.13 = 13% GST)</span><input type="number" step="0.001" min={0} max={1} className={field} value={s.tax_rate} onChange={(e) => setS({ ...s, tax_rate: Number(e.target.value) })} /></label>
        <label><span className={label}>Delivery fee ($)</span><input type="number" step="0.5" min={0} className={field} value={s.delivery_fee_cents / 100} onChange={(e) => setS({ ...s, delivery_fee_cents: Math.round(Number(e.target.value) * 100) })} /></label>
        <label><span className={label}>Delivery minimum ($)</span><input type="number" step="1" min={0} className={field} value={s.delivery_minimum_cents / 100} onChange={(e) => setS({ ...s, delivery_minimum_cents: Math.round(Number(e.target.value) * 100) })} /></label>
        <label className="sm:col-span-2"><span className={label}>Announcement bar (optional)</span><input className={field} value={s.announcement ?? ""} onChange={(e) => setS({ ...s, announcement: e.target.value || null })} placeholder="Closed Sunday for a private event · Wingman Wednesday is on!" /></label>
      </section>

      <section>
        <h2 className="display text-2xl text-orange-bright">Store alerts</h2>
        <p className="mb-3 text-xs text-cream/60">New orders always appear on the live board. Add a WhatsApp number and/or email to also get pinged there.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Store WhatsApp (E.164)</span><input className={field} value={s.store_whatsapp ?? ""} onChange={(e) => setS({ ...s, store_whatsapp: e.target.value || null })} placeholder="+12642358686" /></label>
          <label><span className={label}>Store email</span><input type="email" className={field} value={s.store_email ?? ""} onChange={(e) => setS({ ...s, store_email: e.target.value || null })} placeholder="orders@route86.ai" /></label>
        </div>
      </section>

      <section>
        <h2 className="display text-2xl text-orange-bright">Hours</h2>
        <div className="mt-2 grid gap-2">
          {s.hours.map((h, i) => (
            <div key={h.day} className="grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-2">
              <span className="font-black">{h.day}</span>
              <input type="time" className={field + " mt-0"} value={h.open} disabled={h.closed} onChange={(e) => setS({ ...s, hours: s.hours.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)) })} />
              <input type="time" className={field + " mt-0"} value={h.close} disabled={h.closed} onChange={(e) => setS({ ...s, hours: s.hours.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)) })} />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-orange" checked={!!h.closed} onChange={(e) => setS({ ...s, hours: s.hours.map((x, j) => (j === i ? { ...x, closed: e.target.checked } : x)) })} /> Closed</label>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
        {saved && <span className="text-sm font-bold text-lime">{saved}</span>}
      </div>
    </form>
  );
}
