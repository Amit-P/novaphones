-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_tracking_steps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.order_tracking_steps (order_id, title, completed, step_date) VALUES
    (NEW.id, 'Order Confirmed', true, NEW.created_at),
    (NEW.id, 'Processing', false, NULL),
    (NEW.id, 'Shipped', false, NULL),
    (NEW.id, 'Delivered', false, NULL);
  RETURN NEW;
END;
$$;