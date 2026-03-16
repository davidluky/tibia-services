# Sub-project C: Tibia Character Verification

## Goal

Allow serviceiros to automatically verify ownership of a Tibia character using a code-challenge approach, without admin intervention. The verified character name is displayed on their public profile.

## Context

The existing verification flow (`verification_requests` table, admin panel) handles the `✓ Registrado` badge — it requires fee payment and admin approval. This is a separate, complementary feature: it proves the serviceiro actually plays the game and owns the character they claim.

## Architecture

1. Serviceiro enters their character name on the dashboard
2. A code is generated from HMAC-SHA256(userId, CHAR_VERIFY_SECRET), truncated to 8 chars: `TIBS-{hmac8chars}`
3. They add that code to their Tibia character's comment field on tibia.com
4. They click "Verify" — we call the TibiaData API (v4) to check the comment contains the code
5. On success: store `tibia_character` and set `tibia_char_verified = true` on `serviceiro_profiles`
6. On profile page: show "Personagem: {name} ✓" if verified

---

## Chunk 1: Database Changes

### Migration: `supabase/migrations/001-character-verification.sql`

```sql
ALTER TABLE serviceiro_profiles
  ADD COLUMN tibia_character TEXT,
  ADD COLUMN tibia_char_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

Also add to `src/lib/types.ts` — update `ServiceiroProfile`:
```typescript
tibia_character: string | null
tibia_char_verified: boolean
```

---

## Chunk 2: TibiaData API Integration

### External API

TibiaData Community API v4: `https://api.tibiadata.com/v4/character/{name}`

Response shape (relevant fields):
```json
{
  "character": {
    "character": {
      "name": "Archon Orc",
      "comment": "TIBS-AB12CD34 some other text"
    }
  }
}
```

Access path: `data.character.character.name` and `data.character.character.comment`.

"Character not found" is indicated by an empty/null `name` field in the response.

The check is: `(comment ?? '').toUpperCase().includes(verificationCode)` (case-insensitive via uppercasing).

Character names in Tibia are case-insensitive. The API normalizes them. Names with spaces are URL-encoded via `encodeURIComponent`.

### Verification code generation

HMAC-based — stable per user, unguessable even with the user ID in hand:

```typescript
import { createHmac } from 'crypto'

function generateVerificationCode(userId: string): string {
  const secret = process.env.CHAR_VERIFY_SECRET ?? 'dev-secret'
  const hmac = createHmac('sha256', secret).update(userId).digest('hex')
  return `TIBS-${hmac.slice(0, 8).toUpperCase()}`
}
```

New env var required — add to `.env.local.example`:
```
# Random secret for character verification code generation (any long random string)
CHAR_VERIFY_SECRET=your-random-secret-here
```

The code is deterministic (same userId + same secret = same code), so it doesn't need to be stored in the DB. The `dev-secret` fallback is only for local dev where verification will be manually tested.

### Row existence check before update

Before updating `serviceiro_profiles`, verify the row exists (Supabase `.update()` silently no-ops on missing rows):

```typescript
const { data: existing } = await adminClient
  .from('serviceiro_profiles')
  .select('id')
  .eq('id', user.id)
  .single()

if (!existing) {
  return NextResponse.json({ error: 'Perfil de serviceiro não encontrado.' }, { status: 404 })
}
```

---

## Chunk 3: API Routes

### `GET /api/verify-character`

Returns the verification code and current verification status for the authenticated serviceiro.

```typescript
// Returns:
{
  verification_code: string     // e.g. "TIBS-AB12CD34"
  tibia_character: string | null
  tibia_char_verified: boolean
}
```

Auth required. Role must be `serviceiro`.

### `POST /api/verify-character`

Body: `{ character_name: string }`

Steps:
1. Auth check — must be logged in serviceiro
2. Validate `character_name`: non-empty, max 30 chars, alphanumeric + spaces only (`/^[a-zA-Z ]{1,30}$/`)
3. Generate verification code from `user.id`
4. Generate verification code using `generateVerificationCode(user.id)`
5. Fetch `https://api.tibiadata.com/v4/character/{encodeURIComponent(character_name)}`
   - On network error or non-200: return `{ error: 'Não foi possível verificar o personagem. Tente novamente.' }` status 502
   - If character not found (`data.character.character.name` is empty/null): return `{ error: 'Personagem não encontrado no Tibia.' }` status 404
6. Check if `(data.character.character.comment ?? '').toUpperCase().includes(verificationCode)`
   - No match: return `{ error: 'Código de verificação não encontrado no comentário do personagem.' }` status 400
7. Verify serviceiro_profiles row exists (see row existence check above) — return 404 if not found
8. On match + row exists: update `serviceiro_profiles` using the admin client:
   ```typescript
   await adminClient.from('serviceiro_profiles').update({
     tibia_character: data.character.character.name, // use the API-normalized name
     tibia_char_verified: true,
   }).eq('id', user.id)
   ```
9. Return `{ success: true, character_name: data.character.character.name }`

Use `createAdminClient()` for the SELECT and UPDATE to avoid any RLS edge cases.

---

## Chunk 4: Dashboard UI

### Location

Add a "Verificar Personagem" card to the serviceiro dashboard (`src/app/dashboard/DashboardClient.tsx` or a new sub-component). This is a client component that fetches from `GET /api/verify-character` on mount.

### New file: `src/components/serviceiro/CharacterVerificationCard.tsx`

`'use client'` component. States:
1. **Loading** — while fetching GET
2. **Already verified** — shows "Personagem: {name} ✓" + "Verificar outro" button to reset
3. **Not verified** — shows the form:
   - Text input for character name
   - Instructions block: "Adicione o código `{verificationCode}` ao comentário do seu personagem em tibia.com, depois clique em Verificar."
   - "Verificar" button → calls POST → shows success or error
4. **Success** — shows "✓ Personagem verificado: {name}"
5. **Error** — inline error message, form stays visible

The verification code is shown immediately (from GET response) — user doesn't need to submit the name first to see the code.

### Dashboard integration

`src/app/dashboard/DashboardClient.tsx` already renders serviceiro-specific sections. Add `<CharacterVerificationCard />` inside the serviceiro block (after existing verification request link).

---

## Chunk 5: Profile Display

### `src/app/serviceiro/[id]/page.tsx`

`sp` (serviceiro_profiles row) already has `*` selected. After the migration, `sp.tibia_character` and `sp.tibia_char_verified` will be available.

In the profile header card, after the bio block, add:
```tsx
{sp.tibia_char_verified && sp.tibia_character && (
  <p className="text-sm text-text-muted mt-2">
    Personagem: <span className="text-text-primary font-medium">{sp.tibia_character}</span>{' '}
    <span className="text-status-success text-xs">✓ verificado</span>
  </p>
)}
```

---

## What is NOT in scope

- Re-verification (user can overwrite by submitting a new character name — the POST just updates the column)
- Admin interface for character verification (it's fully automated)
- Checking character level, world, vocation from the API (just the comment)
- Caching the TibiaData API response
- Rate limiting the verification endpoint (acceptable for now at this scale)
