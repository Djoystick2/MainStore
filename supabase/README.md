# Supabase Backend Foundation

This folder stores database migrations for MainStore.

## Environment

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not commit real keys.

## Apply Migrations

With Supabase CLI configured for your project:

```bash
supabase db push
```

The initial shop schema is in:

- `supabase/migrations/20260309190000_store_backend_foundation.sql`

## Scope of This Stage

- Schema, indexes, enums, constraints, RLS, and policies are prepared.
- Typed database scaffold exists in `src/types/db.ts`.
- No runtime data fetch from UI pages is connected yet.
