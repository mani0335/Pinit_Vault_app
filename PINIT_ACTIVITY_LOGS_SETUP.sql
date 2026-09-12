-- ============================================================================
-- PINIT Vault — Live Asset Tracking table
-- Run this in your Supabase project → SQL Editor → New query → Run.
-- It creates the activity_logs table, indexes, RLS policies, and enables
-- Realtime so the owner can watch shared-asset activity LIVE across devices.
-- ============================================================================

create table if not exists public.activity_logs (
  id              uuid primary key default gen_random_uuid(),
  event_id        text unique not null,
  user_id         text not null,
  share_id        text,
  event_type      text not null,
  file_name       text,
  file_type       text,
  ip_address      text,
  geo_country     text,
  geo_city        text,
  device_type     text,
  device_info     text,
  risk_score      integer default 0,
  status          text default 'success',
  security_events jsonb  default '[]'::jsonb,
  recipient_email text,
  recipient_name  text,
  metadata        jsonb  default '{}'::jsonb,
  created_at      timestamptz default now()
);

create index if not exists idx_activity_logs_user  on public.activity_logs (user_id, created_at desc);
create index if not exists idx_activity_logs_share on public.activity_logs (share_id, created_at desc);

-- Row Level Security ---------------------------------------------------------
alter table public.activity_logs enable row level security;

-- Recipients of a share link are anonymous, so they must be able to INSERT
-- their own view/mouse/screenshot events. Reads are open so the owner app
-- (which uses the anon key) can load + subscribe. Tighten later if you add
-- Supabase Auth and want per-user isolation.
drop policy if exists "activity_insert_any" on public.activity_logs;
create policy "activity_insert_any"
  on public.activity_logs for insert
  to anon, authenticated
  with check (true);

drop policy if exists "activity_select_any" on public.activity_logs;
create policy "activity_select_any"
  on public.activity_logs for select
  to anon, authenticated
  using (true);

-- Enable Realtime so INSERTs stream to the owner dashboard live ---------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.activity_logs;
  exception
    when duplicate_object then null; -- already added
  end;
end $$;

-- (Optional) auto-delete events older than 180 days to keep the table small.
-- Requires pg_cron; uncomment if you have it enabled.
-- select cron.schedule('purge_activity_logs', '0 3 * * *',
--   $$delete from public.activity_logs where created_at < now() - interval '180 days'$$);
