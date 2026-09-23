import { Badge } from '@/components/ui/badge';
import { getStockStatus, type StockStatus } from '@/lib/stock';
import { cn } from '@/lib/utils';

interface StockBadgeProps {
  stock: number | null;
  loading?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<StockStatus, string> = {
  available: 'bg-success text-success-foreground',
  low: 'bg-amber-100 text-amber-800 border border-amber-200',
  out: 'bg-destructive text-destructive-foreground',
};

/** Shared "Available" / "Only N units left" / "Out of stock" capsule. */
export const StockBadge = ({ stock, loading, className }: StockBadgeProps) => {
  // Render nothing while the first fetch is in flight, rather than flashing
  // "Out of stock" before we actually know the answer.
  if (loading) return null;

  const { status, label } = getStockStatus(stock);
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], className)}>
      {label}
    </Badge>
  );
};
