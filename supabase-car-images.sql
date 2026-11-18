-- Run in Supabase SQL editor

create table if not exists car_images (
  cache_key text primary key,
  make text,
  model text,
  year text,
  image_url text not null,
  created_at timestamptz default now()
);

alter table car_images enable row level security;
create policy "Allow all" on car_images for all using (true) with check (true);
