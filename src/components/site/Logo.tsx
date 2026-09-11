import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";

/**
 * Route 86 logo. The full lock-up uses the restaurant's real artwork (public/brand/logo.png).
 * The `mark` variant is a faithful vector redraw of the emblem: charcoal disc, winding white road,
 * orange noodle bowl with chopsticks, two sushi rolls, and the palm tree that doubles as the "T".
 */
export function LogoMark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const disc = tone === "dark" ? "#333333" : "#fffdf9";
  const road = tone === "dark" ? "#fffdf9" : "#333333";
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx="100" cy="88" r="72" fill={disc} />
      <path
        d="M118 16 C132 34 96 46 92 62 C88 78 122 84 118 104 C114 122 82 126 78 142 L64 160 C70 136 104 124 104 108 C104 92 70 88 74 66 C78 44 116 40 118 16 Z"
        fill={road}
      />
      <path d="M58 108 h76 c0 22 -12 40 -38 40 s-38 -18 -38 -40 z" fill="#cd5700" />
      <path d="M58 108 h76" stroke="#fffdf9" strokeWidth="4" />
      <g stroke="#cd5700" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M76 108 c0 -14 8 -20 12 -30" />
        <path d="M92 108 c0 -16 6 -22 8 -34" />
        <path d="M108 108 c2 -14 -4 -22 -2 -34" />
        <path d="M120 84 l24 -26" />
        <path d="M114 78 l22 -28" />
      </g>
      <g fill="#333333">
        <ellipse cx="46" cy="150" rx="14" ry="12" />
        <ellipse cx="70" cy="156" rx="14" ry="12" />
      </g>
      <g fill="#cd5700">
        <ellipse cx="46" cy="150" rx="6" ry="5" />
        <ellipse cx="70" cy="156" rx="6" ry="5" />
      </g>
      <g fill="#cd5700">
        <path d="M118 176 c0 -18 4 -28 4 -40 l4 0 c0 12 4 22 4 40 z" />
        <path d="M124 138 c-10 -6 -22 -6 -30 0 c8 -12 22 -14 30 -8 c8 -6 22 -4 30 8 c-8 -6 -20 -6 -30 0 z" />
        <path d="M124 136 c-2 -12 4 -20 14 -24 c-4 8 -4 16 0 24 z" />
        <path d="M124 136 c2 -12 -4 -20 -14 -24 c4 8 4 16 0 24 z" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  variant = "full",
  priority,
}: {
  className?: string;
  variant?: "full" | "mark";
  priority?: boolean;
}) {
  if (variant === "mark") return <LogoMark className={className} />;
  return (
    <Image
      src="/brand/logo.png"
      alt="Route 86 · Asian Caribbean Fusion"
      width={720}
      height={720}
      priority={priority}
      className={clsx("h-auto", className)}
    />
  );
}

export function Wordmark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={clsx("inline-flex items-center gap-2 group", className)} aria-label="Route 86 home">
      <LogoMark className="h-10 w-10 shrink-0" tone={light ? "light" : "dark"} />
      <span className="leading-none">
        <span className="brand block text-2xl tracking-tight text-orange group-hover:text-orange-bright transition-colors">
          Route 86
        </span>
        <span className={clsx("block text-[10px] font-bold uppercase tracking-[0.22em]", light ? "text-cream/80" : "text-ink/70")}>
          Asian · Caribbean Fusion
        </span>
      </span>
    </Link>
  );
}
