-- Fix critical security vulnerability: Restrict orders table access to authenticated users only

-- Drop the existing overly permissive policy that allows anyone to view all orders
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

-- Create secure policy that only allows authenticated users to view their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Update the insert policy to ensure orders are properly linked to users
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Authenticated users can create their own orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a policy for guest orders (orders without user_id) - these should only be viewable during the session
-- For now, we'll disable access to null user_id orders for security
-- If guest checkout is needed, it should be handled with session-based security