-- Fix security vulnerability: Restrict profiles table access to own profiles only

-- Drop the existing overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure policy that only allows authenticated users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Note: Keep the existing INSERT and UPDATE policies as they are already secure
-- Users can insert their own profile: WITH CHECK (auth.uid() = user_id)
-- Users can update their own profile: USING (auth.uid() = user_id)