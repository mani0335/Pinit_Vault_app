-- ============================================================================
-- PINIT Vault — Share Trace Graph (forwarding tree)
-- Run in Supabase → SQL Editor → New query → Run.
-- Records every "hop" a share link makes (A → B → C) so the owner can see the
-- full forwarding tree with location, device, and timestamp per visitor.
-- ============================================================================

create table if not exists public.share_hops (
  id                uuid primary key default gen_random_uuid(),
  share_id          text not null,
  visitor_id        text not null,         -- unique per viewer (stored in their browser)
  parent_visitor_id text,                  -- who forwarded the link to them (null = first recipient)
  owner_id          text,                  -- asset owner (for querying their tree)
  file_name         text,
  device_type       text,
  ip_address        text,
  geo_city          text,
  geo_country       text,
  gps_lat           double precision,      -- precise GPS (only if visitor allows)
  gps_lng           double precision,
  risk_score        integer default 0,
  created_at        timestamptz default now(),
  unique (share_id, visitor_id)            -- one record per visitor per share
);

create index if not exists idx_share_hops_share on public.share_hops (share_id, created_at);
create index if not exists idx_share_hops_owner on public.share_hops (owner_id, created_at desc);

-- Row Level Security: recipients are anonymous, so allow insert/update + read.
alter table public.share_hops enable row level security;

drop policy if exists "hops_insert_any" on public.share_hops;
create policy "hops_insert_any" on public.share_hops
  for insert to anon, authenticated with check (true);

drop policy if exists "hops_update_any" on public.share_hops;
create policy "hops_update_any" on public.share_hops
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "hops_select_any" on public.share_hops;
create policy "hops_select_any" on public.share_hops
  for select to anon, authenticated using (true);

-- Enable Realtime so the owner's trace graph updates live as the link spreads.
do $$
begin
  begin
    alter publication supabase_realtime add table public.share_hops;
  exception when duplicate_object then null;
  end;
end $$;
