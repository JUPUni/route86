import { clsx } from "clsx";

/**
 * Brand-styled placeholder art for menu items without a photo yet: a repeated
 * word tile in the style of the restaurant's own promo graphics. Swap for a real photo
 * by setting image_url on the item in the admin dashboard.
 */
export function FoodArt({ word, tone = "orange", className }: { word: string; tone?: "orange" | "dark" | "cream"; className?: string }) {
  const rows = 5;
  const bg = tone === "orange" ? "bg-orange text-cream" : tone === "dark" ? "bg-charcoal text-orange-bright" : "bg-sand text-orange";
  const short = word.split(" ")[0].toUpperCase();
  return (
    <div className={clsx("overflow-hidden select-none", bg, className)} aria-hidden="true">
      <div className="absolute inset-0 grain" />
      <div className="absolute inset-0 flex flex-col justify-center gap-0 px-3 leading-[0.95]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={clsx("display text-[2.6rem] whitespace-nowrap", i % 2 ? "opacity-40 translate-x-6" : "opacity-90")}>
            {short} {short} {short}
          </div>
        ))}
      </div>
      <svg viewBox="0 0 100 100" className="absolute -right-4 -bottom-4 h-2/3 w-2/3 opacity-25">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" />
        <path d="M30 42h40c0 16-9 26-20 26S30 58 30 42z" fill="currentColor" />
      </svg>
    </div>
  );
}
