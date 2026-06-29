import { CheckCircle, Truck, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const OrderSuccess = () => {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">Order Placed Successfully!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for choosing NovaMobiles. Your order has been confirmed and will be delivered soon.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold mb-6">What happens next?</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  1
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-1">Order Confirmation</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a confirmation call within 2 hours to verify your order details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  2
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-1">Processing & Packaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Your order will be carefully packed and prepared for delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  3
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-1">Out for Delivery</h3>
                  <p className="text-sm text-muted-foreground">
                    Your order will be delivered to your doorstep within 2-7 business days.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  4
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-1">Cash on Delivery</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay the delivery person when you receive your order. Inspect before payment!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Truck className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-medium mb-2">Track Your Order</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We'll send you tracking updates via SMS
              </p>
              <Button asChild size="sm" aria-label="Track your order">
                <Link to="/track-orders">Track Order</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-medium mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Call us at 1800-123-4567 for support
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button asChild size="lg" className="bg-gradient-primary">
            <Link to="/mobiles">Continue Shopping</Link>
          </Button>
          <div>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;