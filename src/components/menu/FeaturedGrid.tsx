"use client";
import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { ItemCard } from "./ItemCard";
import { ItemDialog } from "./ItemDialog";

export function FeaturedGrid({ items }: { items: MenuItem[] }) {
  const [picked, setPicked] = useState<MenuItem | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onPick={setPicked} tone="orange" compact />
        ))}
      </div>
      <ItemDialog item={picked} onClose={() => setPicked(null)} />
    </>
  );
}
