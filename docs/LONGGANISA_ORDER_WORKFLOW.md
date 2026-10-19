# Proposal: Online Ordering Workflow for Longganisa

Status: **Draft for review** · Scope: buyer checkout + seller fulfillment for
frozen longganisa on Ronac.

This proposal revises the workflow already in the repo. It keeps what works
(no buyer accounts, manual GCash/BPI payment with proof upload, one seller)
and fills the gaps that matter when the product is a frozen, perishable,
made-in-batches item like longganisa.

### Decisions from the owner

| Topic | Decision |
|-------|----------|
| Variants | **One posting per variant** (e.g. "Garlic Longganisa · 500 g" is its own listing). No variant picker. |
| Service area | **La Salle Green Hills, Neovista Homes, Tierra Nova Royale** — pickup and delivery within these areas only. |
| Next-day cut-off | **6:00 PM.** Orders placed after 6 PM are scheduled for the day after tomorrow at the earliest. |
| Unpaid orders | **Unpaid orders don't go through.** An order only exists once payment proof is attached; there is no "reserve now, pay later". |
| New-order alerts | Any channel — **email via the existing Resend setup** is proposed (already wired, free tier). |
| Minimum order / delivery fee | *Still open* — see §7. |

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
                 • Area (required, dropdown): La Salle Green Hills /
                   Neovista Homes / Tierra Nova Royale. Nothing else is
                   accepted.
                 • Delivery: street/house no. + landmark.
                 • Date: earliest is tomorrow if before 6:00 PM, otherwise
                   the day after. Time slot from the seller's open slots.
               Minimum order / delivery fee applied if set (§7).
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
  grouped by area and slot, with a total pack count per posting ("Garlic
  500 g × 14, Hamonado 1 kg × 6") so the seller knows what to pack and the
  delivery route (LSGH → Neovista → Tierra Nova Royale).
- **New-order alert**: email to the seller through the existing Resend
  setup when an order is submitted, with order no., total, area and a link
  to the Orders page. SMS/Messenger can be added later.
- **Stock edit**: set packs left on each posting when a new batch is made.

---

## 4. Data model changes (Supabase)

```sql
-- listings: one row per variant (as today), add:
  stock int not null default 0 check (stock >= 0)
  -- status 'sold' is set automatically when stock hits 0

-- orders: add
  order_no      text unique   -- "RNC-0142", from a sequence
  access_token  text          -- for the buyer's tracking link
  fulfillment   text check (fulfillment in ('pickup','delivery'))
  area_id       fk → service_areas
  address       text, landmark text      -- delivery only
  slot_date     date, slot_time text
  delivery_fee  numeric(10,2) default 0
  payment_ref   text not null  -- GCash/BPI reference number
  proof_path    text not null  -- unpaid orders can't exist
  reject_reason text
  status        -- new set: submitted, paid, rejected, preparing,
                --          ready_for_pickup, out_for_delivery,
                --          completed, cancelled
  status_updated_at timestamptz

-- service areas + slots (small config tables, seller-editable)
service_areas (name text, delivery_fee numeric, min_order numeric,
               allows_pickup bool, allows_delivery bool, is_active bool)
  -- seeded: La Salle Green Hills, Neovista Homes, Tierra Nova Royale
time_slots    (time_label text, capacity int, is_active bool)
```

### Server-side order creation (fixes gaps 2, 7)

Two Postgres functions replace the direct `insert into orders` from the
browser:

- `quote_order(lines, area_id, fulfillment)` — read-only. Returns the
  official total for the Review/Pay step. Saves nothing.
- `place_order({...})` — called on Submit, **after** the proof is uploaded:
  1. Receives only `listing_id` + `quantity` per line, buyer and
     fulfillment fields, `payment_ref`, `proof_path` — **never prices or
     totals**. Rejects the call if proof or ref no. is missing.
  2. Checks the area is an active service area and the slot date respects
     the 6:00 PM (Asia/Manila) cut-off.
  3. Locks the listing rows, checks `stock >= quantity`, decrements stock.
  4. Looks up prices + area fee, computes the total itself.
  5. Inserts the order with a generated `order_no` and `access_token`.
  6. Returns `{ order_no, id, access_token, total }`.

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
| `src/components/ProductCard.jsx` | Show "X left"; "Sold out" when stock is 0. |
| `src/context/CartContext.jsx` | Store stock with each line; cap qty at stock. |
| `src/pages/Cart.jsx` | Split into steps: Cart → Fulfillment (area dropdown, date honoring 6 PM cut-off, slot) → Details → Pay & Proof. Call `quote_order` to show the server total on the QR step; upload proof, then call `place_order` on Submit. |
| `src/pages/OrderConfirmed.jsx` | Show order no., summary, slot, tracking link with copy button. |
| `src/pages/TrackOrder.jsx` (new) | `/order/:id?t=token` status timeline. |
| `src/pages/Orders.jsx` | New status tabs; inline proof (signed URL); Verify / Reject buttons instead of a raw dropdown; reject reason; daily prep view. |
| `src/pages/Listings.jsx` | Add a "packs left" field to each posting. |
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
2. **Stock** — `stock` on listings, caps in the cart, decrement on submit,
   release on reject/cancel, auto "Sold out".
3. **Fulfillment** — pickup/delivery, the three service areas, 6 PM
   cut-off, time slots, min order / fee once decided.
4. **Seller ops** — new statuses, Verify/Reject, prep view, new-order email.
5. **Buyer tracking** — tracking link + status page.
6. **Cleanup** — README, remove Stripe stub.

---

## 7. Still open

1. **Minimum order and delivery fee.** Not decided yet. The proposal
   supports a fee and minimum per area; until set, both default to ₱0
   (free delivery, no minimum) so this doesn't block the build.
2. **Pickup point(s).** Is pickup at one fixed spot, or a meet-up inside
   each of the three areas?
3. **Who delivers** within the areas — the seller, or a rider?
4. **Delivery days and time slots** (e.g. daily, 9–12 / 2–5)?
