-- Ronac: D1 schema (see docs/LONGGANISA_ORDER_WORKFLOW.md §5)
-- Apply with: npx wrangler d1 migrations apply ronac --remote

create table listings (
  id           text primary key,          -- uuid generated in the Worker
  product_name text not null,             -- one posting per variant
  description  text,
  price        integer not null check (price >= 0),   -- centavos
  stock        integer not null default 0 check (stock >= 0),
  image_key    text,                      -- R2 key in ronac-product-images
  is_active    integer not null default 1,
  created_at   text not null default (datetime('now'))
);
-- "Sold out" = stock = 0; no separate status column needed.

create table service_areas (
  id              integer primary key,
  name            text not null,
  allows_pickup   integer not null,
  allows_delivery integer not null,
  delivery_fee    integer not null default 0,   -- centavos
  min_order       integer not null default 0,   -- centavos
  is_active       integer not null default 1
);
insert into service_areas (name, allows_pickup, allows_delivery) values
  ('La Salle Green Hills', 1, 0),
  ('Neovista Homes',       0, 1),
  ('Tierra Nova Royale',   0, 1);

create table time_slots (
  id          integer primary key,
  fulfillment text not null check (fulfillment in ('pickup','delivery')),
  time_label  text not null,             -- "12:00–1:00 PM"
  is_active   integer not null default 1
);

create table orders (
  seq           integer primary key autoincrement,   -- → order_no RNC-0001
  id            text not null unique,
  access_token  text not null,          -- buyer tracking link
  buyer_name    text not null,
  buyer_contact text not null,
  buyer_fb      text,
  notes         text,
  fulfillment   text not null check (fulfillment in ('pickup','delivery')),
  area_id       integer not null references service_areas(id),
  address       text,
  landmark      text,
  slot_date     text not null,          -- YYYY-MM-DD, Asia/Manila
  slot_id       integer not null references time_slots(id),
  subtotal      integer not null,
  delivery_fee  integer not null,
  total         integer not null,
  payment_method text not null check (payment_method in ('gcash','bpi')),
  payment_ref   text not null,          -- required: unpaid orders can't exist
  proof_key     text not null,          -- R2 key in ronac-payment-proofs
  status        text not null default 'submitted' check (status in
                ('submitted','paid','rejected','preparing','ready_for_pickup',
                 'out_for_delivery','completed','cancelled')),
  reject_reason text,
  refunded      integer not null default 0,
  created_at    text not null default (datetime('now')),
  status_updated_at text not null default (datetime('now'))
);

create table order_items (
  order_id     text not null references orders(id),
  listing_id   text not null references listings(id),
  product_name text not null,           -- snapshot
  price        integer not null,        -- snapshot, centavos
  quantity     integer not null check (quantity > 0)
);
