import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicOrder } from "@/lib/orders";
import { OrderTracker } from "@/components/order/OrderTracker";
import { isDemoMode } from "@/lib/data";

export const metadata: Metadata = { title: "Track your order" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const order = await getPublicOrder(id);
  if (!order) notFound();
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <OrderTracker initial={order} justPlaced={sp.placed === "1"} realtime={!isDemoMode()} />
    </section>
  );
}
