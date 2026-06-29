import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { Link } from 'react-router-dom';

const Cart = () => {
  const { state, dispatch } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch({ type: 'REMOVE_ITEM', payload: id });
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity: newQuantity } });
    }
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const getItemId = (item: CartItem) =>
    `${item.product.id}-${item.selectedColor}-${item.selectedStorage}`;

  if (state.items.length === 0) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any phones to your cart yet
          </p>
          <Button asChild size="lg" className="bg-gradient-primary">
            <Link to="/mobiles">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {state.items.map((item) => (
            <Card key={getItemId(item)}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-24 h-24 flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold mb-2">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Model: {item.product.model}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 bg-muted rounded text-sm">
                        {item.selectedColor}
                      </span>
                      <span className="px-2 py-1 bg-muted rounded text-sm">
                        {item.selectedStorage}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(getItemId(item), item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-medium px-3">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(getItemId(item), item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold">
                          {formatPrice(((item.product.priceByStorage?.[item.selectedStorage] ?? item.product.price) * item.quantity))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(getItemId(item))}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal ({state.items.reduce((total, item) => total + item.quantity, 0)} items)</span>
                <span>{formatPrice(state.total)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(state.total)}</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                <p className="font-medium text-green-600 mb-1">Cash on Delivery Available</p>
                <p>Pay when you receive your order. No advance payment required.</p>
              </div>
              
              <Button asChild className="w-full bg-gradient-primary hover:opacity-90" size="lg">
                <Link to="/checkout">Proceed to Checkout</Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/mobiles">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;