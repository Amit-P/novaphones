import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

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

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Track My Orders</h1>
          <p className="text-muted-foreground">Monitor the status of your orders</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search by order ID or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline">Search</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-primary" />
                      {order.order_number}
                    </CardTitle>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{order.product_name}</p>
                    <p>{order.product_storage} • Qty: {order.quantity}</p>
                    <p>Ordered on {new Date(order.order_date).toLocaleDateString('en-IN')}</p>
                    <p className="font-medium text-foreground">{computeOrderPrice(order)}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {order.payment_method || 'Cash on Delivery'}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-medium mb-3">Order Progress</h4>
                    <div className="space-y-3">
                      {(trackingSteps[order.id] || []).map((step, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.completed 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {step.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              step.completed ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {step.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {step.step_date || 'Pending'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'You haven\'t placed any orders yet'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrackOrders;