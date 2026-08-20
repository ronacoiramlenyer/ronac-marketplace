# Supabase setup for Ronac

Follow these steps once, in order, in a fresh Supabase project.

## 1. Create the project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New
project**. Pick any name/region. Wait for provisioning (~2 min).

## 2. Create the `listings` table + security policies

Dashboard → **SQL Editor** → **New query** → paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**.

This creates:

| column               | type      | notes                                   |
|----------------------|-----------|------------------------------------------|
| `id`                 | uuid      | primary key, auto-generated              |
| `seller_id`          | uuid      | references `auth.users`, set by the app  |
| `seller_name`        | text      | shown publicly on listings               |
| `seller_contact`     | text      | phone number, seller-provided            |
| `seller_email`       | text      | used for sold/live notifications         |
| `product_name`       | text      |                                           |
| `description`        | text      |                                           |
| `price`               | numeric  | PHP, no decimals needed but supported    |
| `image_url`           | text     | public Storage CDN URL                   |
| `status`               | text   | `available` \| `pending` \| `sold`         |
| `stripe_payment_link`  | text   | pasted from Stripe Dashboard              |
| `created_at`           | timestamptz | defaults to `now()`                    |

Row Level Security is enabled with these policies:
- **Anyone** can `select` (browse) listings.
- Only the **authenticated owner** (`auth.uid() = seller_id`) can `insert`,
  `update`, or `delete` their own rows.

## 3. Create the Storage bucket

Dashboard → **Storage** → **New bucket**:
- Name: `product-images`
- **Public bucket**: ON (so uploaded photos are served over a public CDN
  URL without extra signing)

The storage policies at the bottom of `schema.sql` restrict uploads so a
seller can only write into a folder named after their own user id
(`{seller_id}/filename.jpg`) — this is exactly what `NewListing.jsx` does
when uploading.

## 4. Enable email/password auth

Dashboard → **Authentication** → **Providers** → confirm **Email** is
enabled (it is by default). For faster MVP testing you can turn off
"Confirm email" under **Authentication → Settings** so sellers can sign up
and log in immediately without clicking a confirmation link — turn it back
on before real users onboard if you want verified emails.

## 5. Copy your API keys

Dashboard → **Project Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Paste both into your local `.env` (copied from `.env.example`) and into
Vercel's Environment Variables when you deploy.

## 6. (Optional) Email notifications via Edge Function

1. Install the Supabase CLI: `npm install -g supabase`
2. Log in and link: `supabase login` then `supabase link --project-ref YOUR_REF`
3. Deploy the function:
   ```bash
   supabase functions deploy notify-seller
   ```
4. Get a free API key at [resend.com](https://resend.com), then set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set NOTIFY_FROM_EMAIL="Ronac <onboarding@resend.dev>"
   ```
   (`onboarding@resend.dev` works out of the box for testing; verify your
   own domain in Resend before going live.)
5. Dashboard → **Database → Webhooks** → **Create a new hook**:
   - Table: `listings`
   - Events: `Insert`, `Update`
   - Type: **Supabase Edge Function**
   - Function: `notify-seller`
6. Test it: create a listing, then mark it **Sold** from the seller
   dashboard — you should get an email both times.

That's it — the app is fully wired to Supabase.
