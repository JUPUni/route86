"use client";
import { useState } from "react";
import { clsx } from "clsx";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { formatMoney } from "@/lib/pricing";

export function MenuManager({ categories, items: initial }: { categories: MenuCategory[]; items: MenuItem[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function patch(id: string, data: Partial<MenuItem>) {
    setBusy(id);
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...data } : i)));
    const res = await fetch(`/api/admin/menu/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) {
      setItems(initial);
      window.alert("Could not save. Please try again.");
    }
    setBusy(null);
  }

  const eightySixed = items.filter((i) => !i.available).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Menu</h1>
          <p className="text-sm text-cream/60">{items.length} items · {eightySixed} 86&apos;d right now. Toggle an item off when you run out; it disappears from the site instantly.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…" className="h-10 rounded-full border-2 border-cream/15 bg-ink px-4 text-sm text-cream focus:border-orange focus:outline-none" />
      </div>
      {categories.map((c) => {
        const list = items.filter((i) => i.category_id === c.id && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
        if (!list.length) return null;
        return (
          <section key={c.id} className="mb-8">
            <h2 className="display mb-3 text-2xl text-orange-bright">{c.name}</h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {list.map((i) => (
                <div key={i.id} className={clsx("flex items-center gap-3 rounded-2xl border-2 bg-ink/60 p-3", i.available ? "border-cream/10" : "border-red-500/60 opacity-80")}>
                  <button onClick={() => patch(i.id, { available: !i.available })} disabled={busy === i.id} className={clsx("relative h-8 w-14 shrink-0 rounded-full transition-colors", i.available ? "bg-lime" : "bg-red-600")} aria-label={i.available ? "86 this item" : "Make available"}>
                    <span className={clsx("absolute top-1 h-6 w-6 rounded-full bg-charcoal transition-all", i.available ? "left-7" : "left-1")} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{i.name} {!i.available && <span className="text-[10px] uppercase tracking-widest text-red-400">86&apos;d</span>}</p>
                    <p className="text-xs text-cream/50">{i.tags.join(" · ") || "—"}</p>
                  </div>
                  <PriceEditor value={i.price_cents} onSave={(v) => patch(i.id, { price_cents: v })} />
                  <button onClick={() => patch(i.id, { featured: !i.featured })} title="Feature on the home page" className={clsx("text-xl", i.featured ? "text-orange-bright" : "text-cream/30 hover:text-cream/60")}>★</button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PriceEditor({ value, onSave }: { value: number; onSave: (cents: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState((value / 100).toFixed(2));
  if (!editing) return <button onClick={() => setEditing(true)} className="display text-lg text-orange-bright hover:underline">{formatMoney(value)}</button>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const cents = Math.round(parseFloat(v) * 100);
        if (Number.isFinite(cents) && cents >= 0) onSave(cents);
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <span className="text-cream/60">$</span>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} inputMode="decimal" className="w-16 rounded-lg bg-charcoal px-2 py-1 text-right text-sm text-cream focus:outline-none" />
      <button className="rounded-lg bg-orange px-2 py-1 text-xs font-black uppercase text-white">Save</button>
    </form>
  );
}
