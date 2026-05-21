# UC Connect — Task List & Bug Tracker

> Living tracker for delivered phases + a review of bugs / logic fallacies found.
> Last reviewed: Phase 12 (profile expansion + vendor analytics).

---

## Delivered phases

- [x] **Phase 7** — Schema reconciliation, vendor-onboarding redundancy fix, admin/test seeder, reviews close-out (vendor reply + admin moderation).
- [x] **Phase 8** — Moderation & account lifecycle: reports, admin reports queue, account self-delete + admin delete, forum author edit/delete (15-min window), report buttons.
- [x] **Phase 9** — In-app notifications: `notifications` table + 6 fan-out triggers, bell + `/notifications`, polling.
- [x] **Phase 10** — Featured bidding + wallet: Midtrans top-up, sealed daily top-5 auction, pg_cron settlement, sponsored placement on home/explore, admin featured page.
- [x] **Phase 11** — Upload-bug fix, 3-file SQL split (`schema.sql` / `others.sql` / `seeder.sql`), WhatsApp normalization, "Lainnya" options, Lokasi+address, delivery checkboxes, logo, review photos.
- [x] **Phase 12** — Profile expansion ("Ulasan Saya" / "Diskusi Saya") + vendor analytics snapshot tab.

---

## Bugs & logic fallacies found in review

### Fixed in this pass
- [x] **[HIGH · data corruption] Onboarding "Lainnya" delivery method stored as "Digital Delivery".**
  `pages/api/vendor-onboarding.ts` mapped `cod-kampus → "COD Kampus"`, everything-else → `"Digital Delivery"`. After Phase 11 added `lainnya`, choosing it silently saved the wrong value. Fixed with an explicit label map.
- [x] **[LOW · display] Public vendor page showed the raw `sales_system` slug** (`ready-stock`) instead of "Ready Stock". `pages/directory/vendor/[id].tsx` now maps slug → label.

### Security — RESOLVED
- [x] **[HIGH] Storage policies now owner-scoped.** All app uploads write under a `${auth.uid()}/...` first folder (banner/logo/items/forum/review/KTM/avatar paths standardized). `others.sql` insert/update/delete policies require `(storage.foldername(name))[1] = auth.uid()` — a user can no longer touch another vendor's objects.
- [x] **[HIGH · privacy] `vendor-documents` is now PRIVATE.** Bucket `public=false`; read policy = owner-folder or admin. Onboarding stores the object **path** (not a public URL); admin "Lihat KTM" calls `GET /api/admin/vendors/ktm` which returns a 120s **signed URL** via the service role.
- [x] **[LOW] Review `image_url` validated** — `POST /api/vendor/[id]/reviews` now only accepts URLs under our `…/storage/v1/object/public/` origin; anything else is dropped to `null`.

### Logic / correctness — RESOLVED (+ accepted)
- [x] **[MED] Manual-settlement orphan fixed.** New `next_bid_round()` SQL function returns the earliest unsettled future round; `POST /api/featured/bids` targets it, so a bid can never land on an already-settled round.
- [x] **[LOW] Featured-after-unverify fixed.** Home, Explore, and `/api/vendors` now `.eq("is_verified", true)` when resolving featured/sponsored vendors.
- [~] **[LOW · accepted] `delivery_methods` stored as labels, parsed back by label** (`parseDelivery`). Left as-is — works today; revisit only if labels are ever renamed.
- [~] **[LOW · accepted] Onboarding sets `role='vendor'` before approval.** Intended: vendors edit their profile while pending; bidding stays gated by `is_verified`.

### UX / robustness — RESOLVED
- [x] **[MED] `NotificationBell` reads a fresh token each poll** (via `currentToken()` from the live session) — no more stale-token 401s after refresh.
- [x] **[LOW] Wallet "↻ Perbarui saldo" button** added so the vendor can re-pull balance after a Midtrans top-up settles.
- [x] **[LOW] `seeder.sql` truncate list completed** — now lists all child tables (featured_*, topups, wallet_*, notifications, reports, vendor_reviews, …) before the cascade.

---

## Phase 13 — production hardening — DONE
- [x] **Rate limiting** — `lib/rate-limit.ts` (in-memory fixed-window) applied to `topup` (10/min), `bids` (20/min), `reports` (10/min), `reviews` (10/min), keyed by user. Returns 429 + `Retry-After`. NOTE: per-instance on serverless — best-effort spam guard; back with Upstash/Redis for hard global limits.
- [x] **Structured logging** — `lib/logger.ts` emits JSON lines; `sendInternalServerError` now logs with a `requestId` (also returned to the client for support correlation); Midtrans webhook logs signature rejects + settlements.
- [x] **SEO** — dynamic `pages/robots.txt.ts` (disallows admin/api/dashboard, links sitemap) + `pages/sitemap.xml.ts` (static routes + verified vendors, host-derived) + `LocalBusiness` JSON-LD (with `aggregateRating`) on the vendor detail page.
- [x] **Deploy runbook** — README now has ordered SQL/seed/env/Midtrans steps + a post-deploy smoke-test checklist.

### Still deferred (future)
- [ ] Time-series vendor analytics — needs a `vendor_click_events` log table; current Analitik tab is a live snapshot.
- [ ] Distributed rate limiting (Upstash/Redis) if/when traffic justifies it.

---

## Phase 14 — Admin fix + quick UX wins — DONE
- [x] **[P0] Admin lists showed nothing — fixed.** Root cause: tables FK'd `auth.users`, but admin/public queries embed `profiles` (`profiles!..._fkey`, `reporter:reporter_id`, `profiles:user_id`), which PostgREST can't resolve through an `auth.users` FK. Retargeted `vendors.owner_id`, `forum_threads.author_id`, `forum_replies.author_id`, `vendor_reviews.user_id`, `reports.reporter_id` → `profiles(id)` in `schema.sql`. All admin embeds (vendors/forum/reports/reviews) **and** the public vendor-reviews embed now resolve. No API code change.
- [x] **Password eye toggle** — added to `FormField`; covers login + register (+ confirm) automatically.
- [x] **Sponsor row premium styling** — `VendorCard` gains a `highlight` prop (gold ring + "⭐ SPONSOR" ribbon); applied on Home + Explore sponsored rows; removed the redundant text badge.

> ⚠️ **Requires DB re-run:** the FK change lives in `schema.sql`. Re-run `schema.sql` → `others.sql` → `seeder.sql`, then `npm run seed:users`, for admin lists to populate.

### Phase 14+ backlog (from project review)
- [ ] **Phase 17** — Google OAuth; Supabase free-tier hygiene (cleanup expired featured_slots/old notifications, storage monitoring).

## Phase 16 — mobile responsive pass — DONE
- [x] Added responsive helper classes to `globals.css`: `.split-main-aside` (stacks form+preview ≤768px), `.hours-row` (operating-hours row stacks ≤560px), `.scroll-tabs` (tab bars swipe horizontally ≤560px).
- [x] Applied: `TabEditProfile` (was a fixed `1fr min(340px,40%)` that squished the preview), `TabHours` (was a 5-column row unusable on phones), vendor dashboard tab bar + `AdminNav` (7 tabs each → horizontal scroll), support page two-column.
- [x] Verified the onboarding wizard was already responsive (`max-w-3xl mx-auto` + `sm:grid-cols-2`); public pages already stack via existing `@media (max-width:960px/640px)` rules.
- CSS/layout only — no DB re-run needed.

## Phase 15 — Onboarding fields + public profiles — DONE
- [x] **`profiles.major` + `profiles.graduation_year`** added (schema.sql). Onboarding wizard now asks Jurusan + Tahun Kelulusan (year select, +8…−8). **Same-year grads allowed** — years ≤ current are labelled "(sudah/alumni)" and don't block; persisted via `/api/vendor-onboarding`.
- [x] **Public profile `/u/[username]`** — avatar, name, @username, role + **🎓 Alumni** badge (when graduation_year ≤ current year), major/year, their vendor card (if any), recent threads.
- [x] **Clickable forum avatars/names → `/u/[username]`** — `AuthorLink` wrapper on thread OP + replies; `username` added to the thread page's profile selects.
- [x] **Customer profile** edits major + graduation_year (`/api/profile` GET/PUT extended; `UserProfile` type updated).

> ⚠️ Requires DB re-run (`schema.sql` adds the two columns).
