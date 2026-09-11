import { clsx } from "clsx";

export function Marquee({ items, dark, className }: { items: string[]; dark?: boolean; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={clsx("marquee overflow-hidden border-y-2 py-3", dark ? "bg-charcoal text-orange-bright border-orange" : "bg-cream text-orange border-orange", className)} aria-hidden="true">
      <div className="marquee-track gap-10 px-5">
        {row.map((t, i) => (
          <span key={i} className="brand text-lg uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-10">
            {t} <span className="text-charcoal/40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
