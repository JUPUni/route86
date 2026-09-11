import "server-only";
import { getPublicSupabase } from "./supabase/public";
import { isSupabaseConfigured } from "./supabase/env";
import { requireStaffClient } from "./auth";
import { SEED_CATEGORIES, SEED_ITEMS } from "./seed-menu";
import { demoState } from "./demo-store";
import { BRAND } from "./brand";
import type { MenuCategory, MenuItem, StoreSettings } from "./types";

export const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  store_open: true,
  accepting_orders: true,
  pickup_enabled: true,
  delivery_enabled: true,
  delivery_fee_cents: 500,
  delivery_minimum_cents: 2000,
  tax_rate: 0,
  prep_time_minutes: 25,
  announcement: null,
  hours: [
    { day: "Mon", open: "11:00", close: "22:00" },
    { day: "Tue", open: "11:00", close: "22:00" },
    { day: "Wed", open: "11:00", close: "22:00" },
    { day: "Thu", open: "11:00", close: "22:00" },
    { day: "Fri", open: "11:00", close: "23:00" },
    { day: "Sat", open: "11:00", close: "23:00" },
    { day: "Sun", open: "12:00", close: "21:00" },
  ],
  store_whatsapp: BRAND.whatsappE164,
  store_email: null,
  currency: "USD",
};

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export async function getSettings(): Promise<StoreSettings> {
  const db = getPublicSupabase();
  if (!db) return { ...DEFAULT_SETTINGS, ...demoState().settings };
  const { data } = await db.from("settings").select("*").eq("id", 1).maybeSingle();
  return data ? ({ ...DEFAULT_SETTINGS, ...data, tax_rate: Number(data.tax_rate) } as StoreSettings) : DEFAULT_SETTINGS;
}

/** Staff only (RLS). */
export async function updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  if (isDemoMode()) {
    const s = demoState();
    s.settings = { ...s.settings, ...patch };
    return { ...DEFAULT_SETTINGS, ...s.settings };
  }
  const db = await requireStaffClient();
  const { data, error } = await db.from("settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1).select("*").single();
  if (error) throw new Error(error.message);
  return { ...DEFAULT_SETTINGS, ...data, tax_rate: Number(data.tax_rate) } as StoreSettings;
}

export async function getMenu(opts: { includeUnavailable?: boolean } = {}): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
  const db = getPublicSupabase();
  if (!db) {
    const av = demoState().availability;
    const items = SEED_ITEMS.map((i) => ({ ...i, available: av.has(i.id) ? av.get(i.id)! : i.available }));
    return { categories: SEED_CATEGORIES, items: opts.includeUnavailable ? items : items.filter((i) => i.available) };
  }
  const [{ data: categories }, { data: items }] = await Promise.all([
    db.from("menu_categories").select("*").eq("active", true).order("sort_order"),
    db.from("menu_items").select("*").order("sort_order"),
  ]);
  const list = (items || []) as MenuItem[];
  return {
    categories: (categories || []) as MenuCategory[],
    items: opts.includeUnavailable ? list : list.filter((i) => i.available),
  };
}

/** Staff only (RLS). */
export async function updateMenuItem(id: string, patch: Partial<Pick<MenuItem, "name" | "description" | "price_cents" | "image_url" | "featured" | "available" | "tags">>): Promise<void> {
  if (isDemoMode()) {
    if (typeof patch.available === "boolean") demoState().availability.set(id, patch.available);
    return;
  }
  const db = await requireStaffClient();
  const { error, count } = await db.from("menu_items").update(patch, { count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Item not found or not permitted");
}
