import { Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useProductRating } from '@/hooks/useProductRatings';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { dispatch } = useCart();
  const { toast } = useToast();
  const { rating } = useProductRating(product.id);

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
        color: product.colors[0],
        storage: product.storage[0],
      },
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-4">
        <Link to={`/product/${product.id}`} className="block">
          <div className="aspect-square relative mb-4 overflow-hidden rounded-lg bg-gradient-surface">
            <img
              src={product.image}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 bg-destructive">
                {discount}% OFF
              </Badge>
            )}
            {product.inStock && (
              <Badge variant="secondary" className="absolute top-2 right-2 bg-success text-success-foreground">
                In Stock
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
            <p className="text-sm text-muted-foreground">Model: {product.model}</p>
            
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(rating.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {rating.averageRating > 0 ? (
                  <>({rating.totalReviews} review{rating.totalReviews !== 1 ? 's' : ''})</>
                ) : (
                  '(No reviews)'
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {product.storage.slice(0, 3).map((storage) => (
                <Badge key={storage} variant="outline" className="text-xs">
                  {storage}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2 text-green-600">
              <Truck className="h-4 w-4" />
              <span className="text-sm font-medium">Cash on Delivery</span>
            </div>
          </div>
        </Link>
      </CardContent>
      
      <CardFooter className="px-4 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between w-full">
          <div>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(product.price)}
            </div>
            {product.originalPrice && (
              <div className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </div>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleAddToCart}
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          disabled={!product.inStock}
        >
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;