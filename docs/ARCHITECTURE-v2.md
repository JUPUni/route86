# Route 86 v2 · shared contract for the R&D team

Everything below is fixed. Build against it; do not change it without telling the lead.

## Platform
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, pnpm. Vitest for unit tests, Playwright (`@playwright/test`) for e2e.
- Supabase project `xcknmpgiondscrgysyfb` (public URL + anon key are defaults in `src/lib/supabase/env.ts`). **No service-role key.** Privileged server work uses SECURITY DEFINER functions gated by `SERVER_SECRET` (see migration 0003).
- Hosting: Vercel project `route86` linked to `JUPUni/route86` main. Custom domain `https://www.fetelabstest2.site`.
- Providers: WhatsApp (Twilio/Meta, already wired in `src/lib/notify/whatsapp.ts`), Email (Resend, `src/lib/notify/email.ts`), Web Push (VAPID, new), Sentry (new).

## Database (migration `supabase/migrations/0003_accounts_push_reminders.sql`, already applied)
- `profiles` (1:1 auth.users; auto-created by trigger; Google sign-in fills name/avatar). RLS: own row; staff read.
- `orders.customer_id` (set from `auth.uid()` inside `create_order`), `orders.idempotency_key`.
- `order_events` audit trail (trigger). RLS: staff read; customer reads own.
- `push_subscriptions` (audience customer|staff, user_id, order_id, endpoint unique, p256dh, auth).
- `reminders` (kinds: `staff_unaccepted`, `staff_stale_preparing`, `customer_pickup_waiting`, `customer_feedback`) scheduled by trigger, timings in `settings.remind_*`.
- `rate_limits` used by `create_order` (10/10min per IP, 6/hour per phone). `create_order` now accepts `idempotency_key` and `client_ip` in the payload.
- `notifications.channel` now allows `push`; statuses add `delivered|bounced|opened`.

### RPC surface
| Function | Who | Purpose |
| --- | --- | --- |
| `create_order(p jsonb)` | anon/auth | place order (re-prices server-side; uses `auth.uid()` when signed in) |
| `get_public_order(p_id)` | anon | tracking page view |
| `my_orders(p_limit)` | authenticated | customer order history (json with items) |
| `register_push_subscription(p_audience, p_order_id, p_endpoint, p_p256dh, p_auth, p_user_agent)` | anon/auth | subscribe (customer: needs order id or login; staff: `is_staff()`) |
| `unregister_push_subscription(p_endpoint)` | anon/auth | unsubscribe |
| `get_push_targets(p_secret, p_audience, p_order_id)` | server | endpoints to push to |
| `disable_push_subscription(p_secret, p_id)` | server | drop dead endpoints (410/404) |
| `log_notification(...)` | anon | already exists |
| `update_notification_status(p_secret, p_provider_id, p_status, p_error)` | server | provider webhooks |
| `claim_due_reminders(p_secret, p_limit)` / `mark_reminder_sent(p_secret, p_id)` | server (cron) | reminder engine |
| `get_order_for_server(p_secret, p_id)` | server | full order for cron/webhooks |

Call server-gated functions through `getPublicSupabase().rpc(name, { p_secret: process.env.SERVER_SECRET, ... })`.

## Environment variables (names are final)
```
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_DEMO_MODE
SERVER_SECRET            # matches app.server_secret in Postgres
CRON_SECRET              # Vercel cron sends Authorization: Bearer <CRON_SECRET>
NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:)
RESEND_API_KEY, EMAIL_FROM, RESEND_WEBHOOK_SECRET
WHATSAPP_PROVIDER, TWILIO_*, META_WA_*
NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN (optional, source maps)
ADMIN_PASSCODE, AUTH_SECRET (demo mode only)
```

## Auth
- Supabase Auth. Google OAuth provider (customers and staff both use it; email/password stays for staff).
- Browser: `getBrowserSupabase()` (`src/lib/supabase/client.ts`). Server: `getServerSupabase()` cookie-bound (`src/lib/supabase/server.ts`).
- OAuth callback route: `src/app/auth/callback/route.ts` exchanges `code` for a session and redirects to `next` param.
- Session refresh: `src/proxy.ts` (Next 16 name for middleware) refreshes the auth cookie on navigation. Matcher must exclude `_next`, static files, `sw.js`, `manifest.webmanifest`, `icons`.
- `getStaffSession()` in `src/lib/auth.ts` stays the staff gate (email must be in `staff`).
- New `getCustomerSession()` returns `{ user, profile }` or null.

## Web push
- Service worker at `public/sw.js` (plain JS, no bundler). Handles `push` (show notification with title/body/url/tag) and `notificationclick` (focus or open `url`).
- Client helper `src/lib/push-client.ts`: `isPushSupported()`, `getPermissionState()`, `subscribeToPush({ audience, orderId })`, `unsubscribeFromPush()`. Uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. iOS requires the site to be installed to the Home Screen (standalone) before `Notification.requestPermission()` works: detect `navigator.standalone` / `display-mode: standalone` and show install instructions instead of a broken button.
- Server `src/lib/notify/push.ts`: `sendPush(audience, orderId, payload)` using `web-push`, targets from `get_push_targets`, disables on 404/410, logs via `logNotification` with channel `push`.
- `notifyCustomer()` and `notifyStoreNewOrder()` in `src/lib/notify/index.ts` gain the push channel.

## Reminders / cron
- `src/app/api/cron/reminders/route.ts` (GET, checks `Authorization: Bearer ${CRON_SECRET}`), claims due reminders, sends: staff kinds → staff push + WhatsApp/email to store; customer kinds → customer push + WhatsApp/email. Marks sent.
- `vercel.json` `crons: [{ "path": "/api/cron/reminders", "schedule": "* * * * *" }]`.

## Webhooks
- `src/app/api/webhooks/resend/route.ts` (svix signature with `RESEND_WEBHOOK_SECRET`) → `update_notification_status`.
- `src/app/api/webhooks/twilio/route.ts` (status callback, validate signature with auth token) → `update_notification_status`.

## Routes owned per area (avoid touching others' files)
| Area | Owner agent | Files |
| --- | --- | --- |
| Customer mobile UI | A1 | `src/app/(site)/**` (except `order/[id]`), `src/components/site/**`, `src/components/menu/**`, `src/components/cart/**`, `src/app/globals.css`, `src/app/layout.tsx` (viewport/meta only), `public/manifest.webmanifest`, `public/icons/**` |
| Staff tablet UI + staff push UI | A2 | `src/app/admin/**`, `src/components/admin/**` |
| Auth & accounts | A3 | `src/app/auth/**`, `src/app/(site)/account/**`, `src/app/(site)/order/[id]/**` (sign-in nudge only), `src/proxy.ts`, `src/lib/auth.ts` (add customer session; keep staff API), `src/lib/supabase/**`, `src/components/auth/**`, checkout prefill hook `src/components/cart/CheckoutPrefill.tsx` (A1 renders it) |
| Notifications & reminders | A4 | `src/lib/notify/**`, `src/lib/push-client.ts`, `public/sw.js`, `src/app/api/push/**`, `src/app/api/cron/**`, `src/app/api/webhooks/**`, `vercel.json`, `src/components/order/PushOptIn.tsx` (A1/A3 render it) |
| Backend hardening & observability | A5 | `src/app/api/orders/**`, `src/app/api/admin/**`, `src/lib/orders.ts`, `src/lib/data.ts`, `src/lib/logger.ts`, Sentry config files, `src/__tests__/**`, `e2e/**`, `playwright.config.ts`, `.github/workflows/ci.yml`, `src/lib/types.ts` (additive only) |
| QA / integration | A6 | runs after merge: device matrix, fixes anywhere, `README.md`, `docs/**` |

Shared types live in `src/lib/types.ts`; add fields, never rename. `src/lib/brand.ts` is read-only for everyone.

## Device matrix (Playwright `devices`)
iPhone 13 / 13 mini / 13 Pro Max, iPhone 14 / 14 Pro / 14 Pro Max, iPhone 15 / 15 Pro Max, iPhone 16 / 16 Pro Max (use closest available presets; add custom viewports 390×844, 375×812, 430×932, 402×874), iPad Mini, iPad (gen 7), iPad Pro 11 (portrait + landscape), Pixel 5, Pixel 7, Galaxy S8/S9+/S23-ish (360×780, 412×915). Every page: no horizontal scroll, tap targets ≥44px, inputs ≥16px font, safe-area padding, sticky elements don't cover content.
