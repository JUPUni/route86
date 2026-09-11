import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p className="brand text-sm uppercase tracking-[0.3em] text-orange">Almost there</p>
      <h1 className="display text-6xl text-charcoal">Checkout</h1>
      <CheckoutForm settings={settings} />
    </section>
  );
}
