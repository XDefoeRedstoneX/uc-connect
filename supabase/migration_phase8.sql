-- ════════════════════════════════════════════════════════════════════════════
-- UC Connect — Phase 8 migration
-- Content moderation + account lifecycle.
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

-- ─── 1. Forum: track when a reply was last edited ───────────────────────────
alter table public.forum_replies add column if not exists updated_at timestamptz not null default now();

drop trigger if exists touch_forum_replies_updated_at on public.forum_replies;
create trigger touch_forum_replies_updated_at
before update on public.forum_replies
for each row execute function public.touch_updated_at();

-- ─── 2. Forum: author edit / delete RLS ─────────────────────────────────────
-- Authors can edit their own posts within a 15-minute window.
-- Authors can delete their own posts at any time.

drop policy if exists "forum_threads_author_update" on public.forum_threads;
create policy "forum_threads_author_update"
  on public.forum_threads for update
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes')
  with check (auth.uid() = author_id);

drop policy if exists "forum_threads_author_delete" on public.forum_threads;
create policy "forum_threads_author_delete"
  on public.forum_threads for delete
  using (auth.uid() = author_id);

drop policy if exists "forum_replies_author_update" on public.forum_replies;
create policy "forum_replies_author_update"
  on public.forum_replies for update
  using (auth.uid() = author_id and now() - created_at < interval '15 minutes')
  with check (auth.uid() = author_id);

drop policy if exists "forum_replies_author_delete" on public.forum_replies;
create policy "forum_replies_author_delete"
  on public.forum_replies for delete
  using (auth.uid() = author_id);

-- ─── 3. Reports: report owner can update their own pending report ───────────
-- (lets a user retract a report by deleting it — already covered by admin_all,
-- but allow self-delete explicitly for symmetry with insert)

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
  on public.reports for delete
  using (auth.uid() = reporter_id and status = 'open');
