/**
 * setup-pocketbase.mjs
 * --------------------------------------------------------------------------
 * Creates all NovaMobiles collections in a PocketBase instance via the SDK,
 * resolving the built-in `users` collection id at runtime so relations link
 * correctly. Idempotent: existing collections are skipped.
 *
 * Run AFTER you have created the PocketBase superuser (admin) account.
 *
 *   npm install            # installs the `pocketbase` SDK
 *   PB_URL=http://127.0.0.1:8090 \
 *   PB_ADMIN_EMAIL=you@example.com \
 *   PB_ADMIN_PASSWORD=your-admin-password \
 *   node scripts/setup-pocketbase.mjs
 *
 * Targets PocketBase v0.23+ / SDK 0.27. PocketBase is pre-1.0; if a field shape
 * is rejected, adjust here and re-run (existing collections are left untouched).
 * The Admin UI (MIGRATION-PLAN-v2.md §2) remains the manual fallback.
 * --------------------------------------------------------------------------
 */
import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD env vars.');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// --- helpers --------------------------------------------------------------
const created = (name, type = 'autodate') =>
  type === 'autodate'
    ? { name, type: 'autodate', onCreate: true, onUpdate: false, hidden: false, presentable: false }
    : null;
const updated = () => ({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true, hidden: false, presentable: false });
const text = (name, required = false) => ({ name, type: 'text', required, presentable: false });
const bool = (name) => ({ name, type: 'bool' });
const date = (name) => ({ name, type: 'date' });
const number = (name, required = false, opts = {}) => ({ name, type: 'number', required, ...opts });
const relation = (name, collectionId, { required = false, cascadeDelete = false } = {}) => ({
  name, type: 'relation', required, collectionId, cascadeDelete, maxSelect: 1, minSelect: 0,
});

async function getCollection(name) {
  try {
    return await pb.collections.getOne(name);
  } catch {
    return null;
  }
}

async function ensureCollection(def) {
  const existing = await getCollection(def.name);
  if (existing) {
    console.log(`= ${def.name} already exists — skipping`);
    return existing;
  }
  const col = await pb.collections.create(def);
  console.log(`+ created ${def.name}`);
  return col;
}

// Adds a field to an already-existing collection if it isn't there yet.
// Needed for schema changes to collections ensureCollection() would otherwise
// skip entirely (e.g. adding `product_id` to a live `orders` collection that
// already has real order data — never recreated, only extended).
async function ensureField(collectionIdOrName, fieldDef) {
  const col = await pb.collections.getOne(collectionIdOrName);
  const fields = col.fields ?? col.schema ?? [];
  if (fields.some((f) => f.name === fieldDef.name)) {
    console.log(`= ${collectionIdOrName}.${fieldDef.name} already exists — skipping`);
    return col;
  }
  fields.push(fieldDef);
  const updatedCol = await pb.collections.update(col.id, { fields });
  console.log(`+ added field ${fieldDef.name} to ${collectionIdOrName}`);
  return updatedCol;
}

// Patches options (e.g. { required: false }) on an existing field of an
// existing collection, only if they differ. Used to self-heal installs that
// ran an earlier, since-corrected version of this script.
async function ensureFieldOptions(collectionIdOrName, fieldName, patch) {
  const col = await pb.collections.getOne(collectionIdOrName);
  const fields = col.fields ?? col.schema ?? [];
  const field = fields.find((f) => f.name === fieldName);
  if (!field) return col; // field doesn't exist yet — ensureField() handles that case
  const needsUpdate = Object.entries(patch).some(([k, v]) => field[k] !== v);
  if (!needsUpdate) return col;
  Object.assign(field, patch);
  const updatedCol = await pb.collections.update(col.id, { fields });
  console.log(`~ patched ${collectionIdOrName}.${fieldName}:`, patch);
  return updatedCol;
}

// Parses the static catalog product ids straight out of src/data/products.ts
// (kept as the single source of truth) rather than duplicating them by hand.
function readCatalogProductIds() {
  const productsPath = join(process.cwd(), 'src', 'data', 'products.ts');
  const src = readFileSync(productsPath, 'utf8');
  const ids = [...src.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

// Creates a product_stock row (stock = MAX_STOCK) for every catalog product
// that doesn't already have one. Safe to re-run — existing rows (and
// whatever stock level they've been decremented/restocked to) are untouched.
async function seedProductStock(maxStock) {
  const ids = readCatalogProductIds();
  let seeded = 0;
  for (const id of ids) {
    try {
      await pb.collection('product_stock').getFirstListItem(
        pb.filter('product_id = {:pid}', { pid: id })
      );
    } catch {
      await pb.collection('product_stock').create({ product_id: id, stock: maxStock });
      seeded++;
    }
  }
  console.log(`product_stock: seeded ${seeded} new row(s), ${ids.length - seeded} already existed (${ids.length} catalog products total)`);
}

// --- main -----------------------------------------------------------------
async function main() {
  // PocketBase v0.23+ superuser auth (was pb.admins.* before).
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('authenticated as superuser');

  // 1) Extend the built-in users collection: add display_name + phone, and set
  //    the password minimum length to 6 (PocketBase defaults to 8).
  const users = await pb.collections.getOne('users');
  const fields = users.fields ?? users.schema ?? [];
  const hasField = (n) => fields.some((f) => f.name === n);
  if (!hasField('display_name')) fields.push(text('display_name'));
  if (!hasField('phone')) fields.push(text('phone'));
  const pwField = fields.find((f) => f.type === 'password');
  if (pwField) pwField.min = 6;
  await pb.collections.update(users.id, { fields });
  console.log('= users extended (display_name, phone, password min 6)');

  const usersId = users.id;
  const authedOwner = '@request.auth.id != ""';
  const ownsViaUser = '@request.auth.id != "" && user = @request.auth.id';

  // 2) orders
  const orders = await ensureCollection({
    name: 'orders',
    type: 'base',
    fields: [
      text('order_number', true), text('product_name', true), text('product_color'),
      text('product_storage'), number('quantity', true), text('price', true),
      text('customer_name', true), text('customer_phone', true), text('customer_email', true),
      text('delivery_address', true), text('delivery_city', true), text('delivery_state', true),
      text('delivery_pincode', true), text('payment_method', true), text('status', true),
      date('order_date'), relation('user', usersId, { required: false }),
      // Static catalog product id (e.g. '1'), used by pb_hooks/main.pb.js to
      // validate/decrement stock. Optional: absent on legacy/migrated orders.
      text('product_id'),
      created('created'), updated(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_orders_order_number ON orders (order_number)'],
    // A logged-in user sees orders linked to them OR placed with their email.
    listRule: '@request.auth.id != "" && (user = @request.auth.id || customer_email = @request.auth.email)',
    viewRule: '@request.auth.id != "" && (user = @request.auth.id || customer_email = @request.auth.email)',
    createRule: authedOwner,
    updateRule: null,
    deleteRule: null,
  });
  // Covers the case where `orders` already existed (pre-dating this field)
  // and ensureCollection() above skipped it without adding product_id.
  await ensureField(orders.id, text('product_id'));

  // 3) order_tracking_steps (created by the pb_hooks hook, in admin context)
  await ensureCollection({
    name: 'order_tracking_steps',
    type: 'base',
    fields: [
      relation('order', orders.id, { required: true, cascadeDelete: true }),
      text('title', true), bool('completed'), date('step_date'), created('created'),
    ],
    listRule: '@request.auth.id != "" && (order.user = @request.auth.id || order.customer_email = @request.auth.email)',
    viewRule: '@request.auth.id != "" && (order.user = @request.auth.id || order.customer_email = @request.auth.email)',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  // 4) addresses
  await ensureCollection({
    name: 'addresses',
    type: 'base',
    fields: [
      relation('user', usersId, { required: true }), text('type', true), text('name', true),
      text('address', true), text('city', true), text('state', true), text('pincode', true),
      text('phone', true), bool('is_default'), created('created'), updated(),
    ],
    listRule: ownsViaUser, viewRule: ownsViaUser,
    createRule: authedOwner, updateRule: ownsViaUser, deleteRule: ownsViaUser,
  });

  // 5) reviews
  const reviews = await ensureCollection({
    name: 'reviews',
    type: 'base',
    fields: [
      text('product_id', true), relation('user', usersId, { required: true }),
      number('rating', true, { min: 1, max: 5 }), text('comment'),
      created('created'), updated(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_reviews_product_user ON reviews (product_id, user)'],
    listRule: '@request.auth.id = user',
    viewRule: '@request.auth.id = user',
    createRule: authedOwner,
    updateRule: '@request.auth.id = user',
    deleteRule: '@request.auth.id = user',
  });

  // 6) public_reviews — read-only VIEW that omits `user`
  await ensureCollection({
    name: 'public_reviews',
    type: 'view',
    viewQuery: 'SELECT id, product_id, rating, comment, created, updated FROM reviews',
    listRule: '', // empty string = public read
    viewRule: '',
  });

  // 7) user_preferences
  await ensureCollection({
    name: 'user_preferences',
    type: 'base',
    fields: [
      relation('user', usersId, { required: true }),
      bool('email_order_updates'), bool('email_promotions'), bool('email_newsletter'),
      text('theme'), text('language'), text('region'), created('created'), updated(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_prefs_user ON user_preferences (user)'],
    listRule: ownsViaUser, viewRule: ownsViaUser,
    createRule: authedOwner, updateRule: ownsViaUser, deleteRule: ownsViaUser,
  });

  // 8) user_privacy_settings
  await ensureCollection({
    name: 'user_privacy_settings',
    type: 'base',
    fields: [
      relation('user', usersId, { required: true }),
      bool('marketing_consent'), bool('data_sharing'), bool('analytics_consent'),
      created('created'), updated(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_privacy_user ON user_privacy_settings (user)'],
    listRule: ownsViaUser, viewRule: ownsViaUser,
    createRule: authedOwner, updateRule: ownsViaUser, deleteRule: ownsViaUser,
  });

  // 9) product_stock — live stock levels for the static catalog. Public read
  //    (so anonymous visitors see stock badges); writes are locked down to
  //    the pb_hooks server-side hook only (no client can create/update/delete).
  const MAX_STOCK = 5;
  await ensureCollection({
    name: 'product_stock',
    type: 'base',
    fields: [
      text('product_id', true),
      // NOT required: PocketBase treats 0 as "blank" for a required number
      // field ("stock: cannot be blank" even when explicitly set to 0), which
      // would wrongly reject the perfectly valid "out of stock" state. min/max
      // already fully constrain the value; every write always sets one anyway.
      number('stock', false, { min: 0, max: MAX_STOCK }),
      created('created'), updated(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_product_stock_product_id ON product_stock (product_id)'],
    listRule: '', // empty string = public read
    viewRule: '',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  // Self-heal installs that ran an earlier version of this script where
  // `stock` was (wrongly) required.
  await ensureFieldOptions('product_stock', 'stock', { required: false });
  await seedProductStock(MAX_STOCK);

  console.log('\nDone. Verify collections + rules in the PocketBase Admin UI.');
}

main().catch((err) => {
  console.error('Setup failed:', err?.response ?? err);
  process.exit(1);
});
