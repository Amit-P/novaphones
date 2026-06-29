/// <reference path="../pb_data/types.d.ts" />

// Auto-create the 4 order-tracking steps whenever an order is created.
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

  e.next();
}, "orders");
