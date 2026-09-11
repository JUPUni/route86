"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, MenuItem } from "@/lib/types";

type CartState = {
  lines: CartLine[];
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (item: MenuItem, selections: CartLine["selections"], quantity?: number, notes?: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export function lineKey(itemId: string, selections: CartLine["selections"], notes?: string) {
  return `${itemId}:${selections.map((s) => `${s.groupId}=${s.choiceId}`).sort().join("+")}${notes ? `#${notes}` : ""}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      open: false,
      setOpen: (open) => set({ open }),
      add: (item, selections, quantity = 1, notes) => {
        const key = lineKey(item.id, selections, notes);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l)), open: true });
          return;
        }
        set({
          lines: [...get().lines, { key, itemId: item.id, name: item.name, unitPriceCents: item.price_cents, quantity, selections, notes }],
          open: true,
        });
      },
      setQuantity: (key, quantity) =>
        set({ lines: quantity <= 0 ? get().lines.filter((l) => l.key !== key) : get().lines.map((l) => (l.key === key ? { ...l, quantity } : l)) }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      clear: () => set({ lines: [] }),
    }),
    { name: "route86-cart", partialize: (s) => ({ lines: s.lines }) },
  ),
);
