-- Ronac: listings table + Row Level Security
-- Run this in Supabase Dashboard -> SQL Editor (or via `supabase db push`)

create extension if not exists "pgcrypto";

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  seller_name text not null,
  seller_contact text,
  seller_email text,
  product_name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  status text not null default 'available' check (status in ('available', 'pending', 'sold')),
  stripe_payment_link text,
  created_at timestamptz not null default now()
);

create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_created_at_idx on public.listings (created_at desc);

alter table public.listings enable row level security;

-- Anyone (including anonymous buyers) can view listings.
create policy "Public can view listings"
  on public.listings for select
  using (true);

-- Only authenticated sellers can create a listing, and only under their own seller_id.
create policy "Sellers can insert their own listings"
  on public.listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

-- Sellers can update only their own listings (e.g. change status).
create policy "Sellers can update their own listings"
  on public.listings for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- Sellers can delete only their own listings.
create policy "Sellers can delete their own listings"
  on public.listings for delete
  to authenticated
  using (auth.uid() = seller_id);

-- ---------------------------------------------------------------------
-- Storage: run this after creating the "product-images" bucket in the
-- Dashboard (Storage -> New bucket -> public). These policies let any
-- signed-in seller upload into their own folder (named by their user id)
-- and let anyone read (since the bucket is public, reads bypass RLS too,
-- but the policy is included for completeness / private-bucket setups).
-- ---------------------------------------------------------------------

create policy "Public can read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Sellers can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sellers can update their own images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sellers can delete their own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
