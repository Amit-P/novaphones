-- Remove the overly permissive anon SELECT policy on reviews table
-- The public_reviews view (which excludes user_id) should be used for anonymous access
DROP POLICY IF EXISTS "Anon can read reviews for public view" ON public.reviews;