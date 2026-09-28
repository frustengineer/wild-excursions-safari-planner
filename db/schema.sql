-- Tadoba Safari Planner — core schema (Postgres / Supabase).
-- Matches the data model in the architecture spec. Four tables:
-- zone + ranking are hand-edited (Hardik owns them), availability_snapshot
-- is written only by the scraper, enquiry is the output of the funnel.

create table if not exists jungle (
  slug           text primary key,
  name           text not null,
  tagline        text not null,
  description    text not null,
  ranges         text[] not null default '{}',
  animals        text[] not null default '{}',
  best_season    text not null,
  state          text not null check (state in ('Maharashtra', 'Madhya Pradesh')),
  image_url      text not null,
  coming_soon    boolean not null default false,
  display_order  int not null default 0,
  updated_at     timestamptz not null default now()
);

create table if not exists zone (
  zone_id     text primary key,
  park        text not null,
  range       text not null,
  zone_name   text not null,
  type        text not null check (type in ('core', 'buffer')),
  gate        text not null,
  portal_key  text not null -- exact gate name as the govt portal lists it
);

create table if not exists ranking (
  id              bigint generated always as identity primary key,
  zone_id         text not null references zone(zone_id),
  cycle_name      text not null,           -- e.g. "Dry 2026"
  valid_from      date not null,
  valid_to        date not null,
  priority_rank   int not null,            -- 1 = best in its range
  sighting_score  int not null check (sighting_score between 0 and 100)
);
create index if not exists ranking_zone_validity on ranking (zone_id, valid_from, valid_to);

create table if not exists availability_snapshot (
  id               bigint generated always as identity primary key,
  zone_id          text not null references zone(zone_id),
  safari_date      date not null,
  session          text not null check (session in ('morning', 'afternoon', 'mid-day')),
  status           text not null check (
    status in ('available', 'waitlist', 'full', 'gate-closed', 'window-closed', 'NA')
  ),
  available_count  int,          -- open gypsies, when status = 'available'
  vehicle_type     text,         -- 'gypsy' for buffer; 'bus'/'canter' possible in core
  checked_at       timestamptz not null default now()
);
create index if not exists availability_lookup on availability_snapshot (zone_id, safari_date, session, checked_at desc);

create table if not exists enquiry (
  id                  bigint generated always as identity primary key,
  customer_name       text not null,
  phone               text not null,
  email               text,
  range               text not null,
  start_date          date not null,
  end_date            date not null,
  num_safaris         int not null,
  recommended_plan    jsonb not null,   -- the zones + slots the tool suggested, stored as-is
  availability_as_of  timestamptz not null,
  source              text not null default 'safari-tool',
  created_at          timestamptz not null default now()
  -- Deliberately no Aadhaar/ID column here. ID goes to a separate,
  -- access-controlled table/store (see README) and only a masked last-4
  -- reference should ever be joined into anything the wider team can see.
);
