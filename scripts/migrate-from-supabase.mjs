/**
 * migrate-from-supabase.mjs
 * --------------------------------------------------------------------------
 * One-off ETL: loads JSON you exported from Supabase and pushes it into
 * PocketBase, remapping Supabase UUIDs -> new PocketBase record ids.
 *
 * PREREQUISITES
 *   1. Collections exist (run scripts/setup-pocketbase.mjs first).
 *   2. Export these from the Supabase SQL editor into ./migration-data/ as JSON:
 *        auth_users.json   (SELECT id, email, created_at FROM auth.users)
 *        profiles.json     (SELECT * FROM public.profiles)
 *        addresses.json, orders.json, order_tracking_steps.json,
 *        reviews.json, user_preferences.json, user_privacy_settings.json
 *      (each: SELECT * FROM public.<table>)
 *
 * RUN
 *   PB_URL=http://127.0.0.1:8090 \
 *   PB_ADMIN_EMAIL=you@example.com \
 *   PB_ADMIN_PASSWORD=your-admin-password \
 *   node scripts/migrate-from-supabase.mjs
 *
 * NOTES / LIMITATIONS
 *   - Supabase bcrypt password hashes cannot be imported. Each migrated user
 *     gets a random temp password, written to ./migrated-users.csv. With no SMTP
 *     configured, distribute these or reset passwords from the Admin UI.
 *   - PocketBase manages `created` itself, so migrated rows get "now" as created.
 *     Historical `order_date` and review timestamps from Supabase are preserved
 *     where the schema keeps them (order_date). Sort-by-created reflects import time.
 *   - The orders hook auto-creates 4 default tracking steps per order; this
 *     script then reconciles them against your exported order_tracking_steps.
 *   - Idempotent-ish: re-running reuses existing users (matched by email) and
 *     skips orders whose order_number already exists.
 * --------------------------------------------------------------------------
 */
import PocketBase from 'pocketbase';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const DATA_DIR = process.env.MIGRATION_DATA_DIR ?? 'migration-data';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD env vars.');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// Supports either per-table files (orders.json, ...) OR a single combined
// export (supabase-export.json) shaped { orders: [...], profiles: [...], ... }.
let combined = null;
const combinedPath = join(DATA_DIR, 'supabase-export.json');
if (existsSync(combinedPath)) {
  let raw = JSON.parse(readFileSync(combinedPath, 'utf8'));
  // Supabase's json_build_object output comes back as [{ export: {...} }].
  if (Array.isArray(raw)) raw = raw[0];
  if (raw && raw.export) raw = raw.export;
  combined = raw;
  console.log(`using combined export: ${combinedPath}\n`);
}

const readJson = (name) => {
  const key = name.replace(/\.json$/, '');
  if (combined) return combined[key] ?? [];
  const p = join(DATA_DIR, name);
  if (!existsSync(p)) {
    console.warn(`! ${p} not found — skipping`);
    return [];
  }
  return JSON.parse(readFileSync(p, 'utf8'));
};

const tempPassword = () => randomBytes(9).toString('base64url'); // ~12 chars
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userMap = new Map();  // supabase user uuid -> pb user id
const orderMap = new Map(); // supabase order uuid -> pb order id
const csvRows = [['email', 'temp_password']];

async function findByFilter(collection, filter) {
  try {
    return await pb.collection(collection).getFirstListItem(filter);
  } catch {
    return null;
  }
}

async function migrateUsers() {
  const authUsers = readJson('auth_users.json');
  const profiles = readJson('profiles.json');
  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));

  for (const u of authUsers) {
    if (!u.email) continue;
    const existing = await findByFilter('users', pb.filter('email = {:e}', { e: u.email }));
    if (existing) {
      userMap.set(u.id, existing.id);
      continue;
    }
    const prof = profileByUser.get(u.id) ?? {};
    const pw = tempPassword();
    try {
      const rec = await pb.collection('users').create({
        email: u.email,
        password: pw,
        passwordConfirm: pw,
        verified: true,
        emailVisibility: false,
        display_name: prof.display_name ?? '',
        phone: prof.phone ?? '',
      });
      userMap.set(u.id, rec.id);
      csvRows.push([u.email, pw]);
    } catch (err) {
      console.error(`  user ${u.email} failed:`, err?.response?.data ?? err?.message);
    }
  }
  console.log(`users: ${userMap.size} mapped`);
}

async function migrateSimple(collection, file) {
  const rows = readJson(file);
  let n = 0;
  for (const r of rows) {
    const userId = userMap.get(r.user_id);
    if (!userId) continue; // skip rows for users that weren't migrated
    const { id, user_id, created_at, updated_at, ...rest } = r;
    try {
      await pb.collection(collection).create({ ...rest, user: userId });
      n++;
    } catch (err) {
      console.error(`  ${collection} row failed:`, err?.response?.data ?? err?.message);
    }
  }
  console.log(`${collection}: ${n} created`);
}

async function migrateOrders() {
  const rows = readJson('orders.json');
  let n = 0;
  for (const r of rows) {
    const existing = await findByFilter('orders', pb.filter('order_number = {:o}', { o: r.order_number }));
    if (existing) {
      orderMap.set(r.id, existing.id);
      continue;
    }
    const { id, user_id, created_at, updated_at, ...rest } = r;
    try {
      const rec = await pb.collection('orders').create({
        ...rest,
        user: userMap.get(user_id) ?? '',
        order_date: r.order_date ?? r.created_at ?? new Date().toISOString(),
      });
      orderMap.set(r.id, rec.id);
      n++;
    } catch (err) {
      console.error(`  order ${r.order_number} failed:`, err?.response?.data ?? err?.message);
    }
  }
  console.log(`orders: ${n} created`);
}

async function reconcileTrackingSteps() {
  const rows = readJson('order_tracking_steps.json');
  if (rows.length === 0) return;

  // Group exported steps by old order id
  const byOrder = new Map();
  for (const s of rows) {
    if (!byOrder.has(s.order_id)) byOrder.set(s.order_id, []);
    byOrder.get(s.order_id).push(s);
  }

  let n = 0;
  for (const [oldOrderId, steps] of byOrder) {
    const newOrderId = orderMap.get(oldOrderId);
    if (!newOrderId) continue;

    // Wait for the hook-created default steps, then update them to match Supabase.
    let current = [];
    for (let attempt = 0; attempt < 5 && current.length === 0; attempt++) {
      current = await pb.collection('order_tracking_steps').getFullList({
        filter: pb.filter('order = {:o}', { o: newOrderId }),
      });
      if (current.length === 0) await sleep(300);
    }
    for (const src of steps) {
      const target = current.find((c) => c.title === src.title);
      if (!target) continue;
      try {
        await pb.collection('order_tracking_steps').update(target.id, {
          completed: !!src.completed,
          step_date: src.step_date ?? '',
        });
        n++;
      } catch (err) {
        console.error('  tracking step update failed:', err?.response?.data ?? err?.message);
      }
    }
  }
  console.log(`tracking steps: ${n} reconciled`);
}

async function migrateReviews() {
  const rows = readJson('reviews.json');
  let n = 0;
  for (const r of rows) {
    const userId = userMap.get(r.user_id);
    if (!userId) continue;
    try {
      await pb.collection('reviews').create({
        product_id: r.product_id,
        user: userId,
        rating: r.rating,
        comment: r.comment ?? '',
      });
      n++;
    } catch (err) {
      console.error('  review failed:', err?.response?.data ?? err?.message);
    }
  }
  console.log(`reviews: ${n} created`);
}

async function main() {
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('authenticated as superuser\n');

  await migrateUsers();
  await migrateSimple('addresses', 'addresses.json');
  await migrateSimple('user_preferences', 'user_preferences.json');
  await migrateSimple('user_privacy_settings', 'user_privacy_settings.json');
  await migrateOrders();
  await reconcileTrackingSteps();
  await migrateReviews();

  if (csvRows.length > 1) {
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    writeFileSync('migrated-users.csv', csv);
    console.log(`\nWrote migrated-users.csv (${csvRows.length - 1} users with temp passwords).`);
  }
  console.log('\nMigration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err?.response ?? err);
  process.exit(1);
});
