-- ════════════════════════════════════════════════════════════════════════════
-- UC Connect — Single source of truth schema
-- Re-running this file drops and recreates everything (destructive).
-- For incremental updates against a live DB, use supabase/migration_phase{N}.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. Cleanup (drop in reverse-dependency order) ──────────────────────────
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
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── 2. profiles + is_admin() (must come before any policy that uses it) ────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  updated_at timestamptz not null default now()
);

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

-- ─── 3. Vendor tables ───────────────────────────────────────────────────────
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
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text,
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
  author_id uuid not null references auth.users(id) on delete cascade,
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
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 5a. Notifications ──────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'review_received',
    'forum_reply',
    'vendor_approved',
    'content_removed',
    'report_received',
    'report_resolved'
  )),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── 5b. Moderation: polymorphic reports ────────────────────────────────────
create table public.reports (
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

-- ─── 6. RPC functions ───────────────────────────────────────────────────────
create or replace function public.increment_whatsapp_clicks(v_id uuid)
returns void
language sql
security definer
as $$
  update public.vendors set whatsapp_clicks = whatsapp_clicks + 1 where id = v_id;
$$;

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

-- ─── 7. Triggers ────────────────────────────────────────────────────────────
drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists touch_vendors_updated_at on public.vendors;
create trigger touch_vendors_updated_at
before update on public.vendors
for each row execute function public.touch_updated_at();

drop trigger if exists touch_vendor_metrics_updated_at on public.vendor_metrics;
create trigger touch_vendor_metrics_updated_at
before update on public.vendor_metrics
for each row execute function public.touch_updated_at();

drop trigger if exists touch_forum_threads_updated_at on public.forum_threads;
create trigger touch_forum_threads_updated_at
before update on public.forum_threads
for each row execute function public.touch_updated_at();

drop trigger if exists touch_forum_replies_updated_at on public.forum_replies;
create trigger touch_forum_replies_updated_at
before update on public.forum_replies
for each row execute function public.touch_updated_at();

drop trigger if exists trg_recalculate_vendor_rating on public.vendor_reviews;
create trigger trg_recalculate_vendor_rating
after insert or delete on public.vendor_reviews
for each row execute function public.recalculate_vendor_rating();

-- ─── 7b. Notification fan-out functions + triggers ──────────────────────────
create or replace function public.notify_vendor_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid; reviewer_name text; vendor_name text;
begin
  select v.owner_id, v.name into owner, vendor_name from public.vendors v where v.id = new.vendor_id;
  if owner is null or owner = new.user_id then return new; end if;
  select coalesce(p.full_name, p.username, 'Pelanggan') into reviewer_name from public.profiles p where p.id = new.user_id;
  insert into public.notifications (user_id, type, payload) values (
    owner, 'review_received',
    jsonb_build_object('review_id', new.id, 'vendor_id', new.vendor_id, 'vendor_name', vendor_name,
      'rating', new.rating, 'preview', left(coalesce(new.content, ''), 140), 'reviewer_name', reviewer_name)
  );
  return new;
end; $$;

create trigger trg_notify_vendor_on_review
after insert on public.vendor_reviews
for each row execute function public.notify_vendor_on_review();

create or replace function public.notify_thread_author_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  thread_author uuid; thread_title text; replier_name text;
begin
  select t.author_id, t.title into thread_author, thread_title from public.forum_threads t where t.id = new.thread_id;
  if thread_author is null or thread_author = new.author_id then return new; end if;
  select coalesce(p.full_name, p.username, 'Pengguna') into replier_name from public.profiles p where p.id = new.author_id;
  insert into public.notifications (user_id, type, payload) values (
    thread_author, 'forum_reply',
    jsonb_build_object('thread_id', new.thread_id, 'thread_title', thread_title,
      'reply_id', new.id, 'preview', left(new.content, 140), 'replier_name', replier_name)
  );
  return new;
end; $$;

create trigger trg_notify_thread_author_on_reply
after insert on public.forum_replies
for each row execute function public.notify_thread_author_on_reply();

create or replace function public.notify_vendor_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified = true and (old.is_verified is null or old.is_verified = false) and new.owner_id is not null then
    insert into public.notifications (user_id, type, payload) values (
      new.owner_id, 'vendor_approved',
      jsonb_build_object('vendor_id', new.id, 'vendor_name', new.name)
    );
  end if;
  return new;
end; $$;

create trigger trg_notify_vendor_on_approval
after update of is_verified on public.vendors
for each row execute function public.notify_vendor_on_approval();

create or replace function public.notify_thread_removed_by_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.author_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload) values (
      old.author_id, 'content_removed',
      jsonb_build_object('target_type', 'thread', 'preview', left(old.title, 140))
    );
  end if;
  return old;
end; $$;

create trigger trg_notify_thread_removed_by_admin
before delete on public.forum_threads
for each row execute function public.notify_thread_removed_by_admin();

create or replace function public.notify_reply_removed_by_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.author_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload) values (
      old.author_id, 'content_removed',
      jsonb_build_object('target_type', 'reply', 'preview', left(old.content, 140))
    );
  end if;
  return old;
end; $$;

create trigger trg_notify_reply_removed_by_admin
before delete on public.forum_replies
for each row execute function public.notify_reply_removed_by_admin();

create or replace function public.notify_review_removed_by_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.user_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload) values (
      old.user_id, 'content_removed',
      jsonb_build_object('target_type', 'review', 'preview', left(coalesce(old.content, ''), 140))
    );
  end if;
  return old;
end; $$;

create trigger trg_notify_review_removed_by_admin
before delete on public.vendor_reviews
for each row execute function public.notify_review_removed_by_admin();

create or replace function public.notify_admins_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.id, 'report_received',
    jsonb_build_object('report_id', new.id, 'target_type', new.target_type,
      'target_id', new.target_id, 'preview', left(new.reason, 140))
  from public.profiles p where p.role = 'admin';
  return new;
end; $$;

create trigger trg_notify_admins_on_report
after insert on public.reports
for each row execute function public.notify_admins_on_report();

create or replace function public.notify_reporter_on_resolution()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'open' and new.status in ('resolved', 'dismissed') then
    insert into public.notifications (user_id, type, payload) values (
      new.reporter_id, 'report_resolved',
      jsonb_build_object('report_id', new.id, 'target_type', new.target_type, 'status', new.status)
    );
  end if;
  return new;
end; $$;

create trigger trg_notify_reporter_on_resolution
after update of status on public.reports
for each row execute function public.notify_reporter_on_resolution();

-- ─── 8. Enable RLS ──────────────────────────────────────────────────────────
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

-- ─── 9. Policies: profiles ──────────────────────────────────────────────────
create policy "profiles_read_own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_admin_read_all"
  on public.profiles for select using (public.is_admin());

create policy "profiles_admin_update_all"
  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ─── 10. Policies: vendors ──────────────────────────────────────────────────
create policy "vendors_public_read"
  on public.vendors for select using (true);

create policy "vendors_update_own"
  on public.vendors for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "vendors_admin_update_all"
  on public.vendors for update
  using (public.is_admin()) with check (public.is_admin());

create policy "vendors_admin_delete_all"
  on public.vendors for delete using (public.is_admin());

-- ─── 11. Policies: vendor_metrics ───────────────────────────────────────────
create policy "vendor_metrics_public_read"
  on public.vendor_metrics for select using (true);

-- ─── 12. Policies: vendor_hours ─────────────────────────────────────────────
create policy "vendor_hours_public_read"
  on public.vendor_hours for select using (true);

create policy "vendor_hours_owner_all"
  on public.vendor_hours for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- ─── 13. Policies: vendor_items ─────────────────────────────────────────────
create policy "vendor_items_public_read"
  on public.vendor_items for select using (is_active = true);

create policy "vendor_items_owner_all"
  on public.vendor_items for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- ─── 14. Policies: vendor_reviews ───────────────────────────────────────────
create policy "vendor_reviews_public_read"
  on public.vendor_reviews for select using (true);

create policy "vendor_reviews_user_insert"
  on public.vendor_reviews for insert
  with check (auth.uid() = user_id);

create policy "vendor_reviews_user_delete"
  on public.vendor_reviews for delete using (auth.uid() = user_id);

create policy "vendor_reviews_admin_delete"
  on public.vendor_reviews for delete using (public.is_admin());

-- Vendor owner can update reply fields (column-level enforcement happens in API).
create policy "vendor_reviews_owner_reply"
  on public.vendor_reviews for update
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- ─── 15. Policies: favorites ────────────────────────────────────────────────
create policy "favorites_read_own"
  on public.favorites for select using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete using (auth.uid() = user_id);

-- ─── 16. Policies: forum ────────────────────────────────────────────────────
create policy "forum_categories_public_read"
  on public.forum_categories for select using (true);

create policy "forum_threads_public_read"
  on public.forum_threads for select using (true);

create policy "forum_threads_insert_auth"
  on public.forum_threads for insert with check (auth.uid() = author_id);

create policy "forum_threads_author_update"
  on public.forum_threads for update
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes')
  with check (auth.uid() = author_id);

create policy "forum_threads_author_delete"
  on public.forum_threads for delete using (auth.uid() = author_id);

create policy "forum_threads_admin_delete"
  on public.forum_threads for delete using (public.is_admin());

create policy "forum_replies_public_read"
  on public.forum_replies for select using (true);

create policy "forum_replies_insert_auth"
  on public.forum_replies for insert with check (auth.uid() = author_id);

create policy "forum_replies_author_update"
  on public.forum_replies for update
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes')
  with check (auth.uid() = author_id);

create policy "forum_replies_author_delete"
  on public.forum_replies for delete using (auth.uid() = author_id);

create policy "forum_replies_admin_delete"
  on public.forum_replies for delete using (public.is_admin());

-- ─── 16b. Policies: notifications ───────────────────────────────────────────
create policy "notifications_read_own"
  on public.notifications for select using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);

-- ─── 17. Policies: reports ──────────────────────────────────────────────────
create policy "reports_insert_auth"
  on public.reports for insert with check (auth.uid() = reporter_id);

create policy "reports_read_own"
  on public.reports for select using (auth.uid() = reporter_id);

create policy "reports_delete_own"
  on public.reports for delete
  using (auth.uid() = reporter_id and status = 'open');

create policy "reports_admin_all"
  on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- ─── 18. Indexes ────────────────────────────────────────────────────────────
create index if not exists vendors_category_idx on public.vendors (category);
create index if not exists vendors_city_idx on public.vendors (city);
create index if not exists vendor_items_vendor_sort_idx on public.vendor_items (vendor_id, sort_order, created_at);
create index if not exists vendor_hours_vendor_idx on public.vendor_hours (vendor_id, day_of_week);
create index if not exists vendor_reviews_vendor_idx on public.vendor_reviews (vendor_id, created_at desc);
create index if not exists forum_threads_category_idx on public.forum_threads (category_id);
create index if not exists forum_replies_thread_idx on public.forum_replies (thread_id);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, read_at, created_at desc);

-- ─── 19. Backfill profiles for any pre-existing auth.users ──────────────────
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
