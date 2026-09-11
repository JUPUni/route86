"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import type { StaffSession } from "@/lib/auth";
import { LogoMark } from "@/components/site/Logo";

const links = [
  { href: "/admin", label: "Live orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children, session, demo, storeOpen }: { children: ReactNode; session: StaffSession; demo: boolean; storeOpen: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(storeOpen);
  const [busy, setBusy] = useState(false);

  async function toggleOpen() {
    setBusy(true);
    const next = !open;
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepting_orders: next, store_open: next }) });
    if (res.ok) setOpen(next);
    setBusy(false);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <header className="sticky top-0 z-40 border-b border-cream/10 bg-charcoal/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9" tone="light" />
            <div className="leading-none">
              <p className="brand text-lg text-orange-bright">Route 86</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-cream/60">Kitchen dashboard</p>
            </div>
            {demo && <span className="ml-2 rounded-full bg-orange/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-bright">Demo mode</span>}
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={clsx("rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors", pathname === l.href ? "bg-orange text-white" : "text-cream/70 hover:bg-cream/10")}>{l.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleOpen} disabled={busy} className={clsx("inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-black uppercase tracking-widest", open ? "border-lime/60 text-lime" : "border-red-400 text-red-300")}>
              <span className={clsx("h-2 w-2 rounded-full", open ? "bg-lime animate-pulse" : "bg-red-500")} />
              {open ? "Taking orders" : "Paused"}
            </button>
            <span className="hidden text-xs text-cream/50 lg:inline">{session.name || session.email}</span>
            <button onClick={logout} className="rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest text-cream/60 hover:text-cream">Sign out</button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={clsx("rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap", pathname === l.href ? "bg-orange text-white" : "text-cream/70")}>{l.label}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
