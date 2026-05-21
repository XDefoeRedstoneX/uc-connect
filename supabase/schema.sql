-- ════════════════════════════════════════════════════════════════════════════
-- UC Connect — schema.sql  (FILE 1 of 3: structure)
-- Tables, columns, functions, triggers, indexes. DDL only.
-- Run order:  schema.sql  →  others.sql  →  seeder.sql
-- Destructive: re-running drops & recreates every table.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. Cleanup (reverse-dependency order) ──────────────────────────────────
drop table if exists public.featured_slots cascade;
drop table if exists public.featured_bids cascade;
drop table if exists public.topups cascade;
drop table if exists public.wallet_transactions cascade;
drop table if exists public.wallets cascade;
drop table if exists public.notifications cascade;
drop table if exists public.reports cascade;
drop table if exists public.vendor_reviews cascade;
drop table if exists public.forum_replies cascade;
drop table if exists public.forum_threads cascade;
drop table if exists public.forum_categories cascade;
drop table if exists public.favorites cascade;
drop table if exists public.vendor_items cascade;
drop table if exists public.vendor_hours cascade;
drop table if exists public.vendor_metrics cascade;
drop table if exists public.vendors cascade;
drop table if exists public.profiles cascade;

create extension if not exists pgcrypto;

-- ─── 1. Generic helpers ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ─── 2. profiles + is_admin() (defined before any policy that uses it) ──────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  phone text,
  avatar_url text,
  major text,
  graduation_year smallint,
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_username text;
  meta_full_name text;
  meta_phone text;
begin
  meta_username := nullif(btrim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  meta_full_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  meta_phone := nullif(btrim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  insert into public.profiles (id, username, full_name, phone, role, updated_at)
  values (new.id, meta_username, meta_full_name, meta_phone, 'customer', now())
  on conflict (id) do nothing;
  return new;
end; $$;

-- ─── 3. Vendor tables ───────────────────────────────────────────────────────
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  -- FK targets profiles(id) (not auth.users) so PostgREST can embed the owner
  -- profile in admin queries. profiles.id === auth.users.id (1:1).
  owner_id uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  name text not null,
  tagline text,
  category text,
  city text,
  address text,                       -- detailed location (building/area/campus)
  description text,
  whatsapp text,
  website_url text,
  hero_image_url text,                -- banner
  logo_url text,                      -- logo / profile image
  is_verified boolean not null default false,
  whatsapp_clicks integer not null default 0,
  university text,
  sales_system text,
  delivery_methods text,
  ktm_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_metrics (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  sample_rating numeric(3,2) not null default 0 check (sample_rating >= 0 and sample_rating <= 5),
  response_rate numeric(5,2) not null default 0 check (response_rate >= 0 and response_rate <= 100),
  avg_reply_time text not null default 'Unknown',
  review_count integer not null default 0 check (review_count >= 0),
  updated_at timestamptz not null default now()
);

create table public.vendor_hours (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  notes text,
  unique (vendor_id, day_of_week)
);

create table public.vendor_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  item_type text not null default 'menu' check (item_type in ('menu', 'service', 'product')),
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  currency text not null default 'IDR',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text,
  image_url text,                     -- optional single photo on the review
  vendor_reply text,
  vendor_reply_at timestamptz,
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);

-- ─── 4. Engagement tables ───────────────────────────────────────────────────
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vendor_id)
);

create table public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 5. Notifications + reports ─────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'review_received', 'forum_reply', 'vendor_approved', 'content_removed',
    'report_received', 'report_resolved',
    'bid_won', 'bid_lost', 'topup_credited'
  )),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('vendor', 'review', 'thread', 'reply')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── 6. Money path: wallets, ledger, top-ups, featured bids/slots ───────────
create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_idr bigint not null default 0 check (balance_idr >= 0),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('topup', 'bid_charge', 'refund', 'adjustment')),
  amount_idr bigint not null,
  balance_after bigint not null,
  reference text,
  created_at timestamptz not null default now()
);

create table public.topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  amount_idr bigint not null check (amount_idr > 0),
  status text not null default 'pending' check (status in ('pending', 'settled', 'failed', 'expired')),
  snap_token text,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.featured_bids (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  round_date date not null default (current_date + 1),
  amount_idr bigint not null check (amount_idr > 0),
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, round_date)
);

create table public.featured_slots (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  round_date date not null,
  rank smallint not null check (rank between 1 and 5),
  amount_charged_idr bigint not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ─── 7. RPC + business-logic functions ──────────────────────────────────────
create or replace function public.increment_whatsapp_clicks(v_id uuid)
returns void language sql security definer as $$
  update public.vendors set whatsapp_clicks = whatsapp_clicks + 1 where id = v_id;
$$;

create or replace function public.recalculate_vendor_rating()
returns trigger language plpgsql security definer as $$
declare
  v_id uuid; new_avg numeric(3,2); new_count integer;
begin
  v_id := coalesce(new.vendor_id, old.vendor_id);
  select coalesce(avg(rating), 0)::numeric(3,2), count(*)::integer
  into new_avg, new_count from public.vendor_reviews where vendor_id = v_id;
  insert into public.vendor_metrics (vendor_id, sample_rating, review_count, updated_at)
  values (v_id, new_avg, new_count, now())
  on conflict (vendor_id) do update
    set sample_rating = new_avg, review_count = new_count, updated_at = now();
  return coalesce(new, old);
end; $$;

create or replace function public.credit_wallet(p_user uuid, p_amount bigint, p_type text, p_reference text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_balance bigint;
begin
  insert into public.wallets (user_id, balance_idr) values (p_user, greatest(p_amount, 0))
  on conflict (user_id) do update
    set balance_idr = public.wallets.balance_idr + p_amount, updated_at = now()
  returning balance_idr into new_balance;
  if new_balance < 0 then raise exception 'wallet balance cannot go negative'; end if;
  insert into public.wallet_transactions (user_id, type, amount_idr, balance_after, reference)
  values (p_user, p_type, p_amount, new_balance, p_reference);
  return new_balance;
end; $$;

create or replace function public.settle_featured_auction(p_round date default current_date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; slot_rank int := 0;
  window_start timestamptz := now(); window_end timestamptz := now() + interval '24 hours';
begin
  if exists (select 1 from public.featured_slots where round_date = p_round) then return 0; end if;
  for r in
    select b.id, b.vendor_id, b.user_id, b.amount_idr from public.featured_bids b
    where b.round_date = p_round and b.status = 'active'
    order by b.amount_idr desc, b.created_at asc
  loop
    exit when slot_rank >= 5;
    if exists (select 1 from public.wallets w where w.user_id = r.user_id and w.balance_idr >= r.amount_idr) then
      slot_rank := slot_rank + 1;
      perform public.credit_wallet(r.user_id, -r.amount_idr, 'bid_charge', r.id::text);
      update public.featured_bids set status = 'won', updated_at = now() where id = r.id;
      insert into public.featured_slots (vendor_id, round_date, rank, amount_charged_idr, starts_at, ends_at)
      values (r.vendor_id, p_round, slot_rank, r.amount_idr, window_start, window_end);
      insert into public.notifications (user_id, type, payload)
      values (r.user_id, 'bid_won', jsonb_build_object('vendor_id', r.vendor_id, 'rank', slot_rank, 'amount', r.amount_idr));
    else
      update public.featured_bids set status = 'lost', updated_at = now() where id = r.id;
      insert into public.notifications (user_id, type, payload)
      values (r.user_id, 'bid_lost', jsonb_build_object('vendor_id', r.vendor_id, 'reason', 'insufficient_balance', 'amount', r.amount_idr));
    end if;
  end loop;
  insert into public.notifications (user_id, type, payload)
  select user_id, 'bid_lost', jsonb_build_object('vendor_id', vendor_id, 'reason', 'outbid', 'amount', amount_idr)
  from public.featured_bids where round_date = p_round and status = 'active';
  update public.featured_bids set status = 'lost', updated_at = now()
  where round_date = p_round and status = 'active';
  return slot_rank;
end; $$;

-- Earliest future round (within 14 days) that hasn't been settled yet. Bids
-- target this so they never land on an already-settled round (e.g. after a
-- manual admin settlement).
create or replace function public.next_bid_round()
returns date language sql stable security definer set search_path = public as $$
  select coalesce(min(d), current_date + 1) from (
    select (current_date + g)::date as d from generate_series(1, 14) g
  ) candidate
  where not exists (select 1 from public.featured_slots fs where fs.round_date = candidate.d);
$$;

create or replace function public.settle_topup(p_order_id text, p_callback jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare t record;
begin
  update public.topups set status = 'settled', raw_callback = p_callback, updated_at = now()
    where order_id = p_order_id and status = 'pending'
    returning user_id, amount_idr into t;
  if not found then return false; end if;
  perform public.credit_wallet(t.user_id, t.amount_idr, 'topup', p_order_id);
  insert into public.notifications (user_id, type, payload)
  values (t.user_id, 'topup_credited', jsonb_build_object('order_id', p_order_id, 'amount', t.amount_idr));
  return true;
end; $$;

-- ─── 8. Notification fan-out functions ──────────────────────────────────────
create or replace function public.notify_vendor_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; reviewer_name text; vendor_name text;
begin
  select v.owner_id, v.name into owner, vendor_name from public.vendors v where v.id = new.vendor_id;
  if owner is null or owner = new.user_id then return new; end if;
  select coalesce(p.full_name, p.username, 'Pelanggan') into reviewer_name from public.profiles p where p.id = new.user_id;
  insert into public.notifications (user_id, type, payload)
  values (owner, 'review_received', jsonb_build_object('review_id', new.id, 'vendor_id', new.vendor_id,
    'vendor_name', vendor_name, 'rating', new.rating, 'preview', left(coalesce(new.content, ''), 140), 'reviewer_name', reviewer_name));
  return new;
end; $$;

create or replace function public.notify_thread_author_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare thread_author uuid; thread_title text; replier_name text;
begin
  select t.author_id, t.title into thread_author, thread_title from public.forum_threads t where t.id = new.thread_id;
  if thread_author is null or thread_author = new.author_id then return new; end if;
  select coalesce(p.full_name, p.username, 'Pengguna') into replier_name from public.profiles p where p.id = new.author_id;
  insert into public.notifications (user_id, type, payload)
  values (thread_author, 'forum_reply', jsonb_build_object('thread_id', new.thread_id, 'thread_title', thread_title,
    'reply_id', new.id, 'preview', left(new.content, 140), 'replier_name', replier_name));
  return new;
end; $$;

create or replace function public.notify_vendor_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified = true and (old.is_verified is null or old.is_verified = false) and new.owner_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (new.owner_id, 'vendor_approved', jsonb_build_object('vendor_id', new.id, 'vendor_name', new.name));
  end if;
  return new;
end; $$;

create or replace function public.notify_thread_removed_by_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.author_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (old.author_id, 'content_removed', jsonb_build_object('target_type', 'thread', 'preview', left(old.title, 140)));
  end if;
  return old;
end; $$;

create or replace function public.notify_reply_removed_by_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.author_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (old.author_id, 'content_removed', jsonb_build_object('target_type', 'reply', 'preview', left(old.content, 140)));
  end if;
  return old;
end; $$;

create or replace function public.notify_review_removed_by_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.user_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (old.user_id, 'content_removed', jsonb_build_object('target_type', 'review', 'preview', left(coalesce(old.content, ''), 140)));
  end if;
  return old;
end; $$;

create or replace function public.notify_admins_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.id, 'report_received', jsonb_build_object('report_id', new.id, 'target_type', new.target_type,
    'target_id', new.target_id, 'preview', left(new.reason, 140))
  from public.profiles p where p.role = 'admin';
  return new;
end; $$;

create or replace function public.notify_reporter_on_resolution()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'open' and new.status in ('resolved', 'dismissed') then
    insert into public.notifications (user_id, type, payload)
    values (new.reporter_id, 'report_resolved', jsonb_build_object('report_id', new.id, 'target_type', new.target_type, 'status', new.status));
  end if;
  return new;
end; $$;

-- ─── 9. Triggers (drop-if-exists first; the auth.users trigger survives the
--        table drops above, so guards are required for a clean re-run) ───────
drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
drop trigger if exists touch_vendors_updated_at on public.vendors;
create trigger touch_vendors_updated_at before update on public.vendors for each row execute function public.touch_updated_at();
drop trigger if exists touch_vendor_metrics_updated_at on public.vendor_metrics;
create trigger touch_vendor_metrics_updated_at before update on public.vendor_metrics for each row execute function public.touch_updated_at();
drop trigger if exists touch_forum_threads_updated_at on public.forum_threads;
create trigger touch_forum_threads_updated_at before update on public.forum_threads for each row execute function public.touch_updated_at();
drop trigger if exists touch_forum_replies_updated_at on public.forum_replies;
create trigger touch_forum_replies_updated_at before update on public.forum_replies for each row execute function public.touch_updated_at();
drop trigger if exists touch_wallets_updated_at on public.wallets;
create trigger touch_wallets_updated_at before update on public.wallets for each row execute function public.touch_updated_at();
drop trigger if exists touch_topups_updated_at on public.topups;
create trigger touch_topups_updated_at before update on public.topups for each row execute function public.touch_updated_at();
drop trigger if exists touch_featured_bids_updated_at on public.featured_bids;
create trigger touch_featured_bids_updated_at before update on public.featured_bids for each row execute function public.touch_updated_at();

drop trigger if exists trg_recalculate_vendor_rating on public.vendor_reviews;
create trigger trg_recalculate_vendor_rating after insert or delete on public.vendor_reviews for each row execute function public.recalculate_vendor_rating();
drop trigger if exists trg_notify_vendor_on_review on public.vendor_reviews;
create trigger trg_notify_vendor_on_review after insert on public.vendor_reviews for each row execute function public.notify_vendor_on_review();
drop trigger if exists trg_notify_thread_author_on_reply on public.forum_replies;
create trigger trg_notify_thread_author_on_reply after insert on public.forum_replies for each row execute function public.notify_thread_author_on_reply();
drop trigger if exists trg_notify_vendor_on_approval on public.vendors;
create trigger trg_notify_vendor_on_approval after update of is_verified on public.vendors for each row execute function public.notify_vendor_on_approval();
drop trigger if exists trg_notify_thread_removed_by_admin on public.forum_threads;
create trigger trg_notify_thread_removed_by_admin before delete on public.forum_threads for each row execute function public.notify_thread_removed_by_admin();
drop trigger if exists trg_notify_reply_removed_by_admin on public.forum_replies;
create trigger trg_notify_reply_removed_by_admin before delete on public.forum_replies for each row execute function public.notify_reply_removed_by_admin();
drop trigger if exists trg_notify_review_removed_by_admin on public.vendor_reviews;
create trigger trg_notify_review_removed_by_admin before delete on public.vendor_reviews for each row execute function public.notify_review_removed_by_admin();
drop trigger if exists trg_notify_admins_on_report on public.reports;
create trigger trg_notify_admins_on_report after insert on public.reports for each row execute function public.notify_admins_on_report();
drop trigger if exists trg_notify_reporter_on_resolution on public.reports;
create trigger trg_notify_reporter_on_resolution after update of status on public.reports for each row execute function public.notify_reporter_on_resolution();

-- ─── 10. Indexes ────────────────────────────────────────────────────────────
create index if not exists vendors_category_idx on public.vendors (category);
create index if not exists vendors_city_idx on public.vendors (city);
create index if not exists vendor_items_vendor_sort_idx on public.vendor_items (vendor_id, sort_order, created_at);
create index if not exists vendor_hours_vendor_idx on public.vendor_hours (vendor_id, day_of_week);
create index if not exists vendor_reviews_vendor_idx on public.vendor_reviews (vendor_id, created_at desc);
create index if not exists forum_threads_category_idx on public.forum_threads (category_id);
create index if not exists forum_replies_thread_idx on public.forum_replies (thread_id);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, read_at, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists wallet_tx_user_idx on public.wallet_transactions (user_id, created_at desc);
create index if not exists topups_user_idx on public.topups (user_id, created_at desc);
create index if not exists featured_bids_round_idx on public.featured_bids (round_date, status, amount_idr desc);
create index if not exists featured_slots_active_idx on public.featured_slots (ends_at, rank);
create index if not exists featured_slots_round_idx on public.featured_slots (round_date);

-- ─── 11. Backfill profiles for any pre-existing auth.users ──────────────────
insert into public.profiles (id, username, full_name, phone, role, updated_at)
select u.id,
  nullif(btrim(coalesce(u.raw_user_meta_data->>'username', '')), ''),
  nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
  nullif(btrim(coalesce(u.raw_user_meta_data->>'phone', '')), ''),
  'customer', now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
