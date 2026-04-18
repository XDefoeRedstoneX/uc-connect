# UC Connect

Production Next.js app for UC Connect, prepared to deploy from the repository root on Vercel.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase values.
3. Run `npm install`.
4. Start the app with `npm run dev`.

## Deployment

The root of this repository is the deploy target. Vercel should detect the Next.js app automatically from `package.json`.

## Structure

- `pages/`: application routes and API routes
- `components/`: shared UI shell
- `lib/`: Supabase clients
- `supabase/`: schema and RLS starter SQL
- `archive/static-root/`: legacy static prototype files kept for reference