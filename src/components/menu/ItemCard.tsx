"use client";
import Image from "next/image";
import { clsx } from "clsx";
import type { MenuItem } from "@/lib/types";
import { formatMoney } from "@/lib/pricing";
import { FoodArt } from "./FoodArt";

const TAG_LABEL: Record<string, string> = { popular: "Popular", spicy: "🌶 Spicy", veg: "Veg", gf: "GF", signature: "Signature", "21+": "21+" };

export function ItemCard({ item, onPick, tone = "cream", compact }: { item: MenuItem; onPick: (item: MenuItem) => void; tone?: "cream" | "orange"; compact?: boolean }) {
  const dark = tone === "orange";
  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      disabled={!item.available}
      className={clsx(
        "group text-left rounded-[1.4rem] overflow-hidden border-2 border-charcoal transition-transform duration-150 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange/40 disabled:opacity-60",
        dark ? "bg-orange text-cream shadow-[6px_6px_0_0_#1b1b1b]" : "bg-offwhite text-charcoal shadow-[6px_6px_0_0_#d95a00]",
      )}
    >
      <div className={clsx("relative w-full overflow-hidden", compact ? "aspect-[4/3]" : "aspect-square")}>
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <FoodArt word={item.name} tone={dark ? "dark" : "orange"} className="absolute inset-0" />
        )}
        {!item.available && <span className="absolute inset-0 bg-charcoal/70 text-cream display text-3xl flex items-center justify-center">86&apos;d today</span>}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((t) => (
            <span key={t} className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest", dark ? "bg-charcoal text-cream" : "bg-cream text-charcoal border border-charcoal/20")}>{TAG_LABEL[t] ?? t}</span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className={clsx("brand text-lg leading-tight", dark ? "text-cream" : "text-charcoal")}>{item.name}</h3>
          <span className={clsx("display text-xl shrink-0", dark ? "text-cream" : "text-orange")}>{formatMoney(item.price_cents)}</span>
        </div>
        {item.description && !compact && <p className={clsx("mt-1 text-sm leading-snug line-clamp-2", dark ? "text-cream/85" : "text-ink/70")}>{item.description}</p>}
        <span className={clsx("mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest", dark ? "text-cream" : "text-orange")}>
          {item.options.length ? "Choose options" : "Add to order"} <span aria-hidden>→</span>
        </span>
      </div>
    </button>
  );
}
