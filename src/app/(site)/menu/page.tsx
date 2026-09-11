import type { Metadata } from "next";
import { getMenu, getSettings } from "@/lib/data";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { Marquee } from "@/components/site/Marquee";

export const metadata: Metadata = { title: "Menu · Order online" };

export default async function MenuPage() {
  const [{ categories, items }, settings] = await Promise.all([getMenu(), getSettings()]);
  const open = settings.store_open && settings.accepting_orders;
  return (
    <>
      <section className="relative overflow-hidden bg-charcoal text-cream">
        <div className="grain absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 text-center">
          <p className="brand text-sm uppercase tracking-[0.3em] text-orange-bright">Order online · pickup or delivery</p>
          <h1 className="display mt-2 text-6xl sm:text-8xl">The menu</h1>
          <p className="mt-3 text-cream/70">Ready in about {settings.prep_time_minutes} minutes. We&apos;ll WhatsApp you the moment it&apos;s done.</p>
          {!open && <p className="mt-4 inline-block rounded-full bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-widest">Online ordering is paused right now</p>}
        </div>
        <Marquee items={categories.map((c) => c.name)} dark className="border-orange/60" />
      </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <MenuBrowser categories={categories} items={items} />
      </section>
    </>
  );
}
