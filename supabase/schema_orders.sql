-- Ronac: orders table for manual GCash/BPI checkout with proof-of-payment
-- Run this in Supabase Dashboard -> SQL Editor, after schema.sql
--
-- Buyers are NOT logged in, so this table accepts anonymous inserts.
-- Only the authenticated seller can view or update orders.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  buyer_contact text not null,
  items jsonb not null,               -- snapshot of cart at checkout time
  total numeric(10, 2) not null check (total >= 0),
  payment_method text not null check (payment_method in ('gcash', 'bpi')),
  proof_url text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'fulfilled')),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

-- Anyone (including anonymous buyers) can submit an order.
create policy "Anyone can submit an order"
  on public.orders for insert
  with check (true);

-- Only signed-in sellers (that's you) can view submitted orders.
create policy "Sellers can view orders"
  on public.orders for select
  to authenticated
  using (true);

-- Only signed-in sellers can update order status (e.g. mark verified/fulfilled).
create policy "Sellers can update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- Storage: run this after creating the "payment-proofs" bucket in the
-- Dashboard (Storage -> New bucket -> name it "payment-proofs" -> make
-- it public, same as product-images). This lets anonymous buyers upload
-- their payment screenshot at checkout.
-- ---------------------------------------------------------------------

create policy "Anyone can upload payment proof"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs');
