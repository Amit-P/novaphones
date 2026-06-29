-- Create tables for Account Settings features

-- User preferences table for notification settings, theme, and language
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Notification preferences
  email_order_updates boolean NOT NULL DEFAULT true,
  email_promotions boolean NOT NULL DEFAULT true,
  email_newsletter boolean NOT NULL DEFAULT false,
  
  -- UI preferences
  theme text NOT NULL DEFAULT 'system',
  language text NOT NULL DEFAULT 'en',
  region text NOT NULL DEFAULT 'IN',
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Privacy and data settings
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  marketing_consent boolean NOT NULL DEFAULT false,
  data_sharing boolean NOT NULL DEFAULT false,
  analytics_consent boolean NOT NULL DEFAULT true,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Active sessions tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  device_info text,
  browser_info text,
  ip_address text,
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for user_privacy_settings
CREATE POLICY "Users can view their own privacy settings"
ON public.user_privacy_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings"
ON public.user_privacy_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
ON public.user_privacy_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_privacy_settings_updated_at
BEFORE UPDATE ON public.user_privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();