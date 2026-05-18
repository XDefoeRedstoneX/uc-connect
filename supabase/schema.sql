create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer','vendor','admin')),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text,
  city text,
  description text,
  whatsapp text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vendor_id)
);

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_items enable row level security;
alter table public.favorites enable row level security;

create policy if not exists "profiles_read_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy if not exists "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy if not exists "vendors_public_read"
  on public.vendors for select
  using (true);

create policy if not exists "vendor_items_public_read"
  on public.vendor_items for select
  using (is_active = true);

create policy if not exists "favorites_read_own"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy if not exists "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy if not exists "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);
