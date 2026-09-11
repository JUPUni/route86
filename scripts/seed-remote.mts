/**
 * Seed (or re-sync) the live menu through the staff RLS policies. No service-role key needed.
 *   STAFF_EMAIL=you@example.com STAFF_PASSWORD=... node scripts/seed-remote.ts
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local or the environment.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SEED_CATEGORIES, SEED_ITEMS } from "../src/lib/seed-menu.ts";

for (const f of [".env.local", ".env.production"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.STAFF_EMAIL;
const password = process.env.STAFF_PASSWORD;
if (!url || !key || !email || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / STAFF_EMAIL / STAFF_PASSWORD");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { error: authErr } = await db.auth.signInWithPassword({ email, password });
if (authErr) { console.error("Sign-in failed:", authErr.message); process.exit(1); }

const { error: cErr } = await db.from("menu_categories").upsert(SEED_CATEGORIES, { onConflict: "id" });
if (cErr) { console.error("categories:", cErr.message); process.exit(1); }
// keep live availability/featured edits: only sync content fields
const { data: existing } = await db.from("menu_items").select("id, available, featured");
const keep = new Map((existing || []).map((r) => [r.id, r]));
const rows = SEED_ITEMS.map((i) => ({ ...i, available: keep.get(i.id)?.available ?? i.available, featured: keep.get(i.id)?.featured ?? i.featured }));
const { error: iErr } = await db.from("menu_items").upsert(rows, { onConflict: "id" });
if (iErr) { console.error("items:", iErr.message); process.exit(1); }
console.log(`Seeded ${SEED_CATEGORIES.length} categories and ${SEED_ITEMS.length} items into ${url}`);
