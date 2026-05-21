# UC Connect — Implementation Guide

> **Stack:** Next.js 16 (Pages Router) · Supabase (Postgres + Auth + Storage) · TypeScript · Tailwind + CSS variables · Midtrans Snap
> Companion docs: `FEATURES.md` (what exists), `tasklist.md` (open issues), `README.md` (run/deploy).

---

## Architecture

```
pages/
  api/
    admin/          stats, vendors/{index,ktm}, users/{index,[id]}, reviews, forum, reports, featured/{index,settle}
    vendor/         profile, hours, items/*, analytics, whatsapp-click, [id]/reviews/{index,[reviewId]}
    vendors/        index (list + featured), [id] (detail)
    wallet/         index (balance+ledger), topup
    featured/       bids
    payments/midtrans/  webhook
    profile, profile/{reviews,threads}, reports, notifications, favorites, health
  admin/            dashboard, vendors, users, reviews, forum, reports, featured
  auth/             login, register, forgot-password, set-username
  community/        index, [slug]/{index,new,[thread_id]}
  customer/         profile, favorites, reviews, threads
  directory/        explore, vendor/[id]
  vendor/           onboarding, dashboard
  notifications.tsx, robots.txt.ts, sitemap.xml.ts
components/
  admin/AdminNav · vendor/{TabOverview,TabEditProfile,TabItems,TabHours,TabReviews,TabFeatured,TabAnalytics}
  SiteLayout · NotificationBell · ReportButton · VendorCard · VendorOnboardingWizard · HeroSection · …
lib/
  api-auth (resolveAuthedUser) · api-admin (requireAdmin) · api-response (+ structured 500s)
  supabase-browser · supabase-server (service role) · midtrans · rate-limit · logger · phone
  compress-image · profile-image-upload · language-context · translations · public-errors
types/domain.ts     all shared types
supabase/           schema.sql · others.sql · seeder.sql  (the 3 canonical SQL files)
```

---

## Database — 3 SQL files (run in order)

**Destructive rebuild model** (pre-launch). Run in the Supabase SQL editor:

1. **`schema.sql`** — DDL only: extensions, table drops + creates, all functions, triggers, indexes, profile backfill. All triggers are `drop ... if exists`-guarded so re-runs are clean (incl. `on_auth_user_created` on `auth.users`).
2. **`others.sql`** — security + infra: RLS enable + all policies, money-function `revoke`/`grant`, storage buckets + storage policies, pg_cron settlement job. Idempotent.
3. **`seeder.sql`** — demo data (truncate + insert). Then `npm run seed:users` for admin/vendor/customer accounts + sample forum content.

### Tables
| Table | Purpose |
|-------|---------|
| `profiles` | extends auth.users; role customer/vendor/admin |
| `vendors` | listings; +`logo_url`, `address`, `university`, `sales_system`, `delivery_methods`, `ktm_url`, `whatsapp_clicks` |
| `vendor_metrics` | rating/response/review_count (auto-recalc trigger) |
| `vendor_hours`, `vendor_items` | hours; products/menu/services |
| `vendor_reviews` | rating + content + `image_url` + `vendor_reply` |
| `favorites` | user↔vendor |
| `forum_categories`, `forum_threads`, `forum_replies` | forum (+ `image_url`, `updated_at`) |
| `notifications` | in-app, jsonb payload, 9 types |
| `reports` | polymorphic moderation queue |
| `wallets`, `wallet_transactions` | balance (bigint IDR) + append-only ledger |
| `topups` | Midtrans orders |
| `featured_bids`, `featured_slots` | sealed daily auction + winners |

### Key functions
`is_admin()`, `touch_updated_at()`, `handle_new_user()`, `increment_whatsapp_clicks()`, `recalculate_vendor_rating()`, `credit_wallet()`, `settle_topup()`, `settle_featured_auction()`, `next_bid_round()`, and 7 `notify_*` fan-out triggers.

### RLS principles
Public read on vendors/metrics/hours/active-items/reviews/forum/featured_slots. Owner-write on vendor-owned tables. `is_admin()` (SECURITY DEFINER, bypasses RLS internally — no recursion) gates admin policies. Money tables are read-own only; balances mutate only via service-role functions.

> **PostgREST embedding caveat:** tables reference `auth.users(id)`, not `profiles(id)`. PostgREST cannot embed `profiles` through an `auth.users` FK, so author/owner names must be fetched in a **separate query keyed by the id** (or the FK retargeted to `profiles`). See `tasklist.md`.

---

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY            # or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY                # server-only; required for API routes/SSR
MIDTRANS_SERVER_KEY                      # server-only
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY          # Snap.js
MIDTRANS_IS_PRODUCTION / NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION
```
`npm run check:env` validates Supabase vars (Midtrans → warning).

---

## Auth & API conventions
- `resolveAuthedUser(req)` validates the Bearer token and returns a **service-role** Supabase client (bypasses RLS — endpoints enforce ownership in code).
- `requireAdmin(req,res)` → 403 unless `profiles.role = 'admin'`.
- Responses via `lib/api-response`; 500s log a structured line + return a `requestId`.
- Mutating endpoints (topup/bids/reports/reviews) pass through `lib/rate-limit`.

## Storage
Buckets: `avatars`, `forum-images`, `vendor-assets` (public), `vendor-documents` (private; KTM). Every upload path starts with `${auth.uid()}/…`; RLS scopes writes to that folder. Admin KTM view fetches a 120s signed URL via `/api/admin/vendors/ktm`.

## Payments (Midtrans)
Top-up → `POST /api/wallet/topup` creates a Snap transaction (server-generated order id + amount). `Snap.pay()` on the client. Midtrans → `POST /api/payments/midtrans/webhook` (SHA-512 signature verified) → `settle_topup()` credits the wallet exactly once. Set the Payment Notification URL to `/api/payments/midtrans/webhook`.

## Featured auction
Bids target `next_bid_round()` (next unsettled round). `settle_featured_auction(round)` picks the top 5 payable bids, charges wallets, writes `featured_slots` (24h), notifies winners/losers. Idempotent per round. Runs via pg_cron (00:01) or admin manual trigger.

---

## Development
```bash
npm install
npm run dev            # or dev:ready (runs check:env first)
npx tsc --noEmit       # type check
```

## Deploy
See `README.md` → "Deploy runbook" (SQL order, env, Midtrans webhook, pg_cron, smoke-test checklist).
