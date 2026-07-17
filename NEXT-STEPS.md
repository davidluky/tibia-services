# Next Steps — What You Need To Do

This checklist is for a fresh environment. The canonical production site is
already hosted at `https://tibia.davidluky.com` on Vercel.

---

## Step 1 — Install Node.js (if not done yet)

1. Go to https://nodejs.org
2. Download Node.js **24**
3. Run the installer, accept all defaults
4. Verify `node --version` shows `v24.x` and `npm --version` shows `11.x`

---

## Step 2 — Create a Supabase project (free)

1. Go to https://supabase.com → sign up free
2. Click **New project**
3. Name it `tibia-services`, pick a region near Brazil (São Paulo)
4. Save the database password somewhere safe
5. Wait ~1 minute for it to finish setting up

---

## Step 3 — Get your API keys

1. In Supabase dashboard → **Project Settings** → **API**
2. Copy these 3 values:
   - **Project URL** → looks like `https://abcxyz.supabase.co`
   - **anon / public key** → long string starting with `eyJ...`
   - **service_role key** → another long string (keep this private!)

---

## Step 4 — Create the .env.local file

1. In the project folder, find `.env.local.example`
2. Make a copy of it named `.env.local` (remove the `.example`)
3. Open `.env.local` and fill in all 7 required values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   APP_URL=http://localhost:3000
   CHAR_VERIFY_SECRET=a-random-secret-string
   ```

---

## Step 5 — Run the database schema and migrations

1. In Supabase dashboard → **SQL Editor** → New query
2. Open the file `supabase/schema.sql` from the project folder
3. Copy all the contents and paste into the SQL Editor
4. Click **Run** — you should see "Success"
5. Run every timestamped file in `supabase/migrations/` in filename order, from the oldest timestamp through the latest file

---

## Step 6 — Configure email confirmation

1. Supabase dashboard → **Authentication** → **Settings** → **Email**
2. For local development only, you may turn OFF **"Enable email confirmations"**
3. For production, keep email confirmation ON
4. Save

---

## Step 7 — Create the storage bucket

1. Supabase dashboard → **Storage** → **New bucket**
2. Name it exactly: `verifications`
3. Make sure **Public bucket** is OFF (private)
4. Click Create

---

## Step 8 — Install and run the project

Open a terminal in the project folder and run:

```
npm ci
npm run dev
```

Then open your browser at: **http://localhost:3000**

---

## Step 9 — Create your admin account

1. Register a normal account on the site
2. Go to Supabase dashboard → **SQL Editor** → New query
3. Confirm the email in production, copy the verified `auth.users.id`, then promote by UUID:
   ```sql
   UPDATE profiles SET role = 'admin'
   WHERE id = '00000000-0000-0000-0000-000000000000'
   AND EXISTS (
     SELECT 1 FROM auth.users
     WHERE auth.users.id = profiles.id
       AND auth.users.email_confirmed_at IS NOT NULL
   );
   ```
4. Log out and log back in
5. Go to http://localhost:3000/admin

---

## Step 10 — Deploy to the canonical Vercel project (optional)

1. Run `npm run quality` against the exact tree to deploy.
2. Push it to the Vercel-connected production branch, or run `vercel --prod`
   from that exact tree with an authenticated Vercel CLI.
3. Confirm all 7 environment variables from `.env.local.example` are set.
4. Verify `https://tibia.davidluky.com` after deployment.

Cloudflare/OpenNext packaging is optional and inactive; it is not the current
production route.

---

## Quick reference

| Command | What it does |
|---------|-------------|
| `npm ci` | Reproduce dependencies from `package-lock.json` |
| `npm run dev` | Start local development server |
| `npm run build` | Check for errors / build for production |
| `npm run package` | Optional Cloudflare Workers portability build |
| `npm run quality` | Run lint, typecheck, tests, build, and audit |

## Need help?

- Full setup guide: `SETUP.md`
- How to modify the site: `HOW-TO-CHANGE.md`
- Why things were built this way: `docs/design-decisions.md`
