# Route 86 · online ordering platform

Website + ordering web app for **Route 86 Restaurant**, Asian · Caribbean Fusion, George Hill Main Road (next to AXA Airport), Anguilla.

- Customers browse the menu, build an order (pickup or delivery) and get a live **boarding-pass style tracking page**.
- The kitchen gets every order **in real time** on a live board with sound + browser alerts (plus optional WhatsApp/email pings to the store).
- **One click** on the board ("Ready ✈️") automatically messages the customer on **WhatsApp and email**.
- Staff can 86 items, change prices, feature dishes, pause ordering, and edit hours/fees from their phone.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS v4 |
| Data + realtime + auth | Supabase (Postgres, Realtime broadcast + postgres_changes, Auth) |
| WhatsApp | Twilio WhatsApp **or** Meta WhatsApp Cloud API (switch with one env var) |
| Email | Resend |
| Hosting | Vercel (or any Node host) |

The app also runs in **demo mode** with zero configuration: no database, an in-memory order store, and a passcode-protected dashboard. That is what you get with `pnpm dev` and an empty `.env`.

## Quick start

```bash
pnpm install
cp .env.example .env        # optional; blank = demo mode
pnpm dev                    # http://localhost:3000  ·  dashboard: /admin (passcode: route86)
```

Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Going live

### 1. Supabase

1. Create a project, then run `supabase/migrations/0001_init.sql` followed by `supabase/seed.sql` in the SQL editor (or `supabase db push` + `psql -f supabase/seed.sql`).
2. Add staff: `insert into staff (email, name, role) values ('owner@route86.ai', 'Rana', 'owner');` and create the same user under **Authentication → Users** with a password.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

The `orders` table is added to the `supabase_realtime` publication by the migration; row-level security only lets staff read it. Customers track orders through `/api/orders/[id]` (UUID = the only credential) plus a public broadcast channel `order:{id}`.

### 2. WhatsApp

Pick one provider and set `WHATSAPP_PROVIDER`:

- **Twilio** (`twilio`): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`. Start with the sandbox, then register the restaurant number as a WhatsApp sender. Business-initiated messages outside a 24-hour customer session must use approved templates: create them in Twilio Content Builder with one `{{1}}` variable and set `TWILIO_CONTENT_SID_ORDER_RECEIVED`, `..._ORDER_READY`, `..._ORDER_OUT_FOR_DELIVERY`, `..._ORDER_CANCELLED`, `..._STORE_NEW_ORDER`.
- **Meta Cloud API** (`meta`): `META_WA_PHONE_NUMBER_ID`, `META_WA_ACCESS_TOKEN`, optional `META_WA_TEMPLATE_*` names.

Message copy lives in `src/lib/notify/templates.ts`.

### 3. Email

Resend: `RESEND_API_KEY` and `EMAIL_FROM` (verify the sending domain in Resend first).

### 4. Deploy

Vercel: import the repo, paste the env vars, set `NEXT_PUBLIC_SITE_URL` to the production URL (it is used in tracking links inside the messages). Staff can "Add to Home Screen" `/admin` on a tablet or phone; the app ships a web manifest.

## How an order flows

1. `POST /api/orders` re-prices the cart against the live menu (clients never set prices), validates options and phone (Anguilla local numbers get `+1 264`), inserts the order.
2. In the background it sends the customer an "order received" WhatsApp + email, pings the store (WhatsApp/email if configured), and broadcasts to Realtime.
3. The dashboard (`/admin`) is subscribed to `postgres_changes` on `orders` and to the `store:orders` broadcast; it chimes, shows a browser notification and flashes the tab title. It also polls as a fallback.
4. Staff press **Ready ✈️**: `PATCH /api/orders/[id]/status` updates the row, sends the "smooth landing" WhatsApp + email, and broadcasts to `order:{id}` so the customer's page flips instantly.
5. Every notification attempt is written to the `notifications` table (sent / failed / skipped + provider id) so nothing is silent.

## Project map

```
src/app/(site)          customer site: home, menu, checkout, order/[id]
src/app/admin           staff dashboard: live orders, menu, settings (+ login)
src/app/api             orders, status, admin endpoints, health
src/components          site / menu / cart / order / admin UI
src/lib/brand.ts        brand facts, specials, status copy
src/lib/seed-menu.ts    starter menu (edit here, then `pnpm seed:sql`)
src/lib/orders.ts       pricing, validation, status machine, realtime broadcast
src/lib/notify          WhatsApp + email providers and templates
supabase/               schema + RLS + seed
```

## Things to confirm with the restaurant

- Menu items and prices in `src/lib/seed-menu.ts` are a starter set built from the restaurant's public posts (poke bowls, sushi, fried rice, ramen, wings, margaritas, beer buckets). Replace with the real menu.
- Opening hours, delivery fee/minimum, tax (Anguilla GST) and prep time are placeholders editable in **Admin → Settings**.
- The store WhatsApp number defaults to the published phone line (+1 264 235 8686).

## Screenshots

| Home | Menu | Checkout |
| --- | --- | --- |
| ![Home](docs/screenshots/home.jpg) | ![Menu](docs/screenshots/menu.jpg) | ![Checkout](docs/screenshots/checkout.jpg) |

| Live order board (staff) | Customer tracking page |
| --- | --- |
| ![Board](docs/screenshots/admin-board.jpg) | ![Tracking](docs/screenshots/order-tracking.jpg) |
