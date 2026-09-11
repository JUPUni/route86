import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="script text-3xl text-orange">Wrong runway.</p>
      <h1 className="display text-7xl text-charcoal">404</h1>
      <p className="mt-2 text-ink/70">That page doesn&apos;t exist, but the food does.</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-6")}>Back to Route 86</Link>
    </main>
  );
}
