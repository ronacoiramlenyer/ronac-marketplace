# Proposal: Online Ordering Workflow for Longganisa

Status: **Draft for review** · Scope: buyer checkout, seller fulfillment and
platform (all Cloudflare) for
frozen longganisa on Ronac.

This proposal revises the workflow already in the repo. It keeps what works
(no buyer accounts, manual GCash/BPI payment with proof upload, one seller)
and fills the gaps that matter when the product is a frozen, perishable,
made-in-batches item like longganisa.

### Decisions from the owner

| Topic | Decision |
|-------|----------|
| Variants | **One posting per variant** (e.g. "Garlic Longganisa · 500 g" is its own listing). No variant picker. |
| Pickup | **La Salle Green Hills (LSGH)** — the seller's workplace. |
| Delivery | **Neovista Homes and Tierra Nova Royale** only — near the seller's home. |
| Next-day cut-off | **6:00 PM.** Orders placed after 6 PM are scheduled for the day after tomorrow at the earliest. |
| Unpaid orders | **Unpaid orders don't go through.** An order only exists once payment proof is attached; there is no "reserve now, pay later". |
| New-order alerts | Any channel — **email via Resend, sent from the Cloudflare Worker** is proposed (free tier). |
| Platform | **All Cloudflare**: Workers (site + API), D1 (database), R2 (photos, payment proofs), Access (seller login). Supabase and Vercel are retired. See §4. |
| Domain | **Not bought yet** — buy on Cloudflare Registrar. Netlify is not used. |
| Minimum order / delivery fee | *Still open* — see §9. |

---

## 1. What the repo does today

```
Catalog → + Add → Cart (qty stepper) → name + phone → pick GCash/BPI
→ scan QR, pay → upload screenshot → Submit → "Order submitted 🎉"
Seller: Orders page → Pending / Verified / Fulfilled dropdown
```

Gaps for longganisa specifically:

| # | Gap | Where | Why it matters |
|---|-----|-------|----------------|
| 1 | ~~No variants~~ | — | Resolved by decision: one posting per variant, so the current one-price-per-listing model is fine. |
| 2 | No stock count | `listings.status` is only available/pending/sold; the cart stepper has no cap | Batches are finite. Buyers can order 20 packs when 8 exist. |
| 3 | No pickup/delivery details | `orders` has only name + contact | Frozen goods need a delivery area, address, and a time slot so they don't thaw waiting. |
| 4 | No order reference for the buyer | Confirmation page shows nothing to quote | Buyer can't follow up ("Hi, re: order RNC-0142…"). |
| 5 | Buyer can't check status | No buyer-facing page | Every "na-verify na po ba?" becomes a manual message. |
| 6 | No rejected/cancelled path | statuses: pending → verified → fulfilled only | Wrong amount, blurry screenshot, or out-of-stock has nowhere to go. |
| 7 | Total is computed in the browser | `Cart.jsx` sends `total` and `items[].price` from localStorage | A buyer can edit localStorage and submit a ₱1 order; the seller only catches it by eye. |
| 8 | Payment screenshots are public | `payment-proofs` bucket is public | Screenshots show the buyer's name, number and reference no. Anyone with the URL can view them. |
| 9 | Any signed-in user can read all orders | `orders` RLS: `to authenticated using (true)` | Fine only if Supabase sign-ups are disabled. Should be pinned to the seller. |
| 10 | Seller isn't alerted to new orders | `notify-seller` only fires on listings | Orders sit unseen until the seller opens the dashboard. |
| 11 | README still describes Stripe | `README.md` §3 | Confusing; actual checkout is GCash/BPI. |

---

## 2. Proposed buyer workflow

```
1. Browse      Catalog shows each posting (one per variant) with price and
               "X packs left". Sold-out postings show "Sold out".
2. Add to cart Qty stepper capped at packs left.
3. Fulfillment Choose PICKUP or DELIVERY.
                 • Pickup: at LSGH. No address needed.
                 • Delivery: subdivision (required, dropdown): Neovista
                   Homes / Tierra Nova Royale — nothing else is accepted.
                   Then street/house no. + landmark.
                 • Date: earliest is tomorrow if before 6:00 PM, otherwise
                   the day after. Time slot from the seller's open slots.
               Minimum order / delivery fee applied if set (§9).
4. Details     Name, mobile number (09xx format validated), optional
               Messenger/FB name, notes ("gate code", "leave with guard").
5. Review      Server re-prices the cart and returns the official total
               (items + delivery fee). Buyer sees exactly what to pay.
               Nothing is saved yet.
6. Pay         GCash or BPI QR + account details, amount shown large with
               a copy button. Reminder: "Pay the exact amount."
7. Proof       Upload screenshot (required) + GCash/BPI reference no.
               (required). The Submit button stays disabled until both are
               present — this is the only way an order gets created.
8. Confirmed   Shows order number (RNC-0142), summary, area, date/slot, and a
               tracking link /order/<id>?t=<token>. "Save this link."
9. Track       Buyer opens the link anytime to see the current status.
```

### "Unpaid orders don't go through"

- There is **no order record and no stock hold** until the buyer submits
  with a proof screenshot and reference number. Leaving the page at the
  QR step leaves nothing behind — so no expiry job is needed.
- On submit, the server re-checks stock and price, then creates the order
  and subtracts the packs in one step.
- Edge case: if the last packs sold out while the buyer was paying, the
  submit is refused with "Sorry, only N left" and the buyer can reduce the
  quantity (seller refunds the difference) or message the seller for a
  refund. The seller sees these as **refund needed** — see §3.
- If the seller **rejects** a proof (wrong amount, not received), the order
  is marked rejected and the packs go back to stock.

---

## 3. Proposed seller workflow

Order statuses (replaces pending / verified / fulfilled):

```
                ┌──────────── rejected (bad/missing payment) → stock released
                │
  submitted ────┼──► paid ──► preparing ──► ready_for_pickup ─┐
  (awaiting     │   (payment                 or               ├──► completed
   check)       │    verified)               out_for_delivery ┘
                │
                └──────────── cancelled (buyer/seller) → stock released
```

Seller actions on the Orders page:

| Status | Seller sees | Primary action |
|--------|-------------|----------------|
| submitted | Proof image inline, ref no., expected amount vs. what's in the screenshot | **Verify payment** / **Reject** (with reason: wrong amount, unreadable, not received) |
| paid | Slot date/time, items | **Start preparing** |
| preparing | Packing checklist (items × qty, "frozen, insulated bag + ice pack") | **Ready for pickup** or **Out for delivery** (enter rider/Lalamove link, optional) |
| ready / out | Buyer contact with tap-to-call / copy | **Mark completed** |

Plus:

- **Refund needed**: a buyer who paid but couldn't submit (stock ran out
  mid-checkout) can message the seller with their ref no.; the seller
  refunds manually. Rejected orders with a real payment also get a
  "Refunded" checkbox so nothing is forgotten.
- **Daily prep view**: after the 6:00 PM cut-off, tomorrow's paid orders
  split into **LSGH pickups** (bring to work) and **home deliveries**
  (Neovista Homes, Tierra Nova Royale), each with a total pack count per
  posting ("Garlic 500 g × 14, Hamonado 1 kg × 6") so the seller knows what
  to pack for each.
- **New-order alert**: email to the seller via Resend from the Worker
  when an order is submitted, with order no., total, area and a link
  to the Orders page. SMS/Messenger can be added later.
- **Stock edit**: set packs left on each posting when a new batch is made.


---

## 4. Platform: all Cloudflare

Decision: move **everything** off Supabase and Vercel onto Cloudflare,
including seller login and the domain. Netlify is not used.

### What moves where

| Today | On Cloudflare | Notes |
|-------|---------------|-------|
| Vercel (static site) | **Workers static assets** — one Worker serves the React app *and* the `/api/*` routes | Cloudflare now recommends Workers over Pages for new projects. One deploy, one URL. |
| Supabase Postgres + RLS | **D1** (SQLite) | No RLS in D1 — every read/write goes through the Worker API, which enforces the rules. This is the same move step 1 already needed (server-side pricing and stock). |
| Supabase Storage `product-images` (public) | **R2** bucket `ronac-product-images`, served by the Worker at `/img/<key>` with long cache headers | |
| Supabase Storage `payment-proofs` (public) | **R2** bucket `ronac-payment-proofs`, **private** | Buyer uploads through the Worker; only the seller can view, through an Access-protected route. Closes gap 8. |
| Supabase Auth (email + password) | **Cloudflare Access** (Zero Trust), one-time PIN sent to the seller's email | No passwords, no sign-up page, no login code to maintain. Free up to 50 users. Buyers still never log in. Closes gap 9. |
| Supabase Edge Function + DB webhook (`notify-seller`) | Email sent from the Worker right after an order is saved (`ctx.waitUntil`), still via **Resend** | No webhook to configure. |
| Vercel `api/create-checkout-session.js` (Stripe) | Removed | Unused. |
| Domain (none yet) | **Cloudflare Registrar** + Cloudflare DNS | Access login on a custom domain requires the domain's DNS to be on Cloudflare. |

### Domain

- Buy a `.com` (or another supported TLD) on **Cloudflare Registrar** —
  sold at cost, no markup, DNS is set up automatically.
- Cloudflare Registrar does **not** sell `.ph` / `.com.ph`. If a `.ph`
  name is wanted, buy it from a `.ph` registrar and point its nameservers
  to Cloudflare — everything below still works.
- Until the domain is bought, the app runs on the free
  `ronac.<account>.workers.dev` address for testing.

### Seller login with Cloudflare Access

- Access application on `<domain>/listings*`, `<domain>/orders*` and
  `<domain>/api/admin/*`.
- Policy: allow only the seller's email address (One-time PIN login).
- The Worker also verifies the `Cf-Access-Jwt-Assertion` header on every
  `/api/admin/*` request, so the API is safe even if a route is ever left
  out of the Access app by mistake.
- `AuthContext`, `SellerAuth` and `ProtectedRoute` are deleted; the "Seller
  login" link just goes to `/listings` and Access shows the PIN screen.

### Cost (free tiers, as of this writing)

| Service | Free allowance | Ronac's likely use |
|---------|----------------|--------------------|
| Workers | 100,000 requests/day | A few hundred |
| D1 | 5 GB storage | A few MB |
| R2 | 10 GB storage, **no egress fees** | Photos + screenshots, well under 1 GB for a long time |
| Access | 50 users | 1 |
| Resend | 3,000 emails/month | One per order |
| Registrar | at cost (≈ US$10/yr for `.com`) | The only real cost |

No more Supabase free-tier pausing after a week without activity.

---

## 5. Data model (D1)

`migrations/0001_init.sql`, applied with `wrangler d1 migrations apply`.

```sql
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
```

Money is stored in **centavos** (integers) to avoid rounding errors.

---

## 6. Worker API

```
Public (buyers)
  GET  /api/listings                 active postings with price + stock
  GET  /api/areas                    service areas + slots
  POST /api/quote                    { lines, area_id, fulfillment } → server total. Saves nothing.
  POST /api/proofs                   upload screenshot → { proof_key }. Image only, ≤ 5 MB.
  POST /api/orders                   place the order (below)
  GET  /api/orders/:id?t=token       buyer tracking
  GET  /img/:key                     product photo from R2

Seller (behind Cloudflare Access + JWT check)
  GET    /api/admin/orders?status=…
  PATCH  /api/admin/orders/:id       { status, reject_reason?, refunded? }
  GET    /api/admin/proofs/:key      stream screenshot from private R2
  GET    /api/admin/prep?date=…      pack totals for LSGH pickups / deliveries
  POST   /api/admin/listings         create (multipart, photo → R2)
  PATCH  /api/admin/listings/:id     edit price / stock / active
  DELETE /api/admin/listings/:id
  PUT    /api/admin/areas/:id, /api/admin/slots/:id   fees, min order, slots
```

### `POST /api/orders` (fixes gaps 2, 6, 7)

1. Accepts only `listing_id` + `quantity` per line, buyer and fulfillment
   fields, `payment_method`, `payment_ref`, `proof_key` — **never prices
   or totals**. Refuses if the ref no. is missing or `proof_key` doesn't
   exist in R2 → *unpaid orders don't go through*.
2. Validates the area allows the chosen fulfillment (LSGH = pickup only;
   Neovista / Tierra Nova Royale = delivery only) and the slot date
   respects the **6:00 PM Asia/Manila cut-off**.
3. Loads current prices + area fee, computes subtotal, fee and total;
   enforces the area's minimum order.
4. Runs one **D1 batch** (a single transaction): `update listings set
   stock = stock - ?` for each line, insert `orders`, insert
   `order_items`. If any line would take stock below 0 the `check (stock
   >= 0)` constraint fails and **the whole batch rolls back** — the buyer
   gets "Sorry, only N left".
5. Emails the seller via Resend (`ctx.waitUntil`, doesn't slow the reply).
6. Returns `{ order_no, id, access_token, total }`.

Moving an order to `rejected` or `cancelled` adds its quantities back to
stock in the same batch as the status change.

---

## 7. Frontend changes (by file)

| File | Change |
|------|--------|
| `src/supabaseClient.js` | Replaced by `src/api.js` — small `fetch` wrapper for the routes above. |
| `src/context/AuthContext.jsx`, `src/pages/SellerAuth.jsx`, `src/components/ProtectedRoute.jsx` | Removed — Cloudflare Access handles seller login. |
| `src/components/Navbar.jsx` | "Seller" link → `/listings`; "Log out" → `/cdn-cgi/access/logout`. |
| `src/pages/Catalog.jsx` | Load from `/api/listings`. |
| `src/components/ProductCard.jsx` | Show "X left"; "Sold out" when stock is 0. |
| `src/context/CartContext.jsx` | Store stock with each line; cap qty at stock; storage key `ronac_cart_v2`. |
| `src/pages/Cart.jsx` | Steps: Cart → Pickup at LSGH / Delivery to Neovista or Tierra Nova Royale → date (6 PM cut-off) + slot → Details → Pay (amount from `/api/quote`) → Proof + ref no. → Submit (`/api/proofs`, then `/api/orders`). |
| `src/pages/OrderConfirmed.jsx` | Order no., summary, area, date/slot, tracking link with copy button. |
| `src/pages/TrackOrder.jsx` (new) | `/order/:id?t=token` status timeline. |
| `src/pages/Orders.jsx` | New status tabs; inline proof from `/api/admin/proofs`; Verify / Reject (with reason) buttons; Refunded checkbox; daily prep view. |
| `src/pages/Listings.jsx` | Uses admin API; "packs left" field; photo upload to R2 through the Worker. |
| `worker/index.js` (new) | API router + static assets + Access JWT check + Resend email. |
| `migrations/0001_init.sql` (new) | Schema above. |
| `wrangler.jsonc` (new) | Bindings: `DB` (D1), `IMAGES`, `PROOFS` (R2), `ASSETS`; vars `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `SELLER_EMAIL`; secret `RESEND_API_KEY`. |
| `vite.config.js`, `package.json` | Add `@cloudflare/vite-plugin` + `wrangler`; `npm run dev` runs app + Worker locally with local D1/R2. |
| Removed | `supabase/`, `api/`, `vercel.json`, `SETUP_SUPABASE.md`, `@supabase/supabase-js`. |
| `README.md`, `RONAC_SETUP_GUIDE.md` | Rewritten for Cloudflare setup and the GCash/BPI flow. |

---

## 8. Migration and rollout

Platform move and the step-1 safety fixes ship **together** — the Worker
API *is* the safety fix, so there's no point building it on Supabase first.

1. **Cloudflare foundation** — Worker + static assets, D1 schema, R2
   buckets, `/api/listings`, Catalog reading from D1. Deploy to
   `workers.dev`.
2. **Orders on the Worker** — `/api/quote`, `/api/proofs`, `/api/orders`
   with server pricing, stock check, order numbers, private proofs,
   new-order email. Confirmation page shows the order number.
3. **Seller side** — Cloudflare Access on admin routes, Orders and Listings
   pages on the admin API, new statuses, Verify/Reject, refunds, stock
   editing. Remove Supabase auth code.
4. **Fulfillment** — LSGH pickup / Neovista & Tierra Nova Royale delivery,
   6 PM cut-off, slots, fees and minimum once decided.
5. **Buyer tracking + prep view.**
6. **Data move + cutover**
   - **Listings: copy over** (owner decision; orders start fresh).
     `scripts/export-supabase-listings.mjs` reads all listings + photos
     with the public anon key and writes `seed_listings.sql` (D1) and
     `upload-images.sh` (R2). Supabase listings have no stock count, so
     available ones get `--default-stock N` and sold/pending get 0 — set
     real counts on the Listings page after.
   - Buy the domain on Cloudflare Registrar, attach it to the Worker,
     move the Access app to the custom domain.
   - Smoke test a real ₱1 GCash order end to end.
7. **Decommission** — delete the Vercel project and pause/delete the
   Supabase project once nothing reads from it; remove leftover files.

---

## 9. Still open

1. **Minimum order and delivery fee.** Not decided yet. Supported per area;
   until set, both default to ₱0 (free delivery, no minimum) so this
   doesn't block the build.
2. **Pickup and delivery times.** Assumed: LSGH pickup during work hours,
   home delivery after work. Exact slots and days are seller-editable, so
   this doesn't block the build.
3. **Domain name** — which name to buy (and `.com` vs `.ph`; see §4).
4. **Seller email** for the Access login and new-order alerts.
