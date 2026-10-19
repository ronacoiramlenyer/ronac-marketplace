# Proposal: Online Ordering Workflow for Longganisa

Status: **Draft for review** · Scope: buyer checkout + seller fulfillment for
frozen longganisa on Ronac.

This proposal revises the workflow already in the repo. It keeps what works
(no buyer accounts, manual GCash/BPI payment with proof upload, one seller)
and fills the gaps that matter when the product is a frozen, perishable,
made-in-batches item like longganisa.

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
| 1 | No variants (flavor, pack size) | `listings` has one price per row | Longganisa is sold as *Hamonado / Garlic / Spicy*, in *250 g / 500 g / 1 kg* or *12 pcs* packs. Today each combo would need its own listing. |
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
1. Browse      Catalog shows each longganisa product once, with variant picker
               (flavor + pack size), price per variant, and "X packs left".
2. Add to cart Qty stepper capped at stock left. Cart line shows variant.
3. Fulfillment Choose PICKUP or DELIVERY.
                 • Pickup: pick a date + time slot from the seller's open slots.
                 • Delivery: barangay/city (must be in service area), address,
                   landmark, date + slot. Delivery fee added by zone.
               Minimum order (e.g. ₱500) enforced for delivery.
4. Details     Name, mobile number (09xx format validated), optional
               Messenger/FB name, notes ("pakihiwalay ang spicy").
5. Review      Server re-prices the cart and returns the official total
               (items + delivery fee). Buyer sees exactly what to pay.
6. Pay         GCash or BPI QR + account details, amount shown large with
               a copy button. Reminder: "Pay the exact amount."
7. Proof       Upload screenshot (required) + GCash/BPI reference no.
               (required, 13 digits for GCash). Submit.
8. Confirmed   Shows order number (RNC-0142), summary, slot, and a
               tracking link /order/<id>?t=<token>. "Save this link."
9. Track       Buyer opens the link anytime to see the current status.
```

### Stock reservation rule

- On submit, the ordered quantity is **reserved** (subtracted from
  "packs left").
- If the seller rejects the payment, or the order is cancelled, the
  quantity is **released** back.
- Optional: unverified orders older than 24 h auto-expire and release stock.

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

- **Daily prep view**: tomorrow's paid orders grouped by slot, with a total
  pack count per variant ("Garlic 500 g × 14, Hamonado 1 kg × 6") so the
  seller knows how much to thaw-out/pack.
- **New-order alert**: email (existing Resend setup) or Messenger/SMS when
  an order is submitted.
- **Stock edit**: set packs left per variant when a new batch is made.

---

## 4. Data model changes (Supabase)

```sql
-- products: one row per longganisa product (replaces per-combo listings)
listings            -- keep table, add:
  category text default 'longganisa'

-- variants: flavor/size combos with their own price + stock
listing_variants
  id uuid pk, listing_id uuid fk → listings,
  label text,            -- "Garlic · 500 g"
  price numeric(10,2),
  stock int check (stock >= 0),
  is_active bool default true

-- orders: add
  order_no      text unique   -- "RNC-0142", from a sequence
  access_token  text          -- for the buyer's tracking link
  fulfillment   text check (fulfillment in ('pickup','delivery'))
  slot_date     date, slot_time text
  address       text, barangay text, landmark text
  delivery_fee  numeric(10,2) default 0
  payment_ref   text          -- GCash/BPI reference number
  reject_reason text
  status        -- new set: submitted, paid, rejected, preparing,
                --          ready_for_pickup, out_for_delivery,
                --          completed, cancelled
  status_updated_at timestamptz

-- delivery zones + slots (simple config tables, seller-editable)
delivery_zones (name text, fee numeric, min_order numeric)
pickup_slots   (weekday int, time_label text, capacity int)
```

### Server-side order creation (fixes gaps 2, 7)

Replace the direct `insert into orders` from the browser with a Postgres
function the buyer calls via `supabase.rpc('place_order', {...})`:

1. Receives only `variant_id` + `quantity` per line, plus buyer/fulfillment
   fields — **never prices or totals**.
2. Locks the variant rows, checks `stock >= quantity`, decrements stock.
3. Looks up prices + zone fee, computes the total itself.
4. Inserts the order with a generated `order_no` and `access_token`.
5. Returns `{ order_no, id, access_token, total }`.

The anonymous `insert` policy on `orders` is then removed; the function runs
as `security definer`. A matching `release_order_stock(order_id)` is called
when an order moves to `rejected` or `cancelled` (trigger).

### Buyer tracking (gap 5)

`get_order_status(id, token)` function returns status, order_no, items,
slot — only when the token matches. No buyer login required.

### Security tightening (gaps 8, 9)

- Make `payment-proofs` a **private** bucket; seller views proofs through
  short-lived signed URLs (`createSignedUrl`).
- Change `orders` select/update policies from `using (true)` to
  `using (auth.uid() = '<seller uuid>')` (or a `sellers` table check), and
  confirm sign-ups are disabled in Supabase Auth settings.

---

## 5. Frontend changes (by file)

| File | Change |
|------|--------|
| `src/components/ProductCard.jsx` | Variant chips (flavor / size), price updates per variant, "X left", disable when 0. |
| `src/context/CartContext.jsx` | Key cart lines by `variant_id`; cap qty at stock; bump storage key to `ronac_cart_v2`. |
| `src/pages/Cart.jsx` | Split into steps: Cart → Fulfillment → Details → Pay & Proof. Call `place_order` RPC *before* showing the QR so the amount shown is the server total; then upload proof + ref no. to that order. |
| `src/pages/OrderConfirmed.jsx` | Show order no., summary, slot, tracking link with copy button. |
| `src/pages/TrackOrder.jsx` (new) | `/order/:id?t=token` status timeline. |
| `src/pages/Orders.jsx` | New status tabs; inline proof (signed URL); Verify / Reject buttons instead of a raw dropdown; reject reason; daily prep view. |
| `src/pages/Listings.jsx` | Manage variants + stock per product. |
| `supabase/functions/notify-seller` | Also fire on `orders` INSERT (new order) — optional: notify buyer by SMS on status change. |
| `README.md` | Replace Stripe section with the GCash/BPI flow. |

`api/create-checkout-session.js` (Stripe) is unused by the current flow and
can be removed, or kept for a later card-payment option.

---

## 6. Suggested rollout (small PRs)

1. **Safety first** — server-side `place_order` with re-pricing, private
   proofs bucket, tighter `orders` RLS, order number on confirmation. *(No
   visible UX change beyond the order number; closes the price-tampering
   and privacy holes.)*
2. **Stock + variants** — `listing_variants`, stock caps, reservation /
   release.
3. **Fulfillment** — pickup/delivery, zones, slots, min order, fee.
4. **Seller ops** — new statuses, Verify/Reject, prep view, new-order email.
5. **Buyer tracking** — tracking link + status page.
6. **Cleanup** — README, remove Stripe stub.

---

## 7. Open questions for the owner

1. Pack sizes and flavors to launch with? (e.g. Hamonado, Garlic, Spicy ×
   250 g / 500 g / 1 kg)
2. Pickup, delivery, or both? Where is pickup, and which areas get
   delivery?
3. Who delivers — own rider, Lalamove/Grab booked by seller, or buyer books
   their own?
4. Minimum order and delivery fees per area?
5. Cut-off for next-day orders (e.g. order by 6 PM for tomorrow)?
6. Should unverified orders auto-expire, and after how long?
7. Preferred new-order alert: email, SMS, or Messenger?
