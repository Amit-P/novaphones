import { Package, CheckCircle, Clock, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Fragment, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecordModel } from 'pocketbase';
import { pb } from '@/integrations/pocketbase/client';
import { products } from '@/data/products';
import { useAuth } from '@/contexts/AuthContext';

interface Order {
  id: string;
  order_number: string;
  product_name: string;
  product_color: string;
  product_storage: string;
  quantity: number;
  price: string;
  customer_name: string;
  status: string;
  order_date: string;
  created_at: string;
  payment_method: string;
}

interface TrackingStep {
  title: string;
  completed: boolean;
  step_date: string | null;
}

const TrackOrders = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [trackingSteps, setTrackingSteps] = useState<Record<string, TrackingStep[]>>({});
  const [loading, setLoading] = useState(true);

  // Table UX state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Reset to the first page whenever the search or page size changes.
  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [searchQuery, rowsPerPage]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch orders for the authenticated user only (by user relation OR the
      // email used at checkout, matching the previous Supabase OR filter).
      const ordersData = await pb.collection('orders').getFullList({
        filter: pb.filter('user = {:uid} || customer_email = {:email}', {
          uid: user.id,
          email: user.email,
        }),
        sort: '-created',
      });

      setOrders(ordersData as unknown as Order[]);

      // Fetch tracking steps for just this user's orders
      const orderIds = ordersData.map((o) => o.id);
      let stepsData: RecordModel[] = [];
      if (orderIds.length > 0) {
        stepsData = await pb.collection('order_tracking_steps').getFullList({
          filter: orderIds.map((id) => `order = "${id}"`).join(' || '),
          sort: 'created',
        });
      }

      // Group tracking steps by the order relation id
      const stepsGrouped = stepsData.reduce((acc, step) => {
        if (!acc[step.order]) {
          acc[step.order] = [];
        }
        acc[step.order].push({
          title: step.title,
          completed: step.completed,
          step_date: step.step_date ? new Date(step.step_date).toLocaleDateString('en-IN') : null
        });
        return acc;
      }, {} as Record<string, TrackingStep[]>);

      setTrackingSteps(stepsGrouped);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination (client-side)
  const total = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * rowsPerPage;
  const pageOrders = filteredOrders.slice(start, start + rowsPerPage);
  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + rowsPerPage, total);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const getStatusBadge = (status: string) => {
    const variants = {
      delivered: 'bg-green-100 text-green-800 border-green-200',
      shipped: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.processing}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);

  const computeOrderPrice = (order: Order) => {
    // Prefer the price captured at order time — it's authoritative and works for
    // older orders whose products are no longer in the static catalog.
    if (order.price) return order.price;
    try {
      const baseName = order.product_name.split(' - ')[0];
      const product = products.find(p => p.name === baseName);
      const unit = product?.priceByStorage?.[order.product_storage] ?? product?.price ?? 0;
      const total = unit * (order.quantity ?? 1);
      return formatPrice(total);
    } catch {
      return order.price;
    }
  };

  const renderProgress = (orderId: string) => (
    <div className="space-y-3">
      {(trackingSteps[orderId] || []).map((step, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step.completed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
          }`}>
            {step.completed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.title}
            </p>
            <p className="text-sm text-muted-foreground">{step.step_date || 'Pending'}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Track My Orders</h1>
          <p className="text-muted-foreground">Monitor the status of your orders</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Input
              placeholder="Search by order ID or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : "You haven't placed any orders yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageOrders.map((order) => {
                    const isOpen = expandedId === order.id;
                    return (
                      <Fragment key={order.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleExpand(order.id)}
                        >
                          <TableCell className="text-muted-foreground">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(order.order_date).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell>{order.product_name}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {computeOrderPrice(order)}
                          </TableCell>
                        </TableRow>

                        {isOpen && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="bg-muted/30">
                              <div className="grid gap-8 md:grid-cols-2 py-2">
                                <div className="space-y-1.5 text-sm">
                                  <h4 className="font-semibold mb-2">Order Details</h4>
                                  <p><span className="text-muted-foreground">Product:</span> {order.product_name}</p>
                                  <p>
                                    <span className="text-muted-foreground">Colour / Storage:</span>{' '}
                                    {order.product_color || '—'}{order.product_storage ? ` • ${order.product_storage}` : ''}
                                  </p>
                                  <p><span className="text-muted-foreground">Quantity:</span> {order.quantity}</p>
                                  <p><span className="text-muted-foreground">Total:</span> {computeOrderPrice(order)}</p>
                                  <p>
                                    <span className="text-muted-foreground">Payment:</span>{' '}
                                    {order.payment_method || 'Cash on Delivery'}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-3">Order Progress</h4>
                                  {renderProgress(order.id)}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom}-{showingTo} of {total} orders
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setCurrentPage(page - 1)}
                  >
                    Previous
                  </Button>
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      variant={n === page ? 'default' : 'outline'}
                      size="sm"
                      className="w-9"
                      onClick={() => setCurrentPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setCurrentPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrackOrders;
