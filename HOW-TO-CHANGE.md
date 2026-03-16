# HOW-TO-CHANGE.md — Common Modifications Guide

This guide explains how to make the most common changes to the site.

---

## Add a new vocation

1. Open `src/lib/constants.ts`
2. Add a new entry to the `VOCATIONS` array:
   ```typescript
   { key: 'new_voc', label: 'New Vocation' },
   ```
3. That's it — the vocation will automatically appear in:
   - Browse page filters
   - Dashboard vocation selector
   - Serviceiro profile badges

---

## Add a new gameplay type / service category

1. Open `src/lib/constants.ts`
2. Add a new entry to the `GAMEPLAY_TYPES` array:
   ```typescript
   { key: 'new_type', label: 'New Type', description: 'Description here' },
   ```
3. It will automatically appear in:
   - Browse page filters
   - Dashboard service type selector
   - Booking creation form
   - Serviceiro cards and profiles

---

## Change the color theme

1. Open `tailwind.config.ts`
2. Edit the `colors` section under `theme.extend`:
   ```typescript
   gold: {
     DEFAULT: '#c8a84b',   // ← change this for a different accent color
     bright: '#e6c56a',
     dim: '#8a7030',
   },
   bg: {
     primary: '#0a0a0f',   // ← background color
     card: '#13131a',      // ← card background
   },
   ```
3. Run `npm run dev` to see the changes

---

## Change TC increment or limits

Open `src/lib/constants.ts` and edit:
```typescript
export const TC_INCREMENT = 25    // minimum step between prices
export const TC_MIN = 25          // minimum price
export const TC_MAX = 100000      // maximum price
```

---

## Make contact visible without a booking

Open `src/app/api/contact/[id]/route.ts` and remove or comment out the booking check:

```typescript
// Comment out this entire block:
// const { data: booking } = await supabase
//   .from('bookings')
//   ...
// if (!booking) {
//   return NextResponse.json({ error: '...' }, { status: 403 })
// }
```

After this, any logged-in user can see the contact info.

---

## Add a new admin user

Run this SQL in Supabase SQL Editor (replace the email):
```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);
```

---

## Change the site language to English

The UI is in Portuguese. To switch to English:
1. Search for Portuguese strings in `src/` — they appear as hardcoded text in `.tsx` files
2. Replace them with English equivalents
3. Update `lang="pt-BR"` to `lang="en"` in `src/app/layout.tsx`
4. Update date formatting — in `src/lib/utils.ts`, change `'pt-BR'` to `'en-US'`

---

## Add email notifications on booking status changes

1. Install Resend or SendGrid SDK:
   ```bash
   npm install resend
   ```
2. Create an API key at resend.com
3. Add `RESEND_API_KEY` to `.env.local`
4. In `src/app/api/bookings/[id]/route.ts`, after updating the booking status, send an email:
   ```typescript
   import { Resend } from 'resend'
   const resend = new Resend(process.env.RESEND_API_KEY)
   await resend.emails.send({
     from: 'noreply@yoursite.com',
     to: customerEmail,
     subject: 'Sua reserva foi aceita',
     html: '<p>...</p>',
   })
   ```

---

## Allow serviceiros to set a price per service type

Currently prices are negotiated per booking. To add a "base price" to serviceiro profiles:
1. Add a column to `serviceiro_profiles` in Supabase:
   ```sql
   ALTER TABLE serviceiro_profiles ADD COLUMN base_prices JSONB DEFAULT '{}';
   ```
2. Add price inputs per gameplay type in the dashboard (`src/app/dashboard/DashboardClient.tsx`)
3. Display the base price on the serviceiro card/profile

---

## Change the verification fee amount

The fee (100 TC) is only mentioned in UI copy. Search for "100 TC" in the `src/` directory and update the number. The actual payment happens in-game and is manually confirmed by the admin.
