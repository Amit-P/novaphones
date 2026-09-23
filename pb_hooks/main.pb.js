/// <reference path="../pb_data/types.d.ts" />

// Reject an order request up-front if there isn't enough stock for the
// product being purchased. Runs BEFORE the record is validated/persisted, so
// an insufficient-stock order never gets created in the first place.
//
// `product_id` is only set by the frontend Checkout flow for new orders — it
// is absent on legacy/migrated orders, which skip this check entirely (there
// is nothing to validate against for historical data).
onRecordCreateRequest((e) => {
  const productId = e.record.get("product_id");

  if (productId) {
    const qty = e.record.get("quantity") || 1;
    let available = 0;
    try {
      const stockRec = e.app.findFirstRecordByFilter(
        "product_stock",
        "product_id = {:pid}",
        { pid: productId }
      );
      available = stockRec.get("stock");
    } catch (err) {
      // No stock row for this product — treat as out of stock, matching the
      // frontend's default (src/lib/stock.ts).
      available = 0;
    }

    if (qty > available) {
      throw new BadRequestError(
        available > 0
          ? `Only ${available} left in stock for this product.`
          : "This product is currently out of stock."
      );
    }
  }

  e.next();
}, "orders");

// Auto-create the 4 order-tracking steps whenever an order is created, and
// decrement stock for the purchased product (floored at 0). Both run only
// after the order has actually been committed, so a save failure elsewhere
// never causes stock to be decremented without a matching order.
// Replaces the Supabase `create_default_tracking_steps` trigger.
// PocketBase v0.23+ API: onRecordAfterCreateSuccess + e.app.save + e.next().
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

  const productId = e.record.get("product_id");
  if (productId) {
    try {
      const stockRec = e.app.findFirstRecordByFilter(
        "product_stock",
        "product_id = {:pid}",
        { pid: productId }
      );
      const qty = e.record.get("quantity") || 1;
      const remaining = Math.max(0, stockRec.get("stock") - qty);
      stockRec.set("stock", remaining);
      e.app.save(stockRec);
    } catch (err) {
      // Either there's no stock row for this product (nothing to decrement,
      // expected for legacy data) or the save genuinely failed — log the
      // latter server-side so it's diagnosable rather than silently wrong,
      // since this hook can't surface an error back to the client at this
      // point (the order was already committed).
      console.error("[stock decrement] failed for product", productId, ":", err);
    }
  }

  e.next();
}, "orders");
