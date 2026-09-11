"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { formatMoney, lineTotal } from "@/lib/pricing";
import { buttonClass } from "@/components/ui/Button";

export function CartDrawer() {
  const { lines, open, setOpen, setQuantity, remove } = useCart();
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <div className={open ? "fixed inset-0 z-50" : "hidden"} aria-hidden={!open}>
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-cream border-l-2 border-charcoal flex flex-col shadow-2xl" role="dialog" aria-label="Your order">
        <div className="flex items-center justify-between border-b-2 border-charcoal px-6 py-4">
          <h2 className="display text-3xl">Your order</h2>
          <button onClick={() => setOpen(false)} className="h-10 w-10 rounded-full bg-charcoal text-cream text-xl font-black" aria-label="Close cart">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {lines.length === 0 && (
            <div className="py-16 text-center">
              <p className="script text-3xl text-orange">Empty bowl.</p>
              <p className="text-ink/60 mt-1">Add something from the menu to get started.</p>
              <Link href="/menu" onClick={() => setOpen(false)} className={buttonClass("dark", "md", "mt-6")}>Browse the menu</Link>
            </div>
          )}
          {lines.map((l) => (
            <div key={l.key} className="rounded-2xl border-2 border-charcoal/10 bg-offwhite p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="brand text-base leading-tight">{l.name}</p>
                  {l.selections.length > 0 && <p className="text-xs text-ink/60 mt-0.5">{l.selections.map((s) => s.choiceName).join(" · ")}</p>}
                  {l.notes && <p className="text-xs italic text-ink/60 mt-0.5">“{l.notes}”</p>}
                </div>
                <span className="font-black text-orange">{formatMoney(lineTotal(l))}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-full border-2 border-charcoal bg-cream">
                  <button className="h-9 w-9 font-black" onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label="Decrease">−</button>
                  <span className="w-7 text-center font-black text-sm">{l.quantity}</span>
                  <button className="h-9 w-9 font-black" onClick={() => setQuantity(l.key, l.quantity + 1)} aria-label="Increase">+</button>
                </div>
                <button onClick={() => remove(l.key)} className="text-xs font-bold uppercase tracking-widest text-ink/50 hover:text-red-700">Remove</button>
              </div>
            </div>
          ))}
        </div>
        {lines.length > 0 && (
          <div className="border-t-2 border-charcoal px-6 py-5 bg-sand">
            <div className="flex items-center justify-between">
              <span className="brand uppercase tracking-widest text-sm">Subtotal</span>
              <span className="display text-3xl text-orange">{formatMoney(subtotal)}</span>
            </div>
            <p className="text-xs text-ink/60 mt-1">Delivery fee and any tax are shown at checkout.</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className={buttonClass("primary", "lg", "mt-4 w-full")}>Checkout</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
