-- Fix Order Tracking Access Control Security Issue

-- Drop the overly permissive policies that allow anyone to view all tracking steps
DROP POLICY IF EXISTS "Anyone can view tracking steps" ON public.order_tracking_steps;
DROP POLICY IF EXISTS "Anyone can create tracking steps" ON public.order_tracking_steps;

-- Create secure policy that only allows users to view tracking steps for their own orders
CREATE POLICY "Users can view their own order tracking steps" 
ON public.order_tracking_steps 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tracking_steps.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Create secure policy for creating tracking steps (system/admin use only)
-- This policy is more restrictive and should only be used by backend systems
CREATE POLICY "System can create tracking steps" 
ON public.order_tracking_steps 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tracking_steps.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Add policy for updating tracking steps (for order status updates)
CREATE POLICY "System can update tracking steps for user orders" 
ON public.order_tracking_steps 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tracking_steps.order_id 
    AND orders.user_id = auth.uid()
  )
);