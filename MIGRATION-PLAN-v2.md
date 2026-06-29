# NovaMobiles — Migration Plan v2 (corrected & code-grounded)
## Lovable + Supabase Cloud → Claude Code + PocketBase + Cloudflare Pages

> Supersedes `novaphones-free-migration-plan.md`. Every step below was checked against the
> actual source now at `D:\novaphones\`. Corrections vs the original plan are flagged **[FIX]**.
> Decisions still needed from you are flagged **[DECIDE]**.
> Budget target: **₹0 / $0** (free tiers only).

---

## Decisions locked (2026-06-28)

1. **Profile strategy → Option A.** Add `display_name` + `phone` to PocketBase `users`; **no separate `profiles` collection**, no profile-creation hook. `Profile.tsx`/`AccountSettings.tsx` read/write the users record.
2. **Guest checkout → removed.** `orders` create rule = `@request.auth.id != ""`. `Checkout.tsx` requires an authenticated user (no `user_id: null` path).
3. **Auth email → no SMTP, no verification.** `users` collection: email verification NOT required; auto-login after signup. Password-reset-by-email is disabled (admin can set passwords). `Auth.tsx` "forgot password" UI is removed/disabled.
4. **`user_sessions` → dropped.** Dead feature (never written to). Collection not created; the "Active Sessions" card becomes a single client-side "current device" row from `navigator.userAgent`.
5. **Data → migrate from Supabase.** See expanded §8. ⚠️ Constraint: Supabase user UUIDs cannot be reused as PocketBase IDs, so a UUID→new-ID remap is required and migrated users get a temp password (no SMTP to self-reset).
6. **PocketBase version → current stable** (pin the exact tag at download time; must be ≥ 0.23 for the hook API used here).

---

## 0. What changed from the original plan (read this first)

| # | Original plan said | Reality / correction |
|---|---|---|
| 1 | PocketBase hook uses `onRecordAfterCreateRequest` + `$app.dao().saveRecord(...)` | **[FIX]** Removed in PocketBase v0.23. Use `onRecordAfterCreateSuccess`, `e.app.save(record)`, and call `e.next()`. See §5. |
| 2 | `pb.authStore.model` | **[FIX]** Renamed to `pb.authStore.record` in v0.23+ (`.model` is deprecated). |
| 3 | Dev server port 5173 (in CLAUDE.md) | **[FIX]** This project runs on **8080** (`vite.config.ts`). |
| 4 | Remove only `lovable-tagger` from package.json | **[FIX]** Also remove the `componentTagger()` plugin + import in `vite.config.ts`. |
| 5 | Password reset = `supabase.auth.updateUser({password})` after a `type=recovery` hash | **[FIX]** PocketBase uses a token-based flow: `requestPasswordReset(email)` → email link with token → `confirmPasswordReset(token, pw, pwConfirm)`. The recovery-hash logic in `Auth.tsx` must be reworked, not mapped 1:1. See §4. |
| 6 | Reviews public read via `public_reviews` view | **[FIX]** PocketBase has no column-level security and the client `fields` param is **not** a security boundary. Recreate `public_reviews` as a **PocketBase view collection** (read-only SQL) that omits `user`. See §3. |
| 7 | Change password = `auth.updateUser({password})` | **[FIX]** PocketBase requires `oldPassword` to change a password: `pb.collection('users').update(id, {oldPassword, password, passwordConfirm})`. `AccountSettings.tsx` already collects the current password — we can finally use it. |
| 8 | PocketBase version 0.23.0 | **[FIX]** Pin to the current stable release at build time (≥ 0.23 for the new hook API). PocketBase is pre-1.0; verify snippets against the exact version you download. |

**Also discovered (not in original plan):**
- `user_sessions` is **read/deleted but never written** anywhere in the code. The "Active Sessions" list is always empty. We'll still create the collection for parity, but no code inserts into it. **[DECIDE]** keep as-is or drop.
- Guest checkout exists: `Checkout.tsx` inserts orders with `user_id: user?.id || null`. Supabase RLS later blocked anon inserts, so guest checkout is effectively broken on the live site today. **[DECIDE]** restore guest checkout (open create rule) or require login.
- `TrackOrders` and `Profile` match orders by **either** `user_id` OR `customer_email` (`.or(...)`). We must preserve that OR filter in PocketBase.

---

## 1. Confirmed stack & data model

**Frontend (unchanged):** React 18, Vite 5, TS 5.5, Tailwind 3, shadcn/ui, react-router-dom v6, react-hook-form + zod, @tanstack/react-query.

**Files that touch Supabase (11 + client):** `AuthContext.tsx`, `Auth.tsx`, `Checkout.tsx`, `TrackOrders.tsx`, `AccountSettings.tsx`, `Profile.tsx`, `ProductDetail.tsx`, `ReviewForm.tsx`, `ReviewsList.tsx`, `useProductRatings.ts`, `integrations/supabase/client.ts`.

**No realtime, no Edge Functions, products are static** (`src/data/products.ts`), Cart/Wishlist are in-memory React reducers. None of that changes.

---

## 2. PocketBase collections (corrected to match the real SQL migrations)

Create these in the PocketBase Admin UI (`/_/`). Types per the actual columns in `supabase/migrations/`.

### `users` (PocketBase built-in auth collection)
PocketBase ships a `users` auth collection (id, email, password, name, avatar, verified).
**[DECIDE] Profile strategy:**
- **Option A (recommended, simpler):** add `phone` + `display_name` fields directly to `users`, and **drop the separate `profiles` collection**. Fewer collections, no auto-create hook needed. Requires editing `Profile.tsx`/`AccountSettings.tsx` to read/write the users record instead of `profiles`.
- **Option B (closest to current code):** keep a separate `profiles` collection (relation → users) and a hook that auto-creates a profile row on signup (mirrors the Supabase `handle_new_user` trigger).

### `orders` (Base)
`user` (relation→users, **optional** for guest checkout), `order_number` (text, required, unique),
`product_name` (text, req), `product_color` (text), `product_storage` (text),
`quantity` (number, req, default 1), `price` (text, req),
`customer_name` (text, req), `customer_phone` (text, req), `customer_email` (text, req),
`delivery_address` (text, req), `delivery_city` (text, req), `delivery_state` (text, req), `delivery_pincode` (text, req),
`payment_method` (text, req, default `Cash on Delivery`), `status` (text, req, default `confirmed`),
`order_date` (date, default = now).
*(PocketBase auto-adds `id`, `created`, `updated`. Code that reads `created_at` maps to `created`.)*

### `order_tracking_steps` (Base)
`order` (relation→orders, req, cascade delete), `title` (text, req), `completed` (bool, default false), `step_date` (date, nullable).
*(Code currently groups by `order_id` → change to `order`.)*

### `addresses` (Base)
`user` (relation→users, req), `type` (text, req), `name` (text, req), `address` (text, req), `city` (text, req), `state` (text, req), `pincode` (text, req), `phone` (text, req), `is_default` (bool, default false).

### `reviews` (Base)
`product_id` (text, req), `user` (relation→users, req), `rating` (number, req, min 1 max 5), `comment` (text).
Add a **unique index on (`product_id`, `user`)** (mirrors the Supabase `UNIQUE(product_id, user_id)`).

### `public_reviews` (**View** collection) **[FIX]**
Read-only view, SQL: `SELECT id, product_id, rating, comment, created, updated FROM reviews`.
This is what anon/`ReviewsList`/`useProductRatings` read, so `user` is never exposed.

### `user_preferences` (Base)
`user` (relation→users, req, unique), `email_order_updates` (bool, default true), `email_promotions` (bool, default true), `email_newsletter` (bool, default false), `theme` (text, default `system`), `language` (text, default `en`), `region` (text, default `IN`).

### `user_privacy_settings` (Base)
`user` (relation→users, req, unique), `marketing_consent` (bool, default false), `data_sharing` (bool, default false), `analytics_consent` (bool, default true).

### `user_sessions` (Base) — parity only, nothing writes to it
`user` (relation→users, req), `device_info` (text), `browser_info` (text), `ip_address` (text), `last_active` (date).

### API rules (PocketBase equivalent of RLS), matching the final Supabase policies
- `orders`: List/View `@request.auth.id != "" && user = @request.auth.id` · Create **[DECIDE]** `@request.auth.id != ""` (login required) **or** `true` (restore guest checkout).
- `order_tracking_steps`: List/View `@request.auth.id != "" && order.user = @request.auth.id` · Create/Update via hook (admin context) — leave API create/update rules empty (locked).
- `reviews`: List/View `@request.auth.id = user` (owners only, direct) · Create/Update/Delete `@request.auth.id = user`.
- `public_reviews` (view): List/View `true` (public read; no `user` column exposed).
- `addresses`, `user_preferences`, `user_privacy_settings`, `user_sessions`: all rules `@request.auth.id = user`.
- `profiles` (only if Option B): List/View/Create/Update `@request.auth.id = user`.

---

## 3. The new client + env

**Create `src/integrations/pocketbase/client.ts`:**
```ts
import PocketBase from 'pocketbase';
const url = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090';
export const pb = new PocketBase(url);
pb.autoCancellation(false); // we fire overlapping requests in some pages
```
**`.env`:** `VITE_POCKETBASE_URL=http://127.0.0.1:8090` (prod value set later in Cloudflare).
**Delete:** `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts`.
**Types:** generate with `npx pocketbase-typegen --url http://127.0.0.1:8090 --email <admin> --password <pw> --out src/integrations/pocketbase/types.ts`.

---

## 4. Per-file migration map (grounded in the actual code)

| File | Supabase now | PocketBase after |
|---|---|---|
| `AuthContext.tsx` | `onAuthStateChange` + `getSession()`; `signOut()` | `pb.authStore.onChange((token, record) => { setUser(record); setLoading(false); }, true)` (the `true` fires immediately, replacing `getSession`). `signOut` → `pb.authStore.clear()`. Drop `Session` type; expose `user = pb.authStore.record`. |
| `Auth.tsx` | `signUp`, `signInWithPassword`, `resetPasswordForEmail`, recovery-hash + `updateUser({password})` | `pb.collection('users').create({email,password,passwordConfirm,name})`; `authWithPassword(email,password)`; `requestPasswordReset(email)`. **[FIX]** Rework reset: read `token` from URL query and call `confirmPasswordReset(token, pw, pwConfirm)` instead of the `type=recovery` hash flow. **[DECIDE]** email verification (see §6). |
| `Checkout.tsx` | `from('addresses').select().eq('user_id').order('is_default')`; loop `from('orders').insert({user_id,...})` | `pb.collection('addresses').getFullList({filter:'user="ID"', sort:'-is_default'})`; loop `pb.collection('orders').create({user: uid ?? '', ...})`. Tracking steps auto-created by hook (§5), so the loop no longer creates them. |
| `TrackOrders.tsx` | orders `.or(user_id.eq.X,customer_email.eq.Y)`; all `order_tracking_steps`; group by `order_id` | `pb.collection('orders').getFullList({filter:'user="X" || customer_email="Y"', sort:'-created'})`; fetch steps `getFullList({filter: <order ids>, sort:'created'})`; group by `step.order`. Map `created_at`→`created`. |
| `AccountSettings.tsx` | prefs/privacy `.eq('user_id').maybeSingle()` then `.update().eq('user_id')`; `auth.updateUser({password})`; `from('user_sessions').delete()`; 5× export selects | `getFirstListItem('user="ID"')` (catch 404 → `create({user:ID})`); save via `update(recordId, data)` (store record id on load); **[FIX]** change pw → `pb.collection('users').update(uid,{oldPassword,password,passwordConfirm})`; `pb.collection('user_sessions').delete(id)`; export = 5 equivalent `getFullList`/`getFirstListItem`. |
| `Profile.tsx` | profile `.single()`; addresses; recent orders `.or(...).limit(5)`; save profile/address | profile via users record (Option A) or `getFirstListItem`; `addresses.getFullList`; orders `getList(1,5,{filter:'user="X" || customer_email="Y"', sort:'-order_date'})`; save via `update`/`create`, `user_id`→`user`. |
| `ProductDetail.tsx` | review `.eq(product_id).eq(user_id).single()` | `pb.collection('reviews').getFirstListItem('product_id="P" && user="U"')` (catch 404 → null). |
| `ReviewForm.tsx` | insert/update `reviews`, `user_id` | `update(existingReview.id,{rating,comment})` or `create({product_id,user:uid,rating,comment})`. |
| `ReviewsList.tsx` | `from('public_reviews').eq(product_id)` | `pb.collection('public_reviews').getFullList({filter:'product_id="P"', sort:'-created'})`. |
| `useProductRatings.ts` | `reviews.select('product_id,rating').in('product_id',ids)` and single | `public_reviews.getFullList({filter:'product_id="a" || product_id="b"', fields:'product_id,rating'})`; single via `filter:'product_id="P"'`. |
| `.env` / `package.json` / `vite.config.ts` | supabase + lovable | remove `@supabase/supabase-js`, `lovable-tagger`; add `pocketbase` (+ `pocketbase-typegen` dev); remove `componentTagger()` from vite config. |

---

## 5. PocketBase hooks (current v0.23+ API) **[FIX]**

`pb_hooks/main.pb.js`:
```js
// Auto-create the 4 tracking steps after an order is created
onRecordAfterCreateSuccess((e) => {
  const col = e.app.findCollectionByNameOrId("order_tracking_steps");
  const steps = [
    { title: "Order Confirmed", completed: true,  step_date: e.record.get("created") },
    { title: "Processing",      completed: false, step_date: "" },
    { title: "Shipped",         completed: false, step_date: "" },
    { title: "Delivered",       completed: false, step_date: "" },
  ];
  for (const s of steps) {
    const r = new Record(col);
    r.set("order", e.record.id);
    r.set("title", s.title);
    r.set("completed", s.completed);
    r.set("step_date", s.step_date);
    e.app.save(r);
  }
  e.next();
}, "orders");

// Option B only: auto-create a profile row on signup
// onRecordAfterCreateSuccess((e) => {
//   const col = e.app.findCollectionByNameOrId("profiles");
//   const r = new Record(col);
//   r.set("user", e.record.id);
//   r.set("display_name", e.record.get("name"));
//   e.app.save(r);
//   e.next();
// }, "users");
```
> Verify against the docs for your downloaded version: https://pocketbase.io/docs/js-event-hooks/ and https://pocketbase.io/docs/js-records/

---

## 6. Auth/email decision **[DECIDE]**

PocketBase email confirmation & password-reset emails require SMTP configured in Admin → Settings → Mail. For a hobby project:
- **Option 1 (simplest):** disable "email verification required" on the `users` collection; auto-login after signup. No SMTP needed. Password reset disabled (or admin-set).
- **Option 2:** configure a free SMTP relay (e.g. Brevo/Resend free tier) so verification + reset emails work like today.

This affects `Auth.tsx` (whether to call `requestVerification`, and the whole reset flow).

---

## 7. Deploy (free) — *steps only you can do; I can prep the files*

I will create: `Dockerfile` (PocketBase, current version, `serve --http=0.0.0.0:8090`), and document env vars.
You will: create GitHub/Cloudflare/Render accounts, push the repo, deploy PocketBase to Render (attach a free 1 GB Disk at `/pb/pb_data`, set `PB_ENCRYPTION_KEY`), recreate the collections (or import schema JSON I generate), then deploy the frontend to Cloudflare Pages (Vite preset, build `npm run build`, output `dist`, env `VITE_POCKETBASE_URL`).
Render free tier sleeps after 15 min (~30s cold start). Fly.io free tier is the always-on alternative.

---

## 8. Data migration (DECIDED: migrate from Supabase)

### The core constraint
- Supabase `auth.users` IDs are **UUIDs** (e.g. `3f9c...-...`, 36 chars with dashes). PocketBase record IDs must match `^[a-z0-9]{15,}$` — UUIDs are **invalid**. So we cannot reuse the IDs; every foreign key (`user_id`, `order_id`) must be **remapped** during import.
- PocketBase **cannot import Supabase bcrypt password hashes**. With "no SMTP" (decision #3), users can't self-reset. So migrated users are created with a **generated temp password**, written to a local `migrated-users.csv` for you to distribute (or reset later from the Admin UI).

### What YOU export from Supabase (no secrets shared with me)
Run these in the **Supabase SQL editor** and download each result as JSON/CSV into `D:\novaphones\migration-data\`:
- `auth_users.json` → `SELECT id, email, created_at FROM auth.users;`
- `profiles.json` → `SELECT * FROM public.profiles;` (for display_name/phone)
- `addresses.json`, `orders.json`, `order_tracking_steps.json`, `reviews.json`, `user_preferences.json`, `user_privacy_settings.json` → `SELECT * FROM public.<table>;`
> Do **not** paste DB passwords or connection strings into this chat — the SQL-editor export needs none.

### What I build: `scripts/migrate-from-supabase.mjs` (Node ETL via PocketBase SDK)
Order of operations (idempotent, re-runnable):
1. **Users** — for each `auth.users` row: create a PocketBase `users` record with `email`, `verified=true`, `name`/`display_name`+`phone` from `profiles`, and a random temp password. Build `map.users[uuid] = newId`. Append email+temp-pw to `migrated-users.csv`.
2. **Addresses / user_preferences / user_privacy_settings** — import with `user` = `map.users[old user_id]`. Skip rows whose user wasn't migrated.
3. **Orders** — **temporarily disable the tracking-steps hook** (so it doesn't double-create steps), import with `user` = mapped id (or leave empty + rely on `customer_email`), preserve `order_number`, `order_date`, `status`. Build `map.orders[old id] = newId`.
4. **order_tracking_steps** — import with `order` = `map.orders[old order_id]`, preserving `completed`/`step_date`. Re-enable the hook afterward.
5. **Reviews** — import with `user` = mapped id, preserving `product_id`/`rating`/`comment`/`created`. (Unique index on product_id+user still holds.)

### Notes
- Orders still resolve in `TrackOrders`/`Profile` via the `customer_email` OR-filter even if a user re-registers later, so order history is robust.
- This script needs the PocketBase instance running with admin creds (passed via env vars at runtime — not committed).
- **You decide** whether to run this against your **local** PocketBase first (recommended dry run) before the hosted Render instance.

---

## 9. Division of labour

**I (Claude Code) can do, in-place in `D:\novaphones\`:**
- Remove Lovable (package.json + vite.config.ts), swap SDK in package.json
- Create the PocketBase client, delete Supabase integration files
- Rewrite all 11 code files per §4
- Write `pb_hooks/main.pb.js`, `Dockerfile`, `CLAUDE.md`, updated `.env`
- Generate a PocketBase schema JSON (importable) for all collections
- Run `npm run lint` / `npx tsc --noEmit` after each file

**Only you can do (outside this environment):**
- Create GitHub/Cloudflare/Render accounts
- Download & run the PocketBase binary; create the admin account & collections
- Configure SMTP (if Option 2), deploy, set production env vars, decommission Supabase

---

## 10. Open decisions to confirm before I write code
1. **Profile strategy:** Option A (fold into `users`, drop `profiles`) or Option B (keep `profiles` + hook)?
2. **Guest checkout:** restore (open `orders` create rule) or require login?
3. **Auth email:** Option 1 (no SMTP, no verification) or Option 2 (SMTP for verify + reset)?
4. **`user_sessions`:** keep collection for parity or drop the dead feature?
5. **Data migration:** migrate existing Supabase data, or start fresh?
6. **PocketBase version** to pin (I'll use the current stable unless you have a preference).
