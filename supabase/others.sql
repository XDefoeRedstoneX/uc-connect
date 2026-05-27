-- ════════════════════════════════════════════════════════════════════════════
-- UC Connect — others.sql  (FILE 2 of 3: security + infrastructure)
-- RLS enable + policies, function grants, storage buckets + storage policies,
-- pg_cron schedule. Run AFTER schema.sql (it references tables + functions).
-- Idempotent: drop-if-exists guards make this safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Enable RLS ──────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_metrics enable row level security;
alter table public.vendor_hours enable row level security;
alter table public.vendor_items enable row level security;
alter table public.vendor_reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.topups enable row level security;
alter table public.featured_bids enable row level security;
alter table public.featured_slots enable row level security;

-- ─── 2. profiles ────────────────────────────────────────────────────────────
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all" on public.profiles for select using (public.is_admin());
drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- ─── 3. vendors ─────────────────────────────────────────────────────────────
drop policy if exists "vendors_public_read" on public.vendors;
create policy "vendors_public_read" on public.vendors for select using (true);
drop policy if exists "vendors_update_own" on public.vendors;
create policy "vendors_update_own" on public.vendors for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "vendors_admin_update_all" on public.vendors;
create policy "vendors_admin_update_all" on public.vendors for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "vendors_admin_delete_all" on public.vendors;
create policy "vendors_admin_delete_all" on public.vendors for delete using (public.is_admin());

-- ─── 4. vendor_metrics / hours / items ──────────────────────────────────────
drop policy if exists "vendor_metrics_public_read" on public.vendor_metrics;
create policy "vendor_metrics_public_read" on public.vendor_metrics for select using (true);

drop policy if exists "vendor_hours_public_read" on public.vendor_hours;
create policy "vendor_hours_public_read" on public.vendor_hours for select using (true);
drop policy if exists "vendor_hours_owner_all" on public.vendor_hours;
create policy "vendor_hours_owner_all" on public.vendor_hours for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

drop policy if exists "vendor_items_public_read" on public.vendor_items;
create policy "vendor_items_public_read" on public.vendor_items for select using (is_active = true);
drop policy if exists "vendor_items_owner_all" on public.vendor_items;
create policy "vendor_items_owner_all" on public.vendor_items for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- ─── 5. vendor_reviews ──────────────────────────────────────────────────────
drop policy if exists "vendor_reviews_public_read" on public.vendor_reviews;
create policy "vendor_reviews_public_read" on public.vendor_reviews for select using (true);
drop policy if exists "vendor_reviews_user_insert" on public.vendor_reviews;
create policy "vendor_reviews_user_insert" on public.vendor_reviews for insert with check (auth.uid() = user_id);
drop policy if exists "vendor_reviews_user_delete" on public.vendor_reviews;
create policy "vendor_reviews_user_delete" on public.vendor_reviews for delete using (auth.uid() = user_id);
drop policy if exists "vendor_reviews_admin_delete" on public.vendor_reviews;
create policy "vendor_reviews_admin_delete" on public.vendor_reviews for delete using (public.is_admin());
drop policy if exists "vendor_reviews_owner_reply" on public.vendor_reviews;
create policy "vendor_reviews_owner_reply" on public.vendor_reviews for update
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- ─── 6. favorites ───────────────────────────────────────────────────────────
drop policy if exists "favorites_read_own" on public.favorites;
create policy "favorites_read_own" on public.favorites for select using (auth.uid() = user_id);
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid() = user_id);
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid() = user_id);

-- ─── 7. forum (public read, author insert/edit-15min/delete, admin delete) ──
drop policy if exists "forum_categories_public_read" on public.forum_categories;
create policy "forum_categories_public_read" on public.forum_categories for select using (true);

drop policy if exists "forum_threads_public_read" on public.forum_threads;
create policy "forum_threads_public_read" on public.forum_threads for select using (true);
drop policy if exists "forum_threads_insert_auth" on public.forum_threads;
create policy "forum_threads_insert_auth" on public.forum_threads for insert with check (auth.uid() = author_id);
drop policy if exists "forum_threads_author_update" on public.forum_threads;
create policy "forum_threads_author_update" on public.forum_threads for update
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes') with check (auth.uid() = author_id);
drop policy if exists "forum_threads_author_delete" on public.forum_threads;
create policy "forum_threads_author_delete" on public.forum_threads for delete
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes');
drop policy if exists "forum_threads_admin_delete" on public.forum_threads;
create policy "forum_threads_admin_delete" on public.forum_threads for delete using (public.is_admin());

drop policy if exists "forum_replies_public_read" on public.forum_replies;
create policy "forum_replies_public_read" on public.forum_replies for select using (true);
drop policy if exists "forum_replies_insert_auth" on public.forum_replies;
create policy "forum_replies_insert_auth" on public.forum_replies for insert with check (auth.uid() = author_id);
drop policy if exists "forum_replies_author_update" on public.forum_replies;
create policy "forum_replies_author_update" on public.forum_replies for update
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes') with check (auth.uid() = author_id);
drop policy if exists "forum_replies_author_delete" on public.forum_replies;
create policy "forum_replies_author_delete" on public.forum_replies for delete
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes');
drop policy if exists "forum_replies_admin_delete" on public.forum_replies;
create policy "forum_replies_admin_delete" on public.forum_replies for delete using (public.is_admin());

-- ─── 8. notifications ───────────────────────────────────────────────────────
drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete using (auth.uid() = user_id);

-- ─── 9. reports ─────────────────────────────────────────────────────────────
drop policy if exists "reports_insert_auth" on public.reports;
create policy "reports_insert_auth" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_read_own" on public.reports;
create policy "reports_read_own" on public.reports for select using (auth.uid() = reporter_id);
drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports for delete using (auth.uid() = reporter_id and status = 'open');
drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all" on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- ─── 10. Money path: read-own + admin-read; NO client writes ────────────────
drop policy if exists "wallets_read_own" on public.wallets;
create policy "wallets_read_own" on public.wallets for select using (auth.uid() = user_id);
drop policy if exists "wallets_admin_read" on public.wallets;
create policy "wallets_admin_read" on public.wallets for select using (public.is_admin());

drop policy if exists "wallet_tx_read_own" on public.wallet_transactions;
create policy "wallet_tx_read_own" on public.wallet_transactions for select using (auth.uid() = user_id);
drop policy if exists "wallet_tx_admin_read" on public.wallet_transactions;
create policy "wallet_tx_admin_read" on public.wallet_transactions for select using (public.is_admin());

drop policy if exists "topups_read_own" on public.topups;
create policy "topups_read_own" on public.topups for select using (auth.uid() = user_id);
drop policy if exists "topups_admin_read" on public.topups;
create policy "topups_admin_read" on public.topups for select using (public.is_admin());

drop policy if exists "featured_bids_read_own" on public.featured_bids;
create policy "featured_bids_read_own" on public.featured_bids for select using (auth.uid() = user_id);
drop policy if exists "featured_bids_admin_read" on public.featured_bids;
create policy "featured_bids_admin_read" on public.featured_bids for select using (public.is_admin());
drop policy if exists "featured_bids_owner_insert" on public.featured_bids;
create policy "featured_bids_owner_insert" on public.featured_bids for insert
  with check (auth.uid() = user_id and exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid() and v.is_verified = true));
drop policy if exists "featured_bids_owner_update" on public.featured_bids;
create policy "featured_bids_owner_update" on public.featured_bids for update
  using (auth.uid() = user_id and status = 'active') with check (auth.uid() = user_id);
drop policy if exists "featured_bids_owner_delete" on public.featured_bids;
create policy "featured_bids_owner_delete" on public.featured_bids for delete using (auth.uid() = user_id and status = 'active');

drop policy if exists "featured_slots_public_read" on public.featured_slots;
create policy "featured_slots_public_read" on public.featured_slots for select using (true);

-- ─── 11. Lock down money functions (SECURITY DEFINER ⇒ exposed over PostgREST)
-- Without this any logged-in user could call credit_wallet() to top up free.
revoke all on function public.credit_wallet(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.settle_topup(text, jsonb) from public, anon, authenticated;
revoke all on function public.settle_featured_auction(date) from public, anon, authenticated;
grant execute on function public.credit_wallet(uuid, bigint, text, text) to service_role;
grant execute on function public.settle_topup(text, jsonb) to service_role;
grant execute on function public.settle_featured_auction(date) to service_role;

-- ─── 12. Storage buckets ────────────────────────────────────────────────────
-- Public marketing buckets: avatars, forum-images, vendor-assets (banner/logo/
-- product/review photos). PRIVATE: vendor-documents (KTM = student ID) — read
-- only by the owner or an admin; the admin UI fetches a signed URL on demand.
--
-- Every app upload writes under a `${auth.uid()}/...` first folder, so write
-- access is scoped to the uploader (no overwriting another vendor's images).
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('forum-images', 'forum-images', true),
  ('vendor-assets', 'vendor-assets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) values
  ('vendor-documents', 'vendor-documents', false)
on conflict (id) do update set public = false;

-- Public read for the marketing buckets only.
drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects for select
  using (bucket_id in ('avatars', 'forum-images', 'vendor-assets'));

-- KTM read: owner (first path folder = their uid) or admin. (Service-role
-- signed-URL generation bypasses RLS, so the admin UI works regardless.)
drop policy if exists "storage_ktm_read_own_or_admin" on storage.objects;
create policy "storage_ktm_read_own_or_admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'vendor-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Writes (insert/update/delete): only within the uploader's own uid folder.
drop policy if exists "storage_auth_insert" on storage.objects;
create policy "storage_auth_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'forum-images', 'vendor-assets', 'vendor-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "storage_auth_update" on storage.objects;
create policy "storage_auth_update" on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'forum-images', 'vendor-assets', 'vendor-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "storage_auth_delete" on storage.objects;
create policy "storage_auth_delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'forum-images', 'vendor-assets', 'vendor-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── 13. pg_cron daily featured-auction settlement (best-effort) ────────────
do $$
begin
  create extension if not exists pg_cron;
  begin perform cron.unschedule('settle-featured-daily'); exception when others then null; end;
  perform cron.schedule('settle-featured-daily', '1 0 * * *',
    $cron$ select public.settle_featured_auction(current_date); $cron$);
exception when others then
  raise notice 'pg_cron not available (%). Use the admin "Run settlement" trigger.', sqlerrm;
end; $$;
