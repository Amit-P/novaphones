// Stock-status thresholds and labels shared by every stock badge / purchase
// guard in the app. Stock is tracked server-side in PocketBase (see
// `product_stock` collection), keyed by the static catalog product id.
export const MAX_STOCK = 5;
export const LOW_STOCK_THRESHOLD = 2;

export type StockStatus = 'available' | 'low' | 'out';

export interface StockInfo {
  status: StockStatus;
  label: string;
}

/**
 * `stock === null` means "unknown" (no product_stock row exists yet, or the
 * fetch failed). We deliberately treat unknown the same as 0 — out of stock —
 * rather than silently letting people buy an item nobody has confirmed is
 * actually available.
 */
export function getStockStatus(stock: number | null): StockInfo {
  if (stock === null || stock <= 0) {
    return { status: 'out', label: 'Out of stock' };
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return { status: 'low', label: `Only ${stock} unit${stock === 1 ? '' : 's'} left` };
  }
  return { status: 'available', label: 'Available' };
}
