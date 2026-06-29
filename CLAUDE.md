# CLAUDE.md — NovaMobiles

E-commerce SPA (iPhone/NovaPhone store) migrated from Lovable + Supabase to
Claude Code + PocketBase.

## Stack
- React 18 + Vite 5 + TypeScript 5.5
- Tailwind CSS 3 + shadcn/ui (Radix primitives)
- react-router-dom v6 (SPA, no SSR)
- react-hook-form + zod for forms
- @tanstack/react-query for server state
- `pocketbase` npm SDK (replaced `@supabase/supabase-js`)

## Commands
- `npm run dev` — local dev server (**port 8080**, see vite.config.ts)
- `npm run build` — production build to /dist
- `npm run lint` — ESLint check
- `npx tsc --noEmit` — type check

## Backend (PocketBase)
- Local: run the `pocketbase` binary → admin UI at http://127.0.0.1:8090/_/
- Client singleton: `src/integrations/pocketbase/client.ts` (exports `pb`)
- Auth: `pb.authStore` (`.record`, `.token`, `.isValid`, `.onChange`, `.clear`)
- Collections mirror the old Supabase tables. Key renames vs Supabase:
  - foreign key `user_id` → relation field `user`
  - `order_tracking_steps.order_id` → `order`
  - `created_at` → PocketBase's auto `created`
- Profile data (`display_name`, `phone`) lives **on the `users` record**, not a
  separate `profiles` collection.
- `public_reviews` is a read-only **view collection** (omits `user`) for public
  rating reads.
- Hooks: `pb_hooks/main.pb.js` auto-creates the 4 order-tracking steps on order
  create (PocketBase v0.23+ API: `onRecordAfterCreateSuccess` + `e.app.save`).

## Project structure
- `src/integrations/pocketbase/client.ts` — PocketBase client singleton
- `src/contexts/AuthContext.tsx` — auth state (PocketBase authStore)
- `src/data/products.ts` — ALL product data is static here, never fetched from DB
- `src/pages/` — page components
- `src/components/` — shared components

## Conventions / Do NOT
- Do NOT add Redux, Zustand, or any global state library
- Do NOT add any Supabase imports or references (migration is complete)
- Do NOT add server-side rendering
- Keep shadcn/ui patterns intact
- Cart (`CartContext`) and Wishlist (`WishlistContext`) are in-memory React
  reducers — no persistence, do not wire them to the DB
- Never commit secrets. `.env` holds only the public `VITE_POCKETBASE_URL`;
  PocketBase admin/SMTP credentials live in the PocketBase Admin UI only.

## Decisions (see MIGRATION-PLAN-v2.md)
- Profile folded into `users` (no `profiles` collection)
- Guest checkout removed — checkout requires login
- No SMTP / no email verification; forgot-password UI removed
- `user_sessions` dropped (was dead code); Account Settings shows the current
  device client-side
