import type { Metadata } from "next";
import { listOrders } from "@/lib/orders";
import { isDemoMode } from "@/lib/data";
import { OrderBoard } from "@/components/admin/OrderBoard";

export const metadata: Metadata = { title: "Live orders" };

export default async function AdminBoardPage() {
  const orders = await listOrders({ active: false, limit: 150 });
  return <OrderBoard initialOrders={orders} realtime={!isDemoMode()} />;
}
