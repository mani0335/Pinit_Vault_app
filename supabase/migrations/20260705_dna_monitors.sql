-- DNA Monitor tables for PINIT-DNA cloud web crawl monitoring

create table if not exists dna_monitors (
  id            uuid primary key default gen_random_uuid(),
  dna_record_id text not null unique,
  status        text not null default 'active',
  enrolled_at   timestamptz not null default now(),
  last_checked_at timestamptz,
  alerts_count  int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists dna_monitor_alerts (
  id            uuid primary key default gen_random_uuid(),
  dna_record_id text not null,
  monitor_id    uuid references dna_monitors(id) on delete cascade,
  source_url    text,
  similarity    float,
  status        text not null default 'pending',
  detected_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Enable RLS (service role bypasses it, anon cannot read/write)
alter table dna_monitors enable row level security;
alter table dna_monitor_alerts enable row level security;
