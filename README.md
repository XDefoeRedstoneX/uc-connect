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

> Storage buckets (`avatars`, `forum-images`, `vendor-assets`, `vendor-documents`) are created by `others.sql`. Note: `vendor-documents` (KTM uploads) is currently public — flagged for hardening to private + signed URLs before real launch.

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

`schema.sql` / `migration_phase10.sql` try to register a daily `pg_cron` job (`settle-featured-daily`, 00:01) that calls `settle_featured_auction(current_date)`. If `pg_cron` is not enabled on your Supabase project, enable it under Database → Extensions, or just use the admin **"Jalankan Settlement"** button at `/admin/featured` (and/or schedule the SQL externally). Settlement is idempotent per round.

Note: `assets/js/supabase-env.js` is for legacy static HTML pages and is not used by the Next.js app.

## Deploy to Vercel

1. Import the repo into Vercel (Framework preset should auto-detect as Next.js).
2. Add the env vars above in Vercel Project Settings → Environment Variables.
3. Redeploy so the deployment picks up the new env vars.
