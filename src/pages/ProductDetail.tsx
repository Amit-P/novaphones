import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Truck, Shield, ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { products } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/hooks/use-toast';
import type { RecordModel } from 'pocketbase';
import { useAuth } from '@/contexts/AuthContext';
import { pb } from '@/integrations/pocketbase/client';
import { useProductRating } from '@/hooks/useProductRatings';
import { ReviewForm } from '@/components/ReviewForm';
import { ReviewsList } from '@/components/ReviewsList';

// NovaPhone X1 Pro Max color variants
import novaX1ProMaxNatural from '@/assets/nova-x1-pro-max-natural.jpg';
import novaX1ProMaxBlue from '@/assets/nova-x1-pro-max-blue.jpg';
import novaX1ProMaxWhite from '@/assets/nova-x1-pro-max-white.jpg';
import novaX1ProMaxBlack from '@/assets/nova-x1-pro-max-black.jpg';
// NovaPhone X1 Pro color variants
import novaX1ProNatural from '@/assets/nova-x1-pro-natural.jpg';
import novaX1ProBlue from '@/assets/nova-x1-pro-blue.jpg';
import novaX1ProWhite from '@/assets/nova-x1-pro-white.jpg';
import novaX1ProBlack from '@/assets/nova-x1-pro-black.jpg';
// NovaPhone X1 color variants
import novaX1Black from '@/assets/nova-x1-black.jpg';
import novaX1White from '@/assets/nova-x1-white.jpg';
import novaX1Pink from '@/assets/nova-x1-pink.jpg';
import novaX1Teal from '@/assets/nova-x1-teal.jpg';
import novaX1Ultramarine from '@/assets/nova-x1-ultramarine.jpg';
// NovaPhone S9 Pro Max color variants
import novaS9ProMaxNatural from '@/assets/nova-s9-pro-max-natural.jpg';
import novaS9ProMaxBlue from '@/assets/nova-s9-pro-max-blue.jpg';
import novaS9ProMaxWhite from '@/assets/nova-s9-pro-max-white.jpg';
import novaS9ProMaxBlack from '@/assets/nova-s9-pro-max-black.jpg';
// NovaPhone S9 Pro color variants
import novaS9ProNatural from '@/assets/nova-s9-pro-natural.jpg';
import novaS9ProBlue from '@/assets/nova-s9-pro-blue.jpg';
import novaS9ProWhite from '@/assets/nova-s9-pro-white.jpg';
import novaS9ProBlack from '@/assets/nova-s9-pro-black.jpg';
// NovaPhone S9 color variants
import novaS9Pink from '@/assets/nova-s9-pink.jpg';
import novaS9Yellow from '@/assets/nova-s9-yellow.jpg';
import novaS9Green from '@/assets/nova-s9-green.jpg';
import novaS9Blue from '@/assets/nova-s9-blue.jpg';
import novaS9Black from '@/assets/nova-s9-black.jpg';
// NovaPhone S8 color variants
import novaS8Midnight from '@/assets/nova-s8-midnight.jpg';
import novaS8Purple from '@/assets/nova-s8-purple.jpg';
import novaS8Starlight from '@/assets/nova-s8-starlight.jpg';
import novaS8Blue from '@/assets/nova-s8-blue.jpg';
import novaS8Red from '@/assets/nova-s8-red.jpg';

const ProductDetail = () => {
  const { id } = useParams();
  const { dispatch } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const { user } = useAuth();
  const { rating } = useProductRating(id || '');
  
  const product = products.find(p => p.id === id);
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || '');
  const [selectedStorage, setSelectedStorage] = useState(product?.storage[0] || '');
  const [userReview, setUserReview] = useState<RecordModel | null>(null);
  const [refreshReviews, setRefreshReviews] = useState(0);

  // Function to get the appropriate image based on selected color
  const getProductImage = () => {
    if (!product) return '';
    
    const colorImageMap: { [key: string]: { [color: string]: string } } = {
      '1': { // NovaPhone X1 Pro Max
        'Natural Titanium': novaX1ProMaxNatural,
        'Blue Titanium': novaX1ProMaxBlue,
        'White Titanium': novaX1ProMaxWhite,
        'Black Titanium': novaX1ProMaxBlack
      },
      '2': { // NovaPhone X1 Pro
        'Natural Titanium': novaX1ProNatural,
        'Blue Titanium': novaX1ProBlue,
        'White Titanium': novaX1ProWhite,
        'Black Titanium': novaX1ProBlack
      },
      '3': { // NovaPhone X1
        'Black': novaX1Black,
        'White': novaX1White,
        'Pink': novaX1Pink,
        'Teal': novaX1Teal,
        'Ultramarine': novaX1Ultramarine
      },
      '4': { // NovaPhone S9 Pro Max
        'Natural Titanium': novaS9ProMaxNatural,
        'Blue Titanium': novaS9ProMaxBlue,
        'White Titanium': novaS9ProMaxWhite,
        'Black Titanium': novaS9ProMaxBlack
      },
      '5': { // NovaPhone S9 Pro
        'Natural Titanium': novaS9ProNatural,
        'Blue Titanium': novaS9ProBlue,
        'White Titanium': novaS9ProWhite,
        'Black Titanium': novaS9ProBlack
      },
      '6': { // NovaPhone S9
        'Pink': novaS9Pink,
        'Yellow': novaS9Yellow,
        'Green': novaS9Green,
        'Blue': novaS9Blue,
        'Black': novaS9Black
      },
      '7': { // NovaPhone S8
        'Midnight': novaS8Midnight,
        'Purple': novaS8Purple,
        'Starlight': novaS8Starlight,
        'Blue': novaS8Blue,
        'Red': novaS8Red
      }
    };

    return colorImageMap[product.id]?.[selectedColor] || product.image;
  };

  // Fetch user's existing review
  useEffect(() => {
    const fetchUserReview = async () => {
      if (user && product) {
        try {
          const data = await pb.collection('reviews').getFirstListItem(
            pb.filter('product_id = {:pid} && user = {:uid}', {
              pid: product.id,
              uid: user.id,
            })
          );
          setUserReview(data);
        } catch {
          // No existing review for this user/product (404) — that's expected.
          setUserReview(null);
        }
      }
    };

    fetchUserReview();
  }, [user, product]);

  if (!product) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Button asChild>
            <Link to="/mobiles">Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        product,
        color: selectedColor,
        storage: selectedStorage,
      },
    });
    toast({
      title: "Added to cart",
      description: `${product.name} (${selectedColor}, ${selectedStorage}) has been added to your cart.`,
    });
  };

  const handleWishlistToggle = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast({
        title: "Removed from wishlist",
        description: `${product.name} has been removed from your wishlist.`,
      });
    } else {
      const wishlistProduct = {
        ...product,
        storage: product.storage,
        colors: product.colors
      };
      addToWishlist(wishlistProduct);
      toast({
        title: "Added to wishlist",
        description: `${product.name} has been added to your wishlist.`,
      });
    }
  };

  const currentPrice = product.priceByStorage?.[selectedStorage] ?? product.price;
  const currentOriginalPrice = product.originalPriceByStorage?.[selectedStorage] ?? product.originalPrice;

  const discount = currentOriginalPrice 
    ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
    : 0;

  const handleReviewSubmitted = () => {
    setRefreshReviews(prev => prev + 1);
    if (user && product) {
      pb.collection('reviews')
        .getFirstListItem(
          pb.filter('product_id = {:pid} && user = {:uid}', {
            pid: product.id,
            uid: user.id,
          })
        )
        .then((data) => setUserReview(data))
        .catch(() => setUserReview(null));
    }
  };

  return (
    <div className="container py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link to="/mobiles">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="aspect-square relative overflow-hidden rounded-lg bg-gradient-surface">
            <img
              src={getProductImage()}
              alt={`${product.name} in ${selectedColor}`}
              className="object-cover w-full h-full transition-all duration-300"
            />
            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-destructive">
                {discount}% OFF
              </Badge>
            )}
            {product.inStock && (
              <Badge variant="secondary" className="absolute top-4 right-4 bg-success text-success-foreground">
                In Stock
              </Badge>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-muted-foreground">Model: {product.model}</p>
            
            <div className="flex items-center gap-2 mt-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(rating.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {rating.averageRating > 0 ? (
                  `${rating.averageRating} (${rating.totalReviews} review${rating.totalReviews !== 1 ? 's' : ''})`
                ) : (
                  'No reviews yet'
                )}
              </span>
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="text-3xl font-bold text-primary">
              {formatPrice(currentPrice)}
            </div>
            {currentOriginalPrice && (
              <div className="flex items-center gap-2">
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(currentOriginalPrice)}
                </span>
                <Badge variant="destructive">Save {formatPrice(currentOriginalPrice - currentPrice)}</Badge>
              </div>
            )}
          </div>

          {/* Color Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Choose Color</Label>
            <RadioGroup value={selectedColor} onValueChange={setSelectedColor}>
              <div className="grid grid-cols-2 gap-3">
                {product.colors.map((color) => (
                  <Label key={color} className="cursor-pointer">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                      <RadioGroupItem value={color} />
                      <span className="flex-1">{color}</span>
                    </div>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Storage Selection */}
          {product.storage.length > 0 && (
            <div>
              <Label className="text-base font-medium mb-3 block">Choose Storage</Label>
              <RadioGroup value={selectedStorage} onValueChange={setSelectedStorage}>
                <div className="grid grid-cols-3 gap-3">
                  {product.storage.map((storage) => (
                    <Label key={storage} className="cursor-pointer">
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted text-center">
                        <RadioGroupItem value={storage} />
                        <span className="flex-1">{storage}</span>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Add to Cart */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 bg-gradient-primary hover:opacity-90" 
                size="lg"
                disabled={!product.inStock}
              >
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleWishlistToggle}
                className="px-4"
              >
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-green-600">
              <Truck className="h-5 w-5" />
              <span className="font-medium">Free delivery with Cash on Delivery</span>
            </div>
          </div>

          {/* Trust Indicators */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">100% Authentic</p>
                    <p className="text-sm text-muted-foreground">Official warranty included</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay when you receive</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Key Features</h3>
            <ul className="space-y-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <Separator className="mb-8" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">Write a Review</h2>
            <ReviewForm
              productId={product.id}
              existingReview={userReview ?? undefined}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
            <ReviewsList 
              productId={product.id} 
              refreshTrigger={refreshReviews}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
