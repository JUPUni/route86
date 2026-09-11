import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative bg-charcoal text-cream overflow-hidden">
      <div className="grain absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-3 items-center">
        <div>
          <p className="script text-3xl text-orange-bright">The broth is ready.</p>
          <p className="brand text-sm uppercase tracking-widest text-cream/70 mt-1">Your seat isn&apos;t reserved yet.</p>
          <div className="mt-5 flex gap-3">
            <a href={BRAND.instagramUrl} target="_blank" rel="noreferrer" className="rounded-full border border-cream/30 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-orange hover:border-orange">Instagram</a>
            <a href={BRAND.facebookUrl} target="_blank" rel="noreferrer" className="rounded-full border border-cream/30 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-orange hover:border-orange">Facebook</a>
          </div>
        </div>
        <div className="flex justify-center">
          <Logo className="w-44 drop-shadow-[0_8px_30px_rgba(242,107,18,0.35)]" />
        </div>
        <div className="md:text-right text-sm text-cream/80 space-y-1">
          <p className="brand text-cream">{BRAND.legalName}</p>
          <p>{BRAND.address.line1}, {BRAND.address.village}, {BRAND.address.island}</p>
          <p>{BRAND.address.line2}</p>
          <p><a href={`tel:${BRAND.phoneE164}`} className="hover:text-orange-bright">{BRAND.phoneDisplay}</a></p>
          <p className="pt-3 text-xs text-cream/50">
            © {new Date().getFullYear()} {BRAND.legalName} · <Link href="/admin" className="hover:text-orange-bright">Staff</Link>
          </p>
        </div>
      </div>
      <div className="relative border-t border-cream/10 py-3 text-center text-[11px] uppercase tracking-[0.3em] text-cream/40">One table. One meal. That&apos;s all it takes.</div>
    </footer>
  );
}
