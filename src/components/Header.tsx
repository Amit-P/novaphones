import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Package, LogOut, Search } from 'lucide-react';
import logo from '@/assets/logo-icon.png';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useCart();
  const { state: wishlistState } = useWishlist();
  const { user, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
    const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
    const wishlistCount = wishlistState.items.length;

    const handleSignOut = async () => {
      await signOut();
      navigate('/');
    };

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchTerm.trim()) {
        navigate(`/mobiles?search=${encodeURIComponent(searchTerm.trim())}`);
      }
    };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src={logo} alt="NovaMobiles" className="h-10 w-10 object-contain" width={512} height={512} />
          <span className="font-bold text-xl">NovaMobiles</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/mobiles" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/mobiles' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Mobiles
          </Link>
          <Link 
            to="/accessories" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/accessories' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Accessories
          </Link>
        </nav>

        {/* Universal Search */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search phones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="relative">
            <Link to="/cart">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {itemCount}
                </Badge>
              )}
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;