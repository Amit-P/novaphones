import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Header from "@/components/Header";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Accessories from "./pages/Accessories";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import TrackOrders from "./pages/TrackOrders";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import Auth from "./pages/Auth";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Toaster />
              <Sonner />
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/mobiles" element={<Products />} />
                    <Route path="/products" element={<Navigate to="/mobiles" replace />} />
                    <Route path="/accessories" element={<Accessories />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/login" element={<Auth />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    } />
                    <Route path="/order-success" element={
                      <ProtectedRoute>
                        <OrderSuccess />
                      </ProtectedRoute>
                    } />
                    <Route path="/track-orders" element={
                      <ProtectedRoute>
                        <TrackOrders />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="/wishlist" element={
                      <ProtectedRoute>
                        <Wishlist />
                      </ProtectedRoute>
                    } />
                    <Route path="/account-settings" element={
                      <ProtectedRoute>
                        <AccountSettings />
                      </ProtectedRoute>
                    } />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
