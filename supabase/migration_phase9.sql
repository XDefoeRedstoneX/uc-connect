-- ════════════════════════════════════════════════════════════════════════════
-- UC Connect — Phase 9 migration
-- In-app notifications: table + fan-out triggers.
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. is_admin() safety guard ─────────────────────────────────────────────
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

-- ─── 1. notifications table ─────────────────────────────────────────────────
create table if not exists public.notifications (
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

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

-- ─── 2. Fan-out triggers ────────────────────────────────────────────────────
-- All trigger functions are SECURITY DEFINER so they can insert into
-- notifications regardless of which user caused the originating action.

-- 2a. New review → notify vendor owner.
create or replace function public.notify_vendor_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  reviewer_name text;
  vendor_name text;
begin
  select v.owner_id, v.name into owner, vendor_name
  from public.vendors v where v.id = new.vendor_id;

  if owner is null or owner = new.user_id then
    return new; -- skip when vendor has no owner or the reviewer is the owner
  end if;

  select coalesce(p.full_name, p.username, 'Pelanggan') into reviewer_name
  from public.profiles p where p.id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (
    owner,
    'review_received',
    jsonb_build_object(
      'review_id', new.id,
      'vendor_id', new.vendor_id,
      'vendor_name', vendor_name,
      'rating', new.rating,
      'preview', left(coalesce(new.content, ''), 140),
      'reviewer_name', reviewer_name
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_vendor_on_review on public.vendor_reviews;
create trigger trg_notify_vendor_on_review
after insert on public.vendor_reviews
for each row execute function public.notify_vendor_on_review();

-- 2b. New forum reply → notify thread author (unless they replied to themselves).
create or replace function public.notify_thread_author_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_author uuid;
  thread_title text;
  replier_name text;
begin
  select t.author_id, t.title into thread_author, thread_title
  from public.forum_threads t where t.id = new.thread_id;

  if thread_author is null or thread_author = new.author_id then
    return new;
  end if;

  select coalesce(p.full_name, p.username, 'Pengguna') into replier_name
  from public.profiles p where p.id = new.author_id;

  insert into public.notifications (user_id, type, payload)
  values (
    thread_author,
    'forum_reply',
    jsonb_build_object(
      'thread_id', new.thread_id,
      'thread_title', thread_title,
      'reply_id', new.id,
      'preview', left(new.content, 140),
      'replier_name', replier_name
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_thread_author_on_reply on public.forum_replies;
create trigger trg_notify_thread_author_on_reply
after insert on public.forum_replies
for each row execute function public.notify_thread_author_on_reply();

-- 2c. Vendor verification flipped on → notify owner.
create or replace function public.notify_vendor_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_verified = true and (old.is_verified is null or old.is_verified = false) and new.owner_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      new.owner_id,
      'vendor_approved',
      jsonb_build_object('vendor_id', new.id, 'vendor_name', new.name)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_vendor_on_approval on public.vendors;
create trigger trg_notify_vendor_on_approval
after update of is_verified on public.vendors
for each row execute function public.notify_vendor_on_approval();

-- 2d. Admin deleted content → notify the content's author.
-- We detect "admin did this" via public.is_admin() inside the trigger.
create or replace function public.notify_thread_removed_by_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() and old.author_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (
      old.author_id,
      'content_removed',
      jsonb_build_object('target_type', 'thread', 'preview', left(old.title, 140))
    );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_notify_thread_removed_by_admin on public.forum_threads;
create trigger trg_notify_thread_removed_by_admin
before delete on public.forum_threads
for each row execute function public.notify_thread_removed_by_admin();

create or replace function public.notify_reply_removed_by_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() and old.author_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (
      old.author_id,
      'content_removed',
      jsonb_build_object('target_type', 'reply', 'preview', left(old.content, 140))
    );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_notify_reply_removed_by_admin on public.forum_replies;
create trigger trg_notify_reply_removed_by_admin
before delete on public.forum_replies
for each row execute function public.notify_reply_removed_by_admin();

create or replace function public.notify_review_removed_by_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() and old.user_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (
      old.user_id,
      'content_removed',
      jsonb_build_object('target_type', 'review', 'preview', left(coalesce(old.content, ''), 140))
    );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_notify_review_removed_by_admin on public.vendor_reviews;
create trigger trg_notify_review_removed_by_admin
before delete on public.vendor_reviews
for each row execute function public.notify_review_removed_by_admin();

-- 2e. New report → fan out to all admins.
create or replace function public.notify_admins_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select
    p.id,
    'report_received',
    jsonb_build_object(
      'report_id', new.id,
      'target_type', new.target_type,
      'target_id', new.target_id,
      'preview', left(new.reason, 140)
    )
  from public.profiles p
  where p.role = 'admin';
  return new;
end;
$$;

drop trigger if exists trg_notify_admins_on_report on public.reports;
create trigger trg_notify_admins_on_report
after insert on public.reports
for each row execute function public.notify_admins_on_report();

-- 2f. Report resolved/dismissed → notify reporter.
create or replace function public.notify_reporter_on_resolution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'open' and new.status in ('resolved', 'dismissed') then
    insert into public.notifications (user_id, type, payload)
    values (
      new.reporter_id,
      'report_resolved',
      jsonb_build_object(
        'report_id', new.id,
        'target_type', new.target_type,
        'status', new.status
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_reporter_on_resolution on public.reports;
create trigger trg_notify_reporter_on_resolution
after update of status on public.reports
for each row execute function public.notify_reporter_on_resolution();
