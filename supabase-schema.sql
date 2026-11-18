-- Run this in the Supabase SQL editor

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

create policy "Allow inserts" on leads
  for insert with check (true);

create policy "Allow reads for authenticated" on leads
  for select using (true);
