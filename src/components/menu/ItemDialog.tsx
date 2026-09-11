"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import type { CartLine, MenuItem } from "@/lib/types";
import { formatMoney } from "@/lib/pricing";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { FoodArt } from "./FoodArt";

export function ItemDialog({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  if (!item) return null;
  // key resets all local state whenever a different item is opened
  return <ItemDialogInner key={item.id} item={item} onClose={onClose} />;
}

function ItemDialogInner({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    const defaults: Record<string, string[]> = {};
    item.options.forEach((g) => {
      if (g.type === "single" && g.required) defaults[g.id] = [g.choices[0].id];
    });
    return defaults;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const selections = useMemo<CartLine["selections"]>(() => {
    return item.options.flatMap((g) =>
      (picked[g.id] || []).flatMap((cid) => {
        const c = g.choices.find((x) => x.id === cid);
        return c ? [{ groupId: g.id, groupName: g.name, choiceId: c.id, choiceName: c.name, priceDeltaCents: c.priceDeltaCents || 0 }] : [];
      }),
    );
  }, [item, picked]);

  const unit = item.price_cents + selections.reduce((s, x) => s + x.priceDeltaCents, 0);
  const missing = item.options.filter((g) => g.required && !(picked[g.id]?.length)).map((g) => g.name);

  function toggle(groupId: string, choiceId: string, type: "single" | "multi") {
    setPicked((p) => {
      const cur = p[groupId] || [];
      if (type === "single") return { ...p, [groupId]: [choiceId] };
      return { ...p, [groupId]: cur.includes(choiceId) ? cur.filter((c) => c !== choiceId) : [...cur, choiceId] };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="item-title">
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-cream border-2 border-charcoal shadow-[8px_8px_0_0_#d95a00]">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full bg-charcoal text-cream text-xl font-black" aria-label="Close">×</button>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[2rem]">
          {item.image_url ? <Image src={item.image_url} alt={item.name} fill sizes="640px" className="object-cover" /> : <FoodArt word={item.name} className="absolute inset-0" />}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 id="item-title" className="display text-4xl text-charcoal">{item.name}</h2>
            <span className="display text-3xl text-orange">{formatMoney(item.price_cents)}</span>
          </div>
          {item.description && <p className="mt-2 text-ink/75">{item.description}</p>}

          {item.options.map((g) => (
            <fieldset key={g.id} className="mt-6">
              <legend className="brand text-sm uppercase tracking-widest text-charcoal">
                {g.name} {g.required ? <span className="text-orange">· required</span> : <span className="text-ink/50">· optional</span>}
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {g.choices.map((c) => {
                  const on = picked[g.id]?.includes(c.id);
                  return (
                    <label key={c.id} className={clsx("flex cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 transition-colors", on ? "border-orange bg-orange/10" : "border-charcoal/15 bg-offwhite hover:border-charcoal/40")}>
                      <span className="flex items-center gap-3">
                        <input type={g.type === "single" ? "radio" : "checkbox"} name={g.id} checked={!!on} onChange={() => toggle(g.id, c.id, g.type)} className="accent-orange h-4 w-4" />
                        <span className="font-semibold">{c.name}</span>
                      </span>
                      {c.priceDeltaCents ? <span className="text-sm font-bold text-orange">+{formatMoney(c.priceDeltaCents)}</span> : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <label className="mt-6 block">
            <span className="brand text-sm uppercase tracking-widest text-charcoal">Special requests</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="No scallion, extra spicy, allergy info…" className="mt-2 w-full rounded-2xl border-2 border-charcoal/15 bg-offwhite px-4 py-3 focus:border-orange focus:outline-none" />
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center rounded-full border-2 border-charcoal bg-offwhite">
              <button className="h-11 w-11 text-xl font-black" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span className="w-8 text-center font-black">{qty}</span>
              <button className="h-11 w-11 text-xl font-black" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase">+</button>
            </div>
            <Button
              size="lg"
              disabled={missing.length > 0}
              onClick={() => {
                add(item, selections, qty, notes.trim() || undefined);
                onClose();
              }}
            >
              Add {qty} · {formatMoney(unit * qty)}
            </Button>
          </div>
          {missing.length > 0 && <p className="mt-2 text-sm text-orange">Pick a {missing.join(" and ").toLowerCase()} to continue.</p>}
        </div>
      </div>
    </div>
  );
}
