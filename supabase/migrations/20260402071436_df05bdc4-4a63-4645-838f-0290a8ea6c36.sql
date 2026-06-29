
-- Fix the security definer view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_reviews;

CREATE VIEW public.public_reviews 
WITH (security_invoker = true) AS
SELECT id, product_id, rating, comment, created_at, updated_at
FROM public.reviews;

-- Re-grant access
GRANT SELECT ON public.public_reviews TO anon;
GRANT SELECT ON public.public_reviews TO authenticated;
