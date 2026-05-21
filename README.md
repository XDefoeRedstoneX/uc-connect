# UC Connect (Next.js + Supabase)

This repository is a Next.js (Pages Router) app wired to Supabase for auth and data.

## Run locally

1. Install deps:

```bash
npm install
```

2. Bootstrap `.env.local` (do not commit):

```bash
npm run setup:env
```

Then fill in your hosted Supabase values.

3. Start dev server:

```bash
npm run dev
```

If you want a quick preflight check before starting or building, use:

```bash
npm run setup:env
npm run check:env
npm run dev:ready
npm run build:ready
```

## Supabase setup

The database lives in **three files**, run in this order in the Supabase SQL Editor:

1. `supabase/schema.sql` — structure: tables, columns, functions, triggers, indexes. **Destructive** (drops & recreates every table).
2. `supabase/others.sql` — security + infrastructure: RLS policies, function grants, storage buckets + storage policies, the pg_cron settlement job.
3. `supabase/seeder.sql` — demo data: vendors, hours, metrics, menu/service items, forum categories.

Then seed baseline accounts + sample forum content (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):

```bash
npm run seed:users
```

This creates admin / vendor / customer accounts (default password printed at the end), links the demo vendor to an owner, and seeds a sample forum thread + replies.

> Storage buckets are created by `others.sql`: `avatars`, `forum-images`, `vendor-assets` are **public** (marketing images); `vendor-documents` (KTM) is **private** — read only by the owner or an admin, and the admin UI fetches a short-lived signed URL via `/api/admin/vendors/ktm`. All uploads are scoped to the uploader's `${auth.uid()}/…` folder by RLS.

Env vars used by the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for API routes / SSR in this project)

Payments / featured bidding (Midtrans — optional until you use the wallet):

- `MIDTRANS_SERVER_KEY` (server-only; used to create Snap transactions + verify webhook signatures)
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (client; loads Snap.js popup)
- `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` and `MIDTRANS_IS_PRODUCTION` (`true` for production, otherwise sandbox)

Set the Midtrans **Payment Notification URL** in the Midtrans dashboard to `https://<your-domain>/api/payments/midtrans/webhook`.

The `check:env` script verifies the Supabase vars are present in `.env.local` before local dev or build starts (Midtrans keys produce a warning, not a failure).

### Featured-auction settlement (pg_cron)

`others.sql` registers a daily `pg_cron` job (`settle-featured-daily`, 00:01) that calls `settle_featured_auction(current_date)`. If `pg_cron` is not enabled on your Supabase project, enable it under Database → Extensions, or just use the admin **"Jalankan Settlement"** button at `/admin/featured`. Settlement is idempotent per round.

## Deploy runbook (Vercel + Supabase)

1. **Supabase SQL** — in the SQL Editor, run in order: `schema.sql` → `others.sql` → `seeder.sql`. Enable the `pg_cron` extension (Database → Extensions) if the cron block warns.
2. **Seed accounts** — locally with `.env.local` set: `npm run seed:users` (creates admin/vendor/customer + sample forum content).
3. **Vercel env vars** (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION`
4. **Midtrans** — set the Payment Notification URL to `https://<your-domain>/api/payments/midtrans/webhook`. Use the matching (sandbox vs production) server+client keys.
5. **Deploy** and run the smoke test below.

### Smoke test (do after every deploy)

- [ ] Home + `/directory/explore` load; verified vendors show; sponsored row appears if there's an active featured slot.
- [ ] `/robots.txt` and `/sitemap.xml` return content with your domain.
- [ ] Register → set username → login.
- [ ] Vendor: edit profile, upload **banner + logo + product image** (all succeed), submit a bid after a wallet top-up (Midtrans sandbox).
- [ ] Midtrans webhook credits the wallet (check `wallet_transactions`).
- [ ] Customer: leave a review (with photo), report content; both succeed and are rate-limited on rapid repeat (429).
- [ ] Admin: `/admin/vendors` approve a vendor + view KTM (signed URL opens); `/admin/featured` run settlement; `/admin/reports` resolve a report.
- [ ] Notifications bell updates within ~30s of an event.

> `assets/js/supabase-env.js` is for legacy static HTML pages and is not used by the Next.js app.
