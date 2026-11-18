-- Run this in the Supabase SQL editor.
-- The API uses the service role key, which bypasses these rules.
-- Do not add a public read policy. That would expose every lead.

create table if not exists leads (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text,
  zip text,
  timeline text,
  financing text,
  message text,
  considering text,
  selected_vehicle text,
  selected_price numeric,
  shortlist jsonb,
  submitted_at timestamptz default now()
);

alter table leads enable row level security;

drop policy if exists "Allow inserts" on leads;
drop policy if exists "Allow reads for authenticated" on leads;
