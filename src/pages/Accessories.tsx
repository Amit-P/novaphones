import { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ProductCard from '@/components/ProductCard';
import { products } from '@/data/products';
import { useProductRatings } from '@/hooks/useProductRatings';

const Accessories = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [priceFilter, setPriceFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [discountFilter, setDiscountFilter] = useState('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const accessoryProducts = products.filter(p => !p.storage || p.storage.length === 0);
  const { ratings } = useProductRatings(accessoryProducts.map(p => p.id));

  const filteredProducts = accessoryProducts
    .filter(product => {
      if (!searchTerm.trim()) return true;
      const s = searchTerm.toLowerCase().trim();
      return product.name.toLowerCase().includes(s) || product.model.toLowerCase().includes(s);
    })
    .filter(product => {
      if (priceFilter === 'all') return true;
      if (priceFilter === 'under-2k') return product.price < 2000;
      if (priceFilter === '2k-3k') return product.price >= 2000 && product.price < 3000;
      if (priceFilter === 'above-3k') return product.price >= 3000;
      return true;
    })
    .filter(product => {
      if (ratingFilter === 'all') return true;
      const r = ratings[product.id]?.averageRating || 0;
      if (ratingFilter === '1') return r >= 1 && r < 2;
      if (ratingFilter === '2') return r >= 2 && r < 3;
      if (ratingFilter === '3') return r >= 3 && r < 4;
      if (ratingFilter === '4') return r >= 4 && r < 5;
      if (ratingFilter === '5') return r >= 5;
      return true;
    })
    .filter(product => {
      if (discountFilter === 'all') return true;
      const d = product.originalPrice
        ? ((product.originalPrice - product.price) / product.originalPrice) * 100
        : 0;
      if (discountFilter === '10+') return d >= 10;
      if (discountFilter === '5+') return d >= 5;
      if (discountFilter === 'any') return product.originalPrice && product.originalPrice > product.price;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'rating':
          return (ratings[b.id]?.averageRating || 0) - (ratings[a.id]?.averageRating || 0);
        default: return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Accessories</h1>
        <p className="text-xl text-muted-foreground">
          Power adapters, wireless chargers and more for your NovaPhone
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accessories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="under-2k">Under ₹2,000</SelectItem>
            <SelectItem value="2k-3k">₹2,000 - ₹3,000</SelectItem>
            <SelectItem value="above-3k">Above ₹3,000</SelectItem>
          </SelectContent>
        </Select>

        <Collapsible open={showMoreFilters} onOpenChange={setShowMoreFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
              {showMoreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                    <SelectItem value="2">2 Star</SelectItem>
                    <SelectItem value="3">3 Star</SelectItem>
                    <SelectItem value="4">4 Star</SelectItem>
                    <SelectItem value="5">5 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Discount</label>
                <Select value={discountFilter} onValueChange={setDiscountFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="any">Any Discount</SelectItem>
                    <SelectItem value="5+">5%+ Off</SelectItem>
                    <SelectItem value="10+">10%+ Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results */}
      <div className="mb-6">
        <p className="text-muted-foreground">
          Showing {filteredProducts.length} of {accessoryProducts.length} accessories
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-2xl font-semibold mb-2">No accessories found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filter criteria
          </p>
          <Button onClick={() => {
            setSearchTerm('');
            setPriceFilter('all');
            setRatingFilter('all');
            setDiscountFilter('all');
            setSortBy('name');
            setShowMoreFilters(false);
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default Accessories;
