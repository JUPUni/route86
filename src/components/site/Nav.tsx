"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Wordmark } from "./Logo";
import { useCart } from "@/store/cart";
import { buttonClass } from "@/components/ui/Button";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/#specials", label: "Specials" },
  { href: "/#visit", label: "Visit" },
];

export function Nav({ storeOpen = true }: { storeOpen?: boolean }) {
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const hydrated = useHydrated();
  const count = hydrated ? lines.reduce((s, l) => s + l.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur border-b border-charcoal/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-18 flex items-center justify-between gap-4 py-3">
        <Wordmark />
        <nav className="hidden md:flex items-center gap-8 brand text-sm uppercase tracking-widest text-ink">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={clsx("hover:text-orange transition-colors", pathname === l.href && "text-orange")}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className={clsx("hidden sm:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest", storeOpen ? "text-palm" : "text-red-700")}>
            <span className={clsx("h-2 w-2 rounded-full", storeOpen ? "bg-palm animate-pulse" : "bg-red-600")} />
            {storeOpen ? "Open for orders" : "Closed"}
          </span>
          <Link href="/menu" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>Order now</Link>
          <button onClick={() => setOpen(true)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-charcoal bg-offwhite hover:bg-white" aria-label="Open cart">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h15l-1.5 8h-12z" /><path d="M6 6 5 3H2" /><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></svg>
            {count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-orange text-white text-[11px] font-black flex items-center justify-center">{count}</span>}
          </button>
          <button className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-charcoal" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="md:hidden border-t border-charcoal/10 bg-cream px-6 py-4 flex flex-col gap-3 brand uppercase tracking-widest text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="py-1">{l.label}</Link>
          ))}
          <Link href="/menu" onClick={() => setMenuOpen(false)} className={buttonClass("primary", "sm", "self-start")}>Order now</Link>
        </nav>
      )}
    </header>
  );
}
