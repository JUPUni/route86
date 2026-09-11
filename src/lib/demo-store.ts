import "server-only";
import type { Order, StoreSettings } from "./types";

/**
 * In-memory store used when Supabase is not configured ("demo mode"), so the whole
 * order → dashboard → notify flow can be exercised locally without a database.
 * Data lives for the lifetime of the server process only.
 */
type DemoState = {
  orders: Map<string, Order>;
  availability: Map<string, boolean>;
  settings: Partial<StoreSettings>;
  seq: number;
  listeners: Set<(o: Order) => void>;
};

const g = globalThis as unknown as { __r86demo?: DemoState };

export function demoState(): DemoState {
  if (!g.__r86demo) {
    g.__r86demo = { orders: new Map(), availability: new Map(), settings: {}, seq: 1000, listeners: new Set() };
  }
  return g.__r86demo;
}
