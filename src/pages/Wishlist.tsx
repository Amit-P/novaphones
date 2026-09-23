import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWishlist, type Product as WishlistProduct } from '@/contexts/WishlistContext';
import { useCart, getMaxQuantity } from '@/contexts/CartContext';
import { useProductStock } from '@/hooks/useProductStock';
import { StockBadge } from '@/components/StockBadge';
import type { Product as CatalogProduct } from '@/data/products';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// Own component (not inlined in the .map below) so it can call the
// useProductStock hook per wishlist item — hooks can't be called inside a
// loop/callback, only at the top level of a component.
const WishlistItemActions = ({
  product,
  onMovedToCart,
}: {
  product: WishlistProduct;
  onMovedToCart: (productId: string) => void;
}) => {
  const { state: cartState, dispatch } = useCart();
  const { stock, loading } = useProductStock(product.id);

  const handleAddToCart = () => {
    if (stock !== null && stock <= 0) {
      toast({
        title: "Out of stock",
        description: `${product.name} is currently out of stock.`,
        variant: "destructive",
      });
      return;
    }

    const flatMax = getMaxQuantity(product as unknown as CatalogProduct);
    const max = stock !== null ? Math.min(flatMax, stock) : flatMax;
    const color = product.colors?.[0] || 'Default';
    const storage = product.storage?.[0] || '128GB';
    const existing = cartState.items.find(
      (i) => i.product.id === product.id && i.selectedColor === color && i.selectedStorage === storage
    );
    if (existing && existing.quantity >= max) {
      toast({
        title: "Purchase limit reached",
        description: `Only ${max} of this item can be purchased right now.`,
        variant: "destructive",
      });
      return;
    }

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        // Wishlist items are a partial catalog product; the cart reducer only
        // uses id/name/price, so this cast is safe at runtime.
        product: product as unknown as CatalogProduct,
        color,
        storage,
      },
    });
    onMovedToCart(product.id);
    toast({
      title: "Added to cart",
      description: `${product.name} has been moved to your cart.`,
    });
  };

  const outOfStock = stock !== null && stock <= 0;

  return (
    <>
      <StockBadge stock={stock} loading={loading} />
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleAddToCart}
          disabled={loading || outOfStock}
          className="flex-1 bg-gradient-primary"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </>
  );
};

const Wishlist = () => {
  const { state: wishlistState, removeFromWishlist } = useWishlist();

  const handleRemoveFromWishlist = (product: WishlistProduct) => {
    removeFromWishlist(product.id);
    toast({
      title: "Removed from wishlist",
      description: `${product.name} has been removed from your wishlist.`,
    });
  };

  if (wishlistState.items.length === 0) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
            <p className="text-muted-foreground">Save your favorite phones for later</p>
          </div>
          
          <Card>
            <CardContent className="py-12">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-4">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-6">
                Discover amazing phones and add them to your wishlist for easy access later.
              </p>
              <Button asChild className="bg-gradient-primary">
                <Link to="/mobiles">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
          <p className="text-muted-foreground">
            {wishlistState.items.length} item{wishlistState.items.length !== 1 ? 's' : ''} saved for later
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistState.items.map((product) => (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <Link to={`/product/${product.id}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform"
                    />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm hover:bg-white"
                    onClick={() => handleRemoveFromWishlist(product)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Link 
                      to={`/product/${product.id}`}
                      className="font-semibold text-lg hover:text-primary transition-colors"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.storage?.[0] || 'Default Storage'} • {product.colors?.[0] || 'Default Color'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <WishlistItemActions product={product} onMovedToCart={removeFromWishlist} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;