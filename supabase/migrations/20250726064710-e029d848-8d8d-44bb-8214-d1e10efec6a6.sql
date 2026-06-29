-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  order_number TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_color TEXT,
  product_storage TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_state TEXT NOT NULL,
  delivery_pincode TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  status TEXT NOT NULL DEFAULT 'confirmed',
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders (allow users to see all orders for now since no auth is implemented)
CREATE POLICY "Anyone can view orders" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Create order tracking steps table
CREATE TABLE public.order_tracking_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  step_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for tracking steps
ALTER TABLE public.order_tracking_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracking steps" 
ON public.order_tracking_steps 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create tracking steps" 
ON public.order_tracking_steps 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default tracking steps for new orders
CREATE OR REPLACE FUNCTION public.create_default_tracking_steps()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.order_tracking_steps (order_id, title, completed, step_date) VALUES
    (NEW.id, 'Order Confirmed', true, NEW.created_at),
    (NEW.id, 'Processing', false, NULL),
    (NEW.id, 'Shipped', false, NULL),
    (NEW.id, 'Delivered', false, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create tracking steps
CREATE TRIGGER create_tracking_steps_on_order_creation
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_tracking_steps();