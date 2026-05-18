-- ════════════════════════════════════════════════════════════════════════════
-- UC Connect — Phase 7 migration
-- Safe to re-run on a live DB. Brings any earlier DB up to Phase 7 state.
-- Run order: this file *includes* the Phase 5 + 6 deltas in case they were
-- never applied. It also re-asserts is_admin() before any policy uses it,
-- which fixes the "function public.is_admin() does not exist" error.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. Helper guards ───────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- Always (re-)create is_admin() first. plpgsql functions are bound at execute
-- time, so this is safe even if profiles is newer than the function.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── 1. Phase 5 backfill (vendor onboarding columns + forum images) ─────────
alter table public.vendors add column if not exists university text;
alter table public.vendors add column if not exists sales_system text;
alter table public.vendors add column if not exists delivery_methods text;
alter table public.vendors add column if not exists ktm_url text;

alter table public.forum_threads add column if not exists image_url text;
alter table public.forum_replies add column if not exists image_url text;

-- ─── 2. Phase 6 backfill (vendor_reviews + auto-rating) ─────────────────────
create table if not exists public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text,
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);

alter table public.vendor_reviews enable row level security;

drop policy if exists "vendor_reviews_public_read" on public.vendor_reviews;
create policy "vendor_reviews_public_read"
  on public.vendor_reviews for select using (true);

drop policy if exists "vendor_reviews_user_insert" on public.vendor_reviews;
create policy "vendor_reviews_user_insert"
  on public.vendor_reviews for insert with check (auth.uid() = user_id);

drop policy if exists "vendor_reviews_user_delete" on public.vendor_reviews;
create policy "vendor_reviews_user_delete"
  on public.vendor_reviews for delete using (auth.uid() = user_id);

drop policy if exists "vendor_reviews_admin_delete" on public.vendor_reviews;
create policy "vendor_reviews_admin_delete"
  on public.vendor_reviews for delete using (public.is_admin());

create or replace function public.recalculate_vendor_rating()
returns trigger
language plpgsql
security definer
as $$
declare
  v_id uuid;
  new_avg numeric(3,2);
  new_count integer;
begin
  v_id := coalesce(new.vendor_id, old.vendor_id);

  select coalesce(avg(rating), 0)::numeric(3,2), count(*)::integer
  into new_avg, new_count
  from public.vendor_reviews
  where vendor_id = v_id;

  insert into public.vendor_metrics (vendor_id, sample_rating, review_count, updated_at)
  values (v_id, new_avg, new_count, now())
  on conflict (vendor_id) do update
    set sample_rating = new_avg,
        review_count = new_count,
        updated_at = now();

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalculate_vendor_rating on public.vendor_reviews;
create trigger trg_recalculate_vendor_rating
after insert or delete on public.vendor_reviews
for each row execute function public.recalculate_vendor_rating();

-- ─── 3. Phase 7: vendor reply on reviews ────────────────────────────────────
alter table public.vendor_reviews add column if not exists vendor_reply text;
alter table public.vendor_reviews add column if not exists vendor_reply_at timestamptz;

drop policy if exists "vendor_reviews_owner_reply" on public.vendor_reviews;
create policy "vendor_reviews_owner_reply"
  on public.vendor_reviews for update
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- ─── 4. Phase 7: reports table (used in Phase 7 + 8) ────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('vendor', 'review', 'thread', 'reply')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_auth" on public.reports;
create policy "reports_insert_auth"
  on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_read_own" on public.reports;
create policy "reports_read_own"
  on public.reports for select using (auth.uid() = reporter_id);

drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all"
  on public.reports for all using (public.is_admin()) with check (public.is_admin());

create index if not exists vendor_reviews_vendor_idx on public.vendor_reviews (vendor_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);

-- ─── 5. Phase 7: cleanup pass ───────────────────────────────────────────────
-- If any vendor.description was previously created with the legacy "append
-- onboarding choices into description" pattern, those structured snippets are
-- now stored in their own columns and should be stripped from description.
-- Pattern: lines like "Universitas: X" / "Sistem: Y" / "Pengiriman: Z" that
-- previous wizard versions appended. Safe no-op if no such rows exist.
update public.vendors
set description = btrim(regexp_replace(
  description,
  '(\s*\n)?(Universitas|Sistem Penjualan|Sistem|Pengiriman|Metode Pengiriman|Delivery)\s*:[^\n]*',
  '',
  'gi'
))
where description ~* '(Universitas|Sistem Penjualan|Sistem|Pengiriman|Metode Pengiriman|Delivery)\s*:';
