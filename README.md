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

- **Fresh DB:** run `supabase/schema.sql` in the Supabase SQL Editor (destructive — drops and recreates everything).
- **Existing DB:** run only the latest `supabase/migration_phase{N}.sql` to apply deltas. Each migration is idempotent and safe to re-run.
- After schema is up, run `supabase/seed.sql` to load demo vendors, hours, metrics, and menu/service items.
- Finally, seed baseline accounts (admin / vendor / customer) so you can log in:

```bash
npm run seed:users
```

This needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Default password for all three accounts is printed at the end of the run.

Env vars used by the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for API routes / SSR in this project)

The `check:env` script verifies these are present in `.env.local` before local dev or build starts.

Note: `assets/js/supabase-env.js` is for legacy static HTML pages and is not used by the Next.js app.

## Deploy to Vercel

1. Import the repo into Vercel (Framework preset should auto-detect as Next.js).
2. Add the env vars above in Vercel Project Settings → Environment Variables.
3. Redeploy so the deployment picks up the new env vars.
