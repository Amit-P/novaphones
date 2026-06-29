
-- Add INSERT policy for user_sessions
CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for user_sessions
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
