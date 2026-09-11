import type { Metadata } from "next";
import { getMenu } from "@/lib/data";
import { MenuManager } from "@/components/admin/MenuManager";

export const metadata: Metadata = { title: "Menu manager" };

export default async function AdminMenuPage() {
  const { categories, items } = await getMenu({ includeUnavailable: true });
  return <MenuManager categories={categories} items={items} />;
}
