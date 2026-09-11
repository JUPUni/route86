"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { ItemCard } from "./ItemCard";
import { ItemDialog } from "./ItemDialog";

export function MenuBrowser({ categories, items }: { categories: MenuCategory[]; items: MenuItem[] }) {
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<MenuItem | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (active === "all" || i.category_id === active) && (!q || i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q) || i.tags.some((t) => t.includes(q))));
  }, [items, active, query]);

  const grouped = useMemo(() => categories.map((c) => ({ category: c, items: visible.filter((i) => i.category_id === c.id) })).filter((g) => g.items.length), [categories, visible]);

  return (
    <div>
      <div className="sticky top-[72px] z-30 -mx-4 bg-cream/95 backdrop-blur px-4 py-3 border-b border-charcoal/10 sm:mx-0 sm:rounded-full sm:border-2 sm:border-charcoal sm:px-3 sm:py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-10 w-36 shrink-0 rounded-full border-2 border-charcoal/15 bg-offwhite px-4 text-sm focus:border-orange focus:outline-none" aria-label="Search the menu" />
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className={clsx("h-10 shrink-0 rounded-full px-4 text-xs font-black uppercase tracking-widest transition-colors", active === c.id ? "bg-charcoal text-cream" : "text-charcoal hover:bg-charcoal/10")}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 && <p className="py-20 text-center text-ink/60">Nothing matches that. Try another word.</p>}

      {grouped.map(({ category, items: list }, idx) => (
        <section key={category.id} id={category.slug} className="py-10 scroll-mt-40">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="display text-5xl text-charcoal">{category.name}</h2>
              {category.tagline && <p className="script text-2xl text-orange">{category.tagline}</p>}
            </div>
            <span className="brand text-xs uppercase tracking-widest text-ink/50">{list.length} item{list.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {list.map((item, i) => (
              <ItemCard key={item.id} item={item} onPick={setPicked} tone={(idx + i) % 5 === 3 ? "orange" : "cream"} />
            ))}
          </div>
        </section>
      ))}

      <ItemDialog item={picked} onClose={() => setPicked(null)} />
    </div>
  );
}
