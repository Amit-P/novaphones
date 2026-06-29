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

  console.log('\nDone. Verify collections + rules in the PocketBase Admin UI.');
}

main().catch((err) => {
  console.error('Setup failed:', err?.response ?? err);
  process.exit(1);
});
