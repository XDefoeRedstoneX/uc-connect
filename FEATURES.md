# UC Connect — Features

> **Stack:** Next.js 16 (Pages Router) · Supabase (Postgres + Auth + Storage) · TypeScript · Tailwind + custom design system · Midtrans (payments)
> **Status:** Phases 7–13 delivered. See `tasklist.md` for the live bug/issue tracker and `IMPLEMENTATION_GUIDE.md` for architecture.

UC Connect is a community-based directory that connects student-owned businesses ("vendors") to the wider community, with a forum, reviews, and a paid "featured placement" auction. There are three roles: **customer**, **vendor**, **admin**.

---

## Authentication
- Email + password sign-in/up via Supabase Auth (Bearer-token flow).
- Indonesian phone normalization (shared `lib/phone.ts`, used by register + vendor onboarding).
- Set-username step, forgot-password, email confirmation.
- Account self-delete (profile "danger zone") and admin-initiated account removal.

## Public / Customer
- **Home** — hero, "how it works", **Vendor Sponsor** row (paid featured winners), "Vendor Pilihan" (recent verified).
- **Explore** (`/directory/explore`) — search + category chips; sponsored vendors pinned on top of the unfiltered view; favorite toggle.
- **Vendor detail** (`/directory/vendor/[id]`) — banner + logo, verified/category/location badges, address, university/sales-system/delivery info, WhatsApp CTA with click tracking, menu/products, operating hours, **reviews with photos + vendor replies**, report button, `LocalBusiness` JSON-LD.
- **Forum** — categories, threads, replies, image attachments; **author edit (15-min window) + delete own**; report buttons.
- **Favorites**, **Ulasan Saya** (my reviews), **Diskusi Saya** (my threads/replies).
- **Notifications** — in-app bell (30s polling) + `/notifications` page.
- Legal (privacy/terms), support.

## Vendor
- **Onboarding wizard** — KTM upload (private bucket), university, WhatsApp (validated/required), business details, category, sales system + delivery method (with "Lainnya" option). Pending admin approval.
- **Dashboard tabs:**
  - **Overview** — banner, verified/pending state, WhatsApp clicks, item counts, today's hours.
  - **Edit Profil** — logo + banner upload (owner-scoped storage), Lokasi + detail address, category, description, university, sales system (dropdown), delivery method (checkboxes + Lainnya), live preview.
  - **Produk & Layanan** — items with images, type inferred from category, active toggle.
  - **Jam Operasional** — 7-day grid, apply-to-all.
  - **Ulasan** — list reviews, reply inline.
  - **Featured & Dompet** — Midtrans top-up (Snap), wallet balance + ledger, place/raise/withdraw bid, refresh balance.
  - **Analitik** — snapshot: clicks, rating, favorites, items, featured wins, bid spend, wallet.

## Admin
- **Dashboard** — KPI stats + quick actions.
- **Verifikasi Vendor** — approve/reject, view KTM via short-lived signed URL.
- **Users** — list, change role, delete account.
- **Ulasan** — moderate/delete reviews (filter low-rated).
- **Forum** — delete threads/replies.
- **Laporan** — report queue (resolve/dismiss).
- **Featured** — active slots, ranked bids, manual "run settlement".

## Featured bidding + wallet (revenue path)
- Vendors top up a **wallet** via Midtrans Snap → webhook (signature-verified, idempotent) credits balance through an append-only ledger.
- **Sealed daily auction:** top 5 bids (with sufficient balance) win a 24h featured slot; charged on win (pay-on-win). Settled by **pg_cron** daily, or admin manual trigger. `next_bid_round()` ensures bids never land on an already-settled round.
- Winners appear in the Home "Vendor Sponsor" row + top of Explore.

## Notifications (in-app)
Fan-out Postgres triggers create notifications for: new review on your vendor, new reply on your thread, vendor approved, admin removed your content, new report (to admins), report resolved, bid won/lost, top-up credited.

## Security & hardening
- RLS on every table; money functions (`credit_wallet`, `settle_topup`, `settle_featured_auction`) revoked from public/anon/authenticated, granted only to `service_role`.
- Storage uploads scoped to the uploader's `${auth.uid()}/…` folder; KTM bucket private with signed-URL admin access.
- Best-effort in-memory rate limiting on top-up/bids/reports/reviews.
- Structured JSON logging with request IDs; 500s return a correlatable `requestId`.
- SEO: dynamic `robots.txt` + `sitemap.xml`, `LocalBusiness` JSON-LD.

---

## Known gaps / deferred
- Time-series vendor analytics (needs a `vendor_click_events` log; current Analitik is a snapshot).
- Distributed rate limiting (current limiter is per-instance).
- See `tasklist.md` for the authoritative open list.
