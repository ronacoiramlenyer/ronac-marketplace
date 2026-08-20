# Ronac — Supabase, GitHub & Vercel Setup Guide

This is the full, detailed walkthrough for the three services Ronac depends
on. Follow them in order — Supabase first, then GitHub, then Vercel.

---

## 1. Supabase Setup

### 1.1 Create the project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Pick an organization (or create one), give the project a name (e.g.
   `ronac`), set a database password (save it somewhere safe), choose a
   region close to your users
4. Click **Create new project** and wait ~2 minutes for provisioning

### 1.2 Get your Project URL and API key
1. In the left sidebar, click **Project Settings** (gear icon, bottom)
2. Click **API Keys**
3. Find your **Project ID** — your project URL is:
   ```
   https://<project-id>.supabase.co
   ```
4. Find the key labeled **`anon`** / **`public`** (or **`publishable`** on
   newer projects) — copy the full string. **Never** use the
   `service_role` / `secret` key in a frontend app.

### 1.3 Create the database table + security rules
1. Left sidebar → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from the Ronac project, copy its entire
   contents, paste into the query editor
3. Click **Run**
4. This creates:
   - The `listings` table (`id, seller_id, seller_name, seller_contact,
     seller_email, product_name, description, price, image_url, status,
     stripe_payment_link, created_at`)
   - Row Level Security policies: anyone can **read** listings, but only
     the authenticated owner (`auth.uid() = seller_id`) can **insert,
     update, or delete** their own rows

### 1.4 Create the image storage bucket
1. Left sidebar → **Storage** → **New bucket**
2. Name it exactly: `product-images`
3. Toggle **Public bucket** ON (so uploaded photos get public CDN URLs)
4. Click **Create bucket**
5. The storage security policies (also in `schema.sql`) restrict uploads
   so a seller can only write into a folder named after their own user id

### 1.5 Set up authentication (single-seller / invite-only mode)
1. Left sidebar → **Authentication → Sign In / Providers** (or
   **Settings**, depending on your dashboard version)
2. Turn **"Allow new users to sign up"** OFF — this stops the public
   signup form from creating new accounts
3. Left sidebar → **Authentication → Users → Add user**
4. Enter your own email and a password directly — this becomes your one
   seller login. No confirmation email needed since you added it as an
   admin.

### 1.6 (Optional) Email notifications
1. Install the Supabase CLI: `npm install -g supabase`
2. `supabase login`
3. `supabase link --project-ref <your-project-id>`
4. Deploy the function:
   ```bash
   supabase functions deploy notify-seller
   ```
5. Get a free API key at [resend.com](https://resend.com), then:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set NOTIFY_FROM_EMAIL="Ronac <onboarding@resend.dev>"
   ```
6. Dashboard → **Database → Webhooks → Create a new hook**:
   - Table: `listings`
   - Events: `Insert`, `Update`
   - Type: **Supabase Edge Function** → `notify-seller`

---

## 2. GitHub Setup

### 2.1 Create the repository
1. Go to [github.com](https://github.com) → **New repository**
2. Name it (e.g. `ronac-marketplace`)
3. Leave it **empty** — don't check "Add a README" (this avoids a
   conflicting first commit when you push your own code)
4. Click **Create repository**
5. Copy the HTTPS URL shown, e.g.
   `https://github.com/<your-username>/ronac-marketplace.git`

### 2.2 Push your local project (one-time setup)
In your terminal, inside the `ronacfrozen` project folder:
```bash
git init
git branch -m main
git add -A
git commit -m "Initial commit: Ronac MVP"
git remote add origin https://github.com/<your-username>/ronac-marketplace.git
git push --set-upstream origin main
```

Notes:
- If GitHub prompts for a password over HTTPS, you'll need a [personal
  access token](https://github.com/settings/tokens) instead — GitHub no
  longer accepts account passwords for git operations
- `.env` is already excluded via `.gitignore`, so your real Supabase keys
  never get pushed — only `.env.example` (placeholder values) is tracked
- If you accidentally run `git init` or `git remote add origin` twice,
  it's harmless — git just says it's already done and refuses to
  duplicate anything

### 2.3 Everyday updates
Every time you change code after the initial setup:
```bash
git add -A
git commit -m "describe what changed"
git push
```

---

## 3. Vercel Setup

### 3.1 Create your account
1. Go to [vercel.com](https://vercel.com) → **Sign Up**
2. Choose **Continue with GitHub**
3. Authorize Vercel's access to your GitHub account when prompted (you
   can grant access to all repos, or just select `ronac-marketplace`)

### 3.2 Import the project
1. From the Vercel dashboard, find the **Import Git Repository** section
2. Click **Continue with GitHub** (don't use the "paste a Git URL" quick
   box at the top — that skips the configuration screen you need)
3. Find `ronac-marketplace` in your repo list → click **Import**

### 3.3 Configure the project
On the import screen:
- **Framework Preset**: auto-detects as **Vite** — leave as is
- **Root Directory**: `./` — leave as is
- **Build and Output Settings**: leave all defaults
  (`npm run build`, output `dist`, install `npm install`)
- Expand **Environment Variables** and add all three, one at a time
  (Name + Value, click **Add** after each):

  | Name | Value |
  |---|---|
  | `VITE_SUPABASE_URL` | `https://<project-id>.supabase.co` |
  | `VITE_SUPABASE_ANON_KEY` | your anon key from step 1.2 |
  | `VITE_SUPABASE_STORAGE_BUCKET` | `product-images` |

  (If the screen offers a "paste .env" option, you can paste your whole
  local `.env` file contents at once instead — same result.)

### 3.4 Deploy
1. Click **Deploy**
2. Wait ~30–60 seconds for the build to finish
3. Your live URL appears on screen, e.g.
   `https://ronac-marketplace.vercel.app` — also always visible later on
   your Vercel project dashboard

### 3.5 Ongoing deploys
Once connected, every `git push` to GitHub automatically triggers a new
Vercel build and deploy — no need to return to the Vercel dashboard for
routine code changes.

**Exception:** if you only change environment variables (not code), that
alone doesn't trigger a new deploy. Go to **Vercel → your project →
Deployments → ⋯ (on the latest deployment) → Redeploy**.

### 3.6 Post-deploy check
1. Visit the live URL
2. Check `/catalog` loads without errors
3. Go to `/login`, sign in with the seller account created in step 1.5
4. Post a test listing with a photo, confirm it appears in **My
   Listings** and on **/catalog**
5. If anything's broken, open the browser console (right-click →
   Inspect → Console tab) — a red error there usually points to a
   missing or mistyped environment variable
