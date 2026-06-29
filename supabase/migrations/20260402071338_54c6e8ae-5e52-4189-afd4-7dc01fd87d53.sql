
-- Create a public view for reviews that excludes user_id
CREATE OR REPLACE VIEW public.public_reviews AS
SELECT id, product_id, rating, comment, created_at, updated_at
FROM public.reviews;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

-- Add a restricted SELECT policy: users can only see their own reviews directly
CREATE POLICY "Users can view their own reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow anon/public to read via the view (grant select on the view)
GRANT SELECT ON public.public_reviews TO anon;
GRANT SELECT ON public.public_reviews TO authenticated;
