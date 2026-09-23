import { useCallback, useEffect, useState } from 'react';
import { pb } from '@/integrations/pocketbase/client';

/**
 * Live stock level for a single catalog product id, backed by PocketBase's
 * `product_stock` collection. `stock === null` while loading, or if no
 * matching row exists (treated as out of stock — see src/lib/stock.ts).
 */
export const useProductStock = (productId: string) => {
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    if (!productId) {
      setStock(null);
      setLoading(false);
      return;
    }
    try {
      const record = await pb.collection('product_stock').getFirstListItem(
        pb.filter('product_id = {:pid}', { pid: productId })
      );
      setStock(record.stock as number);
    } catch {
      // No stock row for this product — treat as out of stock.
      setStock(0);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    fetchStock();
  }, [fetchStock]);

  return { stock, loading, refetch: fetchStock };
};
