# Sub-project C: Tibia Character Verification — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow serviceiros to verify ownership of their Tibia character via a code-challenge (HMAC-based code placed in the character's tibia.com comment), automatically verified against the TibiaData API v4.

**Architecture:** SQL migration adds two columns to `serviceiro_profiles`. Two new API routes handle code generation (GET) and verification (POST). A new `CharacterVerificationCard` client component manages the UI flow and self-fetches. Profile page displays the verified character name.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase admin client, Node.js `crypto` module (built-in), TibiaData API v4 (`https://api.tibiadata.com`).

---

## Chunk 1: Database + Types + Env

### Task 1: SQL migration, type updates, env var

**Files:**
- Create: `supabase/migrations/001-character-verification.sql`
- Modify: `src/lib/types.ts`
- Modify: `.env.local.example` (already done — `CHAR_VERIFY_SECRET` added in sub-project B)
- Modify: `.env.local` (already done — `CHAR_VERIFY_SECRET` added in sub-project B)

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/001-character-verification.sql`:

```sql
-- Run this in Supabase Dashboard → SQL Editor
-- Adds Tibia character verification columns to serviceiro_profiles

ALTER TABLE serviceiro_profiles
  ADD COLUMN IF NOT EXISTS tibia_character TEXT,
  ADD COLUMN IF NOT EXISTS tibia_char_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

- [ ] **Step 2: Update `ServiceiroProfile` type in `src/lib/types.ts`**

Find the `ServiceiroProfile` interface and add two fields:

```typescript
export interface ServiceiroProfile {
  id: string
  vocations: VocationKey[]
  gameplay_types: GameplayTypeKey[]
  available_weekdays: WeekdayKey[]
  available_from: string
  available_to: string
  timezone_offset: number
  is_registered: boolean
  registered_at: string | null
  tibia_character: string | null      // ← add this
  tibia_char_verified: boolean        // ← add this
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add supabase/migrations/001-character-verification.sql src/lib/types.ts && git commit -m "feat(char-verify): add migration and type updates for character verification"
```

---

## Chunk 2: API Routes

### Task 2: `GET /api/verify-character`

**Files:**
- Create: `src/app/api/verify-character/route.ts`

- [ ] **Step 1: Create the file**

Create `src/app/api/verify-character/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateVerificationCode(userId: string): string {
  const secret = process.env.CHAR_VERIFY_SECRET ?? 'dev-secret'
  const hmac = createHmac('sha256', secret).update(userId).digest('hex')
  return `TIBS-${hmac.slice(0, 8).toUpperCase()}`
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verify role is serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  // Fetch current verification state
  const admin = createAdminClient()
  const { data: sp } = await admin
    .from('serviceiro_profiles')
    .select('tibia_character, tibia_char_verified')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    verification_code: generateVerificationCode(user.id),
    tibia_character: sp?.tibia_character ?? null,
    tibia_char_verified: sp?.tibia_char_verified ?? false,
  })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/api/verify-character/route.ts && git commit -m "feat(char-verify): add GET /api/verify-character route"
```

---

### Task 3: `POST /api/verify-character`

**Files:**
- Modify: `src/app/api/verify-character/route.ts`

- [ ] **Step 1: Add the POST handler to the same file**

Add after the existing `GET` function:

```typescript
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verify role is serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const body = await request.json()
  const { character_name } = body

  // Validate character name: non-empty, max 30 chars, letters and spaces only
  if (!character_name || typeof character_name !== 'string') {
    return NextResponse.json({ error: 'Nome do personagem é obrigatório.' }, { status: 400 })
  }
  const trimmed = character_name.trim()
  if (!/^[a-zA-Z ]{1,30}$/.test(trimmed)) {
    return NextResponse.json({ error: 'Nome inválido. Use apenas letras e espaços (máx. 30 caracteres).' }, { status: 400 })
  }

  const verificationCode = generateVerificationCode(user.id)

  // Fetch character from TibiaData API v4
  let characterData: { name: string; comment: string | null } | null = null
  try {
    const res = await fetch(
      `https://api.tibiadata.com/v4/character/${encodeURIComponent(trimmed)}`,
      { next: { revalidate: 0 } } // no caching
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'Não foi possível verificar o personagem. Tente novamente.' }, { status: 502 })
    }
    const data = await res.json()
    const char = data?.character?.character
    if (!char || !char.name) {
      return NextResponse.json({ error: 'Personagem não encontrado no Tibia.' }, { status: 404 })
    }
    characterData = { name: char.name, comment: char.comment ?? null }
  } catch {
    return NextResponse.json({ error: 'Não foi possível verificar o personagem. Tente novamente.' }, { status: 502 })
  }

  // Check if comment contains the verification code (case-insensitive)
  const commentUpper = (characterData.comment ?? '').toUpperCase()
  if (!commentUpper.includes(verificationCode)) {
    return NextResponse.json({
      error: 'Código de verificação não encontrado no comentário do personagem.',
    }, { status: 400 })
  }

  // Verify serviceiro_profiles row exists before updating
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('serviceiro_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Perfil de serviceiro não encontrado.' }, { status: 404 })
  }

  // Update with verified character name (use API-normalized name)
  await admin.from('serviceiro_profiles').update({
    tibia_character: characterData.name,
    tibia_char_verified: true,
  }).eq('id', user.id)

  return NextResponse.json({ success: true, character_name: characterData.name })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/api/verify-character/route.ts && git commit -m "feat(char-verify): add POST /api/verify-character route with TibiaData validation"
```

---

## Chunk 3: UI

### Task 4: `CharacterVerificationCard` component

**Files:**
- Create: `src/components/serviceiro/CharacterVerificationCard.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/serviceiro/CharacterVerificationCard.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface VerifyState {
  verification_code: string
  tibia_character: string | null
  tibia_char_verified: boolean
}

export function CharacterVerificationCard() {
  const [state, setState] = useState<VerifyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [characterName, setCharacterName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch('/api/verify-character')
      .then(r => r.json())
      .then(data => {
        setState(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleVerify = async () => {
    if (!characterName.trim()) return
    setVerifying(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/verify-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_name: characterName.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erro ao verificar. Tente novamente.')
      setVerifying(false)
      return
    }

    setSuccess(`✓ Personagem verificado: ${data.character_name}`)
    setState(prev => prev ? { ...prev, tibia_character: data.character_name, tibia_char_verified: true } : prev)
    setShowForm(false)
    setVerifying(false)
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-text-muted">Carregando...</p>
      </Card>
    )
  }

  if (!state) return null

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-text-primary mb-3">Personagem Tibia</h2>

      {state.tibia_char_verified && state.tibia_character && !showForm ? (
        <div>
          <p className="text-sm text-text-muted mb-3">
            <span className="text-status-success">✓</span>{' '}
            <span className="text-text-primary font-medium">{state.tibia_character}</span>
            {' '}verificado
          </p>
          <button
            className="text-xs text-text-muted hover:text-gold transition-colors"
            onClick={() => { setShowForm(true); setSuccess('') }}
          >
            Verificar outro personagem
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!showForm && !state.tibia_char_verified && (
            <p className="text-sm text-text-muted">
              Prove que você joga Tibia adicionando um código ao comentário do seu personagem.
            </p>
          )}

          <div className="bg-bg-primary border border-border rounded-lg p-3 text-sm">
            <p className="text-text-muted text-xs mb-1">Seu código de verificação:</p>
            <code className="text-gold font-mono font-bold">{state.verification_code}</code>
            <p className="text-text-muted text-xs mt-2">
              Adicione este código ao comentário do seu personagem em tibia.com
              (Personagem → Editar → Comentário), depois clique em Verificar.
            </p>
          </div>

          <Input
            label="Nome do personagem"
            value={characterName}
            onChange={e => setCharacterName(e.target.value)}
            placeholder="Ex: Archon Orc"
          />

          {error && (
            <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-status-success text-sm bg-status-success/10 border border-status-success/20 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          <Button onClick={handleVerify} loading={verifying} className="w-full">
            Verificar
          </Button>
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/components/serviceiro/CharacterVerificationCard.tsx && git commit -m "feat(char-verify): add CharacterVerificationCard component"
```

---

### Task 5: Dashboard integration + profile page display

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx`
- Modify: `src/app/serviceiro/[id]/page.tsx`

- [ ] **Step 1: Add `CharacterVerificationCard` to dashboard**

In `src/app/dashboard/DashboardClient.tsx`, the serviceiro-only section (inside the `profile.role === 'serviceiro'` block) currently ends before the closing `</>`. Add after the closing `</Card>` of the Availability section, before `</>`:

```tsx
          {/* Character verification */}
          <CharacterVerificationCard />
```

Add the import at the top of the file (with existing imports):
```typescript
import { CharacterVerificationCard } from '@/components/serviceiro/CharacterVerificationCard'
```

- [ ] **Step 2: Add verified character display to profile page**

In `src/app/serviceiro/[id]/page.tsx`, find the profile bio block (after the `{profile.bio && ...}` section, inside the header Card):

```tsx
            {profile.bio && (
              <p className="text-text-muted text-sm leading-relaxed">{profile.bio}</p>
            )}
```

Add after it:
```tsx
            {sp.tibia_char_verified && sp.tibia_character && (
              <p className="text-sm text-text-muted mt-2">
                Personagem:{' '}
                <span className="text-text-primary font-medium">{sp.tibia_character}</span>{' '}
                <span className="text-status-success text-xs">✓ verificado</span>
              </p>
            )}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/dashboard/DashboardClient.tsx src/app/serviceiro/[id]/page.tsx && git commit -m "feat(char-verify): wire CharacterVerificationCard into dashboard and show verified character on profile"
```
