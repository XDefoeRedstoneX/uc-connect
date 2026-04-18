# UC Connect (Next.js + Supabase)

This repository is a Next.js (Pages Router) app wired to Supabase for auth and data.

## Run locally

1. Install deps:

```bash
npm install
```

2. Create `.env.local` (do not commit) based on `.env.example`.

3. Start dev server:

```bash
npm run dev
```

## Supabase setup

- Create tables + RLS policies by running `supabase/schema.sql` in the Supabase SQL Editor.
- Add at least one row to `public.vendors` to see results on `/directory/explore`.

Env vars used by the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for API routes / SSR in this project)

Note: `assets/js/supabase-env.js` is for legacy static HTML pages and is not used by the Next.js app.

## Deploy to Vercel

1. Import the repo into Vercel (Framework preset should auto-detect as Next.js).
2. Add the env vars above in Vercel Project Settings → Environment Variables.
3. Redeploy so the deployment picks up the new env vars.
