# Tibia Services — Setup Guide

> Last reviewed: 2026-03-15

Complete step-by-step instructions to get this project running locally and deployed online.

---

## Step 1 — Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version (the one that says "Recommended For Most Users")
3. Run the installer, accept all defaults
4. Open a terminal (CMD or PowerShell) and verify:
   ```
   node --version
   ```
   Should print something like `v20.x.x`. If it does, you're good.

---

## Step 2 — Create a Supabase project (free)

Supabase is the database + auth + file storage for this project.

1. Go to https://supabase.com and click **Start your project**
2. Sign up with GitHub or email (free)
3. Click **New project**
4. Fill in:
   - **Name:** `tibia-services`
   - **Database Password:** choose a strong password and **save it somewhere safe** l03dF9LY9bZU9O9j
   - **Region:** pick the one closest to Brazil (South America - São Paulo)
5. Click **Create new project** — wait about 1 minute for it to set up
6. Once ready, go to the left menu → **Project Settings** → **API**
7. Copy and save these 3 values (you'll need them in Step 5):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`                             https://REDACTED_PROJECT_ID.supabase.co
   - **anon / public** key — a long string starting with `eyJ...`                            REDACTED_ANON_KEY
   - **service_role** key — another long string (⚠️ keep this private, never share it)      REDACTED_SERVICE_ROLE_KEY

---

## Step 3 — Run the database schema

This creates all the tables, rules, and indexes in your Supabase database.

1. In the Supabase dashboard, go to the left menu → **SQL Editor**
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy all the contents and paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" — that means it worked

---

## Step 4 — Configure Supabase Auth settings

By default Supabase requires email confirmation. Disable this for easier development:

1. In Supabase dashboard → left menu → **Authentication** → **Settings** → **Email**
2. Turn OFF **"Enable email confirmations"**
3. Click Save

---

## Step 5 — Create the Supabase Storage bucket

The verification documents (screenshots, IDs) are stored here.

1. In Supabase dashboard → left menu → **Storage**
2. Click **New bucket**
3. Name it exactly: ``
4. Make sure **Public bucket** is turned **OFF** (it should be private)
5. Click **Create bucket**

---

## Step 6 — Set up your local environment file

1. In the project folder, find the file `.env.local.example`
2. Make a copy of it and name the copy `.env.local` (no `.example`)
3. Open `.env.local` and fill in the 3 values you copied in Step 2:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJyour-anon-key-here...
   SUPABASE_SERVICE_ROLE_KEY=eyJyour-service-role-key-here...
   ```
4. Save the file
5. ⚠️ **Never commit `.env.local` to git** — it contains secrets. It is already in `.gitignore`.

---

## Step 7 — Install project dependencies

Open a terminal in the project folder and run:
```bash
npm install
```
This downloads all the required packages. Takes 1–2 minutes.

---

## Step 8 — Run the project locally

```bash
npm run dev
```

Open your browser and go to: **http://localhost:3000**

You should see the Tibia Services website. If you see an error, check that:
- `.env.local` exists and has the correct values
- You ran the schema in Step 3

---

## Step 9 — Create the first admin user

After registering your own account through the website, promote it to admin:

1. In Supabase dashboard → **SQL Editor** → New query
2. Run this (replace `your@email.com` with your actual email):
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'your@email.com'
   );
   ```
3. Log out and log back in on the website
4. You should now be able to access http://localhost:3000/admin

---

## Step 10 — Deploy to Vercel (free hosting)

Vercel hosts the website online for free.

### First time setup:

1. Create a free account at https://vercel.com (sign up with GitHub is easiest)
2. Push your project to a GitHub repository:
   ```bash
   git remote add origin https://github.com/your-username/tibia-services.git
   git push -u origin master
   ```
3. In Vercel dashboard → **Add New Project** → Import your GitHub repo
4. Vercel will detect it's a Next.js project automatically
5. Before clicking Deploy, go to **Environment Variables** and add all 3:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **Deploy**
7. Wait ~2 minutes — Vercel will give you a URL like `https://tibia-services.vercel.app`

### Future updates:

Every time you push to GitHub, Vercel automatically redeploys. No manual steps needed.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Make sure Node.js v18+ is installed |
| Page loads but shows database error | Check `.env.local` has correct Supabase URL and keys |
| Login doesn't work | Make sure email confirmation is disabled in Supabase Auth settings (Step 4) |
| File uploads fail | Make sure the `verifications` storage bucket exists (Step 5) |
| Admin page redirects to home | Make sure you ran the SQL in Step 9 to set your role to `admin` |
| Vercel deployment fails | Check that all 3 environment variables are set in Vercel project settings |

---

## Cost Summary

| Service | Free tier | When you'd need to pay |
|---------|-----------|----------------------|
| Vercel | Unlimited deploys, 100GB bandwidth/month | Almost never for a small site |
| Supabase | 500MB database, 1GB storage, 50k monthly active users | When you grow significantly |
| **Total** | **$0/month** | Only at significant scale |
