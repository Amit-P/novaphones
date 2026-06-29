
-- Allow anon to SELECT from reviews so the SECURITY INVOKER view works
-- The view already filters out user_id column
CREATE POLICY "Anon can read reviews for public view"
ON public.reviews
FOR SELECT
TO anon
USING (true);
