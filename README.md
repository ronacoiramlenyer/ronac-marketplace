# Ronac 🧊

A simple marketplace for frozen Filipino goods — longganisa, tocino, embutido,
tapa, siomai, and more. Buyers browse and check out via Stripe; sellers log
in, list a photo + price, and manage their own listings.

**Stack:** React (Vite) · Supabase (Postgres + Auth + Storage) · Stripe
Payment Links · Vercel

---

## 1. Run it locally

```bash
npm install
cp .env.example .env      # then fill in your Supabase values (see below)
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`).

## 2. Set up Supabase

Full click-by-click steps are in **[SETUP_SUPABASE.md](./SETUP_SUPABASE.md)**.
Short version:

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql` — creates the `listings`
   table, enables Row Level Security, and adds storage policies.
3. In Storage, create a **public** bucket named `product-images`.
4. In Project Settings → API, copy your Project URL and `anon` public key
   into `.env`.
5. (Optional) Set up email notifications — see step 5 below.

## 3. Add Stripe checkout per listing

This MVP uses **Stripe Payment Links** (no custom payment backend needed):

1. In the [Stripe Dashboard](https://dashboard.stripe.com) → Payment Links,
   click **New**, set the product/price, and copy the generated link.
2. Paste that link into the "Stripe payment link" field when creating a
   listing in Ronac. Buyers who click **Buy Now** are redirected straight to
   Stripe Checkout.

Since each listing is one-off (frozen batches sell out), a fresh Payment
Link per listing keeps this simple and avoids running your own payment
backend. If you outgrow this later, add a small Vercel serverless function
under `/api` that calls `stripe.checkout.sessions.create()` dynamically.

## 4. Notifications (seller emails)

`supabase/functions/notify-seller/index.ts` is a Supabase Edge Function that
emails a seller when:
- their new listing goes live, and/or
- their listing is marked **Sold**.

It uses [Resend](https://resend.com) (free tier is plenty for an MVP).
Setup:

```bash
supabase functions deploy notify-seller
supabase secrets set RESEND_API_KEY=re_xxx NOTIFY_FROM_EMAIL="Ronac <you@yourdomain.com>"
```

Then in the Supabase Dashboard → Database → Webhooks, create a webhook on
the `listings` table for `INSERT` and `UPDATE` events that calls the
deployed function URL. Full steps in `SETUP_SUPABASE.md`.

This step is optional for local testing — everything else (listing,
browsing, buying) works without it.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **New Project** → import the repo.
   Project name: `ronacfrozen` (or similar).
3. Framework preset: **Vite**. Build command `npm run build`, output dir
   `dist` (Vercel usually detects this automatically).
4. Add the same env vars from `.env` under Project Settings → Environment
   Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_STORAGE_BUCKET` (optional, defaults to `product-images`)
5. Deploy. Every push to your main branch auto-deploys.

Your site will be live at `https://ronacfrozen.vercel.app` (or whatever
Vercel assigns).

---

## Project structure

```
src/
  pages/          Landing, Catalog, SellerAuth, SellerDashboard, NewListing
  components/     Navbar, Footer, ProductCard, ProtectedRoute
  context/        AuthContext (wraps Supabase Auth session)
  supabaseClient.js
supabase/
  schema.sql                       Table + RLS policies
  functions/notify-seller/index.ts Email notification Edge Function
```

## How auth + RLS keep sellers scoped to their own listings

- Buyers browse without logging in (public `select` policy).
- Sellers sign up / log in with Supabase Auth (email + password).
- Every listing stores `seller_id = auth.uid()` at insert time.
- RLS policies only allow `insert`/`update`/`delete` where
  `auth.uid() = seller_id`, so a seller can never edit someone else's
  listing — no extra backend code required.

## What's intentionally left out (MVP scope)

- No admin panel.
- No in-app messaging — buyers without a payment link use "Contact Seller"
  (mailto link) as a fallback.
- No order/inventory management beyond the `available / pending / sold`
  status field.
- No custom domain — ships on the default `.vercel.app` subdomain.
