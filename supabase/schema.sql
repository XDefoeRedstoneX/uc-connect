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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
end;
$$;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique,
  name text not null,
  tagline text,
  category text,
  city text,
  description text,
  whatsapp text,
  website_url text,
  hero_image_url text,
  is_verified boolean not null default false,
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
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists touch_vendors_updated_at on public.vendors;
create trigger touch_vendors_updated_at
before update on public.vendors
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_vendor_metrics_updated_at on public.vendor_metrics;
create trigger touch_vendor_metrics_updated_at
before update on public.vendor_metrics
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_forum_threads_updated_at on public.forum_threads;
create trigger touch_forum_threads_updated_at
before update on public.forum_threads
for each row
execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_metrics enable row level security;
alter table public.vendor_hours enable row level security;
alter table public.vendor_items enable row level security;
alter table public.favorites enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "vendors_public_read" on public.vendors;
create policy "vendors_public_read"
  on public.vendors for select
  using (true);

drop policy if exists "vendor_metrics_public_read" on public.vendor_metrics;
create policy "vendor_metrics_public_read"
  on public.vendor_metrics for select
  using (true);

drop policy if exists "vendor_hours_public_read" on public.vendor_hours;
create policy "vendor_hours_public_read"
  on public.vendor_hours for select
  using (true);

drop policy if exists "vendor_items_public_read" on public.vendor_items;
create policy "vendor_items_public_read"
  on public.vendor_items for select
  using (is_active = true);

drop policy if exists "favorites_read_own" on public.favorites;
create policy "favorites_read_own"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

drop policy if exists "forum_categories_public_read" on public.forum_categories;
create policy "forum_categories_public_read"
  on public.forum_categories for select
  using (true);

drop policy if exists "forum_threads_public_read" on public.forum_threads;
create policy "forum_threads_public_read"
  on public.forum_threads for select
  using (true);

drop policy if exists "forum_threads_insert_auth" on public.forum_threads;
create policy "forum_threads_insert_auth"
  on public.forum_threads for insert
  with check (auth.uid() = author_id);

drop policy if exists "forum_replies_public_read" on public.forum_replies;
create policy "forum_replies_public_read"
  on public.forum_replies for select
  using (true);

drop policy if exists "forum_replies_insert_auth" on public.forum_replies;
create policy "forum_replies_insert_auth"
  on public.forum_replies for insert
  with check (auth.uid() = author_id);

create index if not exists vendors_category_idx on public.vendors (category);
create index if not exists vendors_city_idx on public.vendors (city);
create index if not exists vendor_items_vendor_sort_idx on public.vendor_items (vendor_id, sort_order, created_at);
create index if not exists vendor_hours_vendor_idx on public.vendor_hours (vendor_id, day_of_week);
create index if not exists forum_threads_category_idx on public.forum_threads(category_id);
create index if not exists forum_replies_thread_idx on public.forum_replies(thread_id);

insert into public.profiles (id, username, full_name, phone, role, updated_at)
select
  u.id,
  nullif(btrim(coalesce(u.raw_user_meta_data->>'username', '')), ''),
  nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
  nullif(btrim(coalesce(u.raw_user_meta_data->>'phone', '')), ''),
  'customer',
  now() 
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ─── Migration additions ────────────────────────────────────────────────────
-- Run these in Supabase SQL editor if you already applied the base schema above

-- 1. WhatsApp click counter on vendors
alter table public.vendors add column if not exists whatsapp_clicks integer not null default 0;

-- 2. RPC to atomically increment the counter
create or replace function public.increment_whatsapp_clicks(v_id uuid)
returns void
language sql
security definer
as $$
  update public.vendors set whatsapp_clicks = whatsapp_clicks + 1 where id = v_id;
$$;

-- 3. Vendor owner write policies (missing from original schema)
drop policy if exists "vendors_update_own" on public.vendors;
create policy "vendors_update_own"
  on public.vendors for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- 4. Vendor hours — owner can manage all rows for their vendor
drop policy if exists "vendor_hours_owner_all" on public.vendor_hours;
create policy "vendor_hours_owner_all"
  on public.vendor_hours for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- 5. Vendor items — owner can manage all rows (including inactive ones)
drop policy if exists "vendor_items_owner_all" on public.vendor_items;
create policy "vendor_items_owner_all"
  on public.vendor_items for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

