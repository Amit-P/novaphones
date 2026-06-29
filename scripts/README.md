# NovaMobiles — backend setup & migration scripts

Run these against your PocketBase instance (local first, then the hosted one).

## Order of operations

1. **Start PocketBase** and create the superuser (admin) account at `/_/`.
   ```sh
   ./pocketbase serve          # http://127.0.0.1:8090/_/
   ```
2. **Create the collections** (idempotent):
   ```sh
   npm install
   PB_URL=http://127.0.0.1:8090 \
   PB_ADMIN_EMAIL=you@example.com \
   PB_ADMIN_PASSWORD=*** \
   node scripts/setup-pocketbase.mjs
   ```
   Then open the Admin UI and sanity-check the collections, fields, and API rules
   against `MIGRATION-PLAN-v2.md` §2.
3. **(Optional) Migrate Supabase data.** Export the 8 tables from the Supabase SQL
   editor into `./migration-data/` (see `migrate-from-supabase.mjs` header for the
   exact queries), then:
   ```sh
   PB_URL=http://127.0.0.1:8090 \
   PB_ADMIN_EMAIL=you@example.com \
   PB_ADMIN_PASSWORD=*** \
   node scripts/migrate-from-supabase.mjs
   ```
   This writes `migrated-users.csv` with temp passwords (gitignored — keep it safe).

## Notes
- `pb_hooks/main.pb.js` (auto-creates order tracking steps) is loaded by the
  PocketBase binary automatically when placed next to it / in the working dir, and
  is baked into the Docker image via the `Dockerfile`.
- Both scripts target PocketBase v0.23+ / SDK 0.27. PocketBase is pre-1.0; if a
  field shape or API rule is rejected, adjust and re-run — existing data is preserved.
- Never commit `migration-data/` or `migrated-users.csv` (already in `.gitignore`).
