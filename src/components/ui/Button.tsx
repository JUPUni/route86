import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost" | "cream";
type Size = "sm" | "md" | "lg";

const base = "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-wide uppercase transition-all duration-150 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange/40";
const variants: Record<Variant, string> = {
  primary: "bg-orange text-white hover:bg-orange-bright shadow-[4px_4px_0_0_#1b1b1b] hover:shadow-[2px_2px_0_0_#1b1b1b]",
  dark: "bg-charcoal text-cream hover:bg-ink shadow-[4px_4px_0_0_#d95a00] hover:shadow-[2px_2px_0_0_#d95a00]",
  outline: "border-2 border-orange text-orange hover:bg-orange hover:text-white",
  ghost: "text-charcoal hover:bg-charcoal/5",
  cream: "bg-cream text-charcoal hover:bg-white shadow-[4px_4px_0_0_#d95a00]",
};
const sizes: Record<Size, string> = { sm: "px-4 py-2 text-xs", md: "px-6 py-3 text-sm", lg: "px-8 py-4 text-base" };

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, href, children, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string; variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
