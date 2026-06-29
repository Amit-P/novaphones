import { useState, useEffect } from 'react';
import type { RecordModel } from 'pocketbase';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, CheckCircle, Plus, Info } from 'lucide-react';
import {
  DUMMY_VISA_CARDS,
  formatCardNumber,
  formatExpiry,
  sanitizeCardNumber,
  validateDummyVisa,
} from '@/lib/dummyCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/integrations/pocketbase/client';
import { useAuth } from '@/contexts/AuthContext';

const Checkout = () => {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [addressMode, setAddressMode] = useState<'new' | 'existing'>('existing');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addresses, setAddresses] = useState<RecordModel[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'cod'
  });
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: '',
  });
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setAddressMode('new');
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;
    
    try {
      const data = await pb.collection('addresses').getFullList({
        filter: pb.filter('user = {:uid}', { uid: user.id }),
        sort: '-is_default',
      });

      setAddresses(data);
      if (data.length > 0) {
        const defaultAddress = data.find(addr => addr.is_default) || data[0];
        setSelectedAddress(defaultAddress.id);
      } else {
        setAddressMode('new');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  // Check if user is eligible for 5% cashback coupon (2 or more phones)
  const isEligibleForCoupon = state.items.length >= 2;
  const couponDiscount = isEligibleForCoupon ? state.total * 0.05 : 0;
  const finalTotal = state.total - couponDiscount;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);

    // Validate dummy card if Credit Card selected
    if (formData.paymentMethod === 'card') {
      const result = validateDummyVisa(
        cardData.number,
        cardData.expiry,
        cardData.cvv,
        cardData.name
      );
      if (result.valid === false) {
        setCardError(result.reason);
        toast({
          title: 'Card validation failed',
          description: result.reason,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Get delivery details based on selected mode
      let deliveryDetails;
      
      if (addressMode === 'existing' && selectedAddress) {
        const selectedAddr = addresses.find(addr => addr.id === selectedAddress);
        if (selectedAddr) {
          deliveryDetails = {
            customer_name: selectedAddr.name,
            customer_phone: selectedAddr.phone,
            customer_email: formData.email || user?.email || '',
            delivery_address: selectedAddr.address,
            delivery_city: selectedAddr.city,
            delivery_state: selectedAddr.state,
            delivery_pincode: selectedAddr.pincode,
          };
        }
      } else {
        deliveryDetails = {
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email,
          delivery_address: formData.address,
          delivery_city: formData.city,
          delivery_state: formData.state,
          delivery_pincode: formData.pincode,
        };
      }

      if (!deliveryDetails) {
        throw new Error('Please select or enter delivery details');
      }

      // Generate base order number
      const baseOrderNumber = `ORD-${Date.now()}`;
      
      // Save each cart item as a separate order with unique order number
      for (let i = 0; i < state.items.length; i++) {
        const item = state.items[i];
        const uniqueOrderNumber = `${baseOrderNumber}-${i + 1}`;
        await pb.collection('orders').create({
          user: user?.id ?? '',
          order_number: uniqueOrderNumber,
          product_name: `${item.product.name} - ${item.selectedColor}`,
          product_color: item.selectedColor,
          product_storage: item.selectedStorage,
          quantity: item.quantity,
          price: formatPrice(((item.product.priceByStorage?.[item.selectedStorage] ?? item.product.price) * item.quantity)),
          ...deliveryDetails,
          payment_method:
            formData.paymentMethod === 'card'
              ? `Credit Card (VISA •••• ${sanitizeCardNumber(cardData.number).slice(-4)})`
              : 'Cash on Delivery',
          status: 'confirmed',
          order_date: new Date().toISOString(),
        });
        // The 4 order_tracking_steps are auto-created by the PocketBase hook
        // (pb_hooks/main.pb.js) when the order record is created.
      }

      dispatch({ type: 'CLEAR_CART' });
      toast({
        title: "Order placed successfully!",
        description: `Your order ${baseOrderNumber} has been confirmed. You can track it in the Track Orders section.`,
      });
      navigate('/order-success');
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error placing order",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (state.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user && addresses.length > 0 && (
                  <div className="space-y-4">
                    <Label>Choose delivery option</Label>
                    <RadioGroup
                      value={addressMode}
                      onValueChange={(value: 'new' | 'existing') => setAddressMode(value)}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="existing" />
                        <Label htmlFor="existing">Use saved address</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="new" />
                        <Label htmlFor="new">Enter new address</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {addressMode === 'existing' && addresses.length > 0 && (
                  <div className="space-y-3">
                    <Label>Select delivery address</Label>
                    <RadioGroup
                      value={selectedAddress}
                      onValueChange={setSelectedAddress}
                      className="space-y-3"
                    >
                      {addresses.map((address) => (
                        <div key={address.id} className="flex items-start space-x-2">
                          <RadioGroupItem 
                            value={address.id} 
                            id={address.id}
                            className="mt-1"
                          />
                          <Label 
                            htmlFor={address.id} 
                            className="flex-1 cursor-pointer p-3 border rounded-lg hover:bg-muted"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{address.name}</span>
                                {address.is_default && (
                                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {address.address}, {address.city}, {address.state} - {address.pincode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Phone: {address.phone}
                              </p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {addressMode === 'new' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">Enter new delivery address</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Complete Address *</Label>
                      <Textarea
                        id="address"
                        required
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="House/Flat no., Street, Landmark"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          required
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          required
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pincode">PIN Code *</Label>
                        <Input
                          id="pincode"
                          required
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={(value) => {
                    handleInputChange('paymentMethod', value);
                    setCardError(null);
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Credit Card (VISA — Demo only)</p>
                          <p className="text-sm text-muted-foreground">
                            Test cards only. Real cards will be rejected.
                          </p>
                        </div>
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {formData.paymentMethod === 'card' && (
                  <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                      <Info className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold">Demo mode — no real money is processed.</p>
                        <p className="mt-1">
                          Use a dummy VISA test card. Example:{' '}
                          <code className="px-1 py-0.5 bg-white rounded border">4111 1111 1111 1111</code>{' '}
                          — any future expiry (e.g. 12/30), any 3-digit CVV.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="card-name">Cardholder Name *</Label>
                      <Input
                        id="card-name"
                        value={cardData.name}
                        onChange={(e) => setCardData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Name on card"
                      />
                    </div>

                    <div>
                      <Label htmlFor="card-number">Card Number *</Label>
                      <Input
                        id="card-number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardData.number}
                        onChange={(e) =>
                          setCardData((p) => ({ ...p, number: formatCardNumber(e.target.value) }))
                        }
                        placeholder="4111 1111 1111 1111"
                        maxLength={23}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="card-expiry">Expiry (MM/YY) *</Label>
                        <Input
                          id="card-expiry"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={cardData.expiry}
                          onChange={(e) =>
                            setCardData((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))
                          }
                          placeholder="12/30"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="card-cvv">CVV *</Label>
                        <Input
                          id="card-cvv"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          type="password"
                          value={cardData.cvv}
                          onChange={(e) =>
                            setCardData((p) => ({
                              ...p,
                              cvv: e.target.value.replace(/\D/g, '').slice(0, 3),
                            }))
                          }
                          placeholder="123"
                          maxLength={3}
                        />
                      </div>
                    </div>

                    {cardError && (
                      <p className="text-sm text-destructive font-medium">{cardError}</p>
                    )}

                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium">
                        Show accepted dummy VISA cards
                      </summary>
                      <ul className="mt-2 space-y-1 font-mono">
                        {DUMMY_VISA_CARDS.slice(0, 6).map((c) => (
                          <li key={c}>{formatCardNumber(c)}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}

                {formData.paymentMethod === 'cod' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Cash on Delivery Benefits:</strong>
                    </p>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• No advance payment required</li>
                      <li>• Inspect your phone before payment</li>
                      <li>• Secure and trusted delivery</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {state.items.map((item) => (
                  <div key={`${item.product.id}-${item.selectedColor}-${item.selectedStorage}`} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-muted-foreground">
                        {item.selectedColor} • {item.selectedStorage} • Qty: {item.quantity}
                      </p>
                    </div>
                      <span className="font-medium">
                        {formatPrice(((item.product.priceByStorage?.[item.selectedStorage] ?? item.product.price) * item.quantity))}
                      </span>
                  </div>
                ))}

                {/* Coupon Promotion */}
                {isEligibleForCoupon && (
                  <div className="my-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-800 text-sm">🎉 Special Offer Applied!</p>
                        <p className="text-green-700 text-xs">5% Cashback for buying 2+ phones</p>
                      </div>
                      <div className="text-green-600 font-bold">
                        -{formatPrice(couponDiscount)}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(state.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  {isEligibleForCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>5% Cashback Coupon</span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Place Order'}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  By placing this order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;