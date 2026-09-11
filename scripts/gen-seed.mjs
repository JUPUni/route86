// generates supabase/seed.sql from src/lib/seed-menu.ts (run via pnpm seed:sql)
import { SEED_CATEGORIES, SEED_ITEMS } from "../.seed-tmp/seed-menu.js";
const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => `'{${a.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")}}'`;
let out = "-- Generated from src/lib/seed-menu.ts. Do not edit by hand; run `pnpm seed:sql`.\n\n";
for (const c of SEED_CATEGORIES) {
  out += `insert into public.menu_categories (id, slug, name, tagline, sort_order, active) values (${q(c.id)}, ${q(c.slug)}, ${q(c.name)}, ${q(c.tagline)}, ${c.sort_order}, ${c.active})\n  on conflict (id) do update set name = excluded.name, tagline = excluded.tagline, sort_order = excluded.sort_order;\n`;
}
out += "\n";
for (const it of SEED_ITEMS) {
  out += `insert into public.menu_items (id, category_id, slug, name, description, price_cents, image_url, tags, options, available, featured, sort_order) values (${q(it.id)}, ${q(it.category_id)}, ${q(it.slug)}, ${q(it.name)}, ${q(it.description)}, ${it.price_cents}, ${q(it.image_url)}, ${arr(it.tags)}, ${q(JSON.stringify(it.options))}::jsonb, ${it.available}, ${it.featured}, ${it.sort_order})\n  on conflict (id) do update set name = excluded.name, description = excluded.description, price_cents = excluded.price_cents, image_url = excluded.image_url, tags = excluded.tags, options = excluded.options, featured = excluded.featured, sort_order = excluded.sort_order;\n`;
}
process.stdout.write(out);
