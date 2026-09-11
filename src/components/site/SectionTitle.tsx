import { clsx } from "clsx";
import type { ReactNode } from "react";

export function SectionTitle({ kicker, title, subtitle, light, align = "center", className }: { kicker?: string; title: ReactNode; subtitle?: ReactNode; light?: boolean; align?: "center" | "left"; className?: string }) {
  return (
    <div className={clsx(align === "center" ? "text-center mx-auto" : "text-left", "max-w-3xl", className)}>
      {kicker && <p className={clsx("brand text-sm uppercase tracking-[0.3em]", light ? "text-orange-bright" : "text-orange")}>{kicker}</p>}
      <h2 className={clsx("display mt-2 text-5xl sm:text-6xl md:text-7xl", light ? "text-cream" : "text-charcoal")}>{title}</h2>
      {subtitle && <p className={clsx("mt-4 text-base sm:text-lg", light ? "text-cream/75" : "text-ink/75")}>{subtitle}</p>}
    </div>
  );
}
