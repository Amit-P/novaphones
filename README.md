# NovaMobiles

E-commerce SPA for buying smartphones with Cash on Delivery (and demo card
checkout). Migrated from Lovable + Supabase to a self-hostable, open-source stack.

## Stack
- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + shadcn/ui
- **Routing:** react-router-dom v6 (SPA)
- **Server state:** @tanstack/react-query
- **Backend:** [PocketBase](https://pocketbase.io) (auth + collections + REST + admin UI)
- **Hosting (target):** Cloudflare Pages (frontend) + Render/Fly.io (PocketBase)

## Local development

Prerequisites: Node.js & npm, and the PocketBase binary.

```sh
# 1. Install frontend deps
npm install

# 2. Start PocketBase (in a separate terminal, from where the binary lives)
./pocketbase serve         # admin UI: http://127.0.0.1:8090/_/

# 3. Start the frontend dev server (port 8080)
npm run dev
```

Configure the backend URL in `.env`:

```
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

## Scripts
- `npm run dev` — dev server on port 8080
- `npm run build` — production build to `/dist`
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check

## Documentation
- `CLAUDE.md` — working notes & conventions for Claude Code
- `MIGRATION-PLAN-v2.md` — the Supabase → PocketBase migration plan and decisions
