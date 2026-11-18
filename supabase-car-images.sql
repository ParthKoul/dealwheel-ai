-- Run in the Supabase SQL editor.
-- Only the server, using the service role key, should read or write this table.

create table if not exists car_images (
  cache_key text primary key,
  make text,
  model text,
  year text,
  image_url text not null,
  created_at timestamptz default now()
);

alter table car_images enable row level security;

drop policy if exists "Allow all" on car_images;
