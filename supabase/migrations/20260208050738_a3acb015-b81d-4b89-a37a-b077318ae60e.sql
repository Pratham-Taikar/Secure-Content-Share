-- Drop old tables and policies that are no longer needed
DROP TABLE IF EXISTS public.content_access CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;

-- Drop old RLS policies on contents
DROP POLICY IF EXISTS "Users can view accessible content" ON public.contents;

-- Drop old event type enum and create new one
DROP TYPE IF EXISTS public.access_event_type CASCADE;
CREATE TYPE public.access_event_type AS ENUM (
  'UPLOAD',
  'LINK_CREATED', 
  'ACCESS_GRANTED',
  'ACCESS_DENIED',
  'LINK_EXPIRED'
);

-- Drop visibility type as it's no longer needed
DROP TYPE IF EXISTS public.visibility_type CASCADE;

-- Add owner_id to contents table and remove visibility
ALTER TABLE public.contents 
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove visibility column if it exists
ALTER TABLE public.contents 
  DROP COLUMN IF EXISTS visibility;

-- Add email to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Create share_links table
CREATE TABLE IF NOT EXISTS public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  allowed_emails text[] NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS on share_links
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Recreate access_logs table with new structure
DROP TABLE IF EXISTS public.access_logs CASCADE;
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,
  share_token text,
  event_type public.access_event_type NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text
);

-- Enable RLS on access_logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Contents table policies: only owner can see their content
CREATE POLICY "Owners can view their own content"
  ON public.contents FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own content"
  ON public.contents FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own content"
  ON public.contents FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own content"
  ON public.contents FOR DELETE
  USING (auth.uid() = owner_id);

-- Share_links table policies
CREATE POLICY "Owners can view their own share links"
  ON public.share_links FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert share links for their content"
  ON public.share_links FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own share links"
  ON public.share_links FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own share links"
  ON public.share_links FOR DELETE
  USING (auth.uid() = owner_id);

-- Access_logs table policies
CREATE POLICY "Users can insert their own logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs"
  ON public.access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contents_owner_id ON public.contents(owner_id);
CREATE INDEX IF NOT EXISTS idx_share_links_share_token ON public.share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_share_links_content_id ON public.share_links(content_id);
CREATE INDEX IF NOT EXISTS idx_share_links_owner_id ON public.share_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_content_id ON public.access_logs(content_id);

-- Update storage policies for user-specific folders
DROP POLICY IF EXISTS "Authenticated users can upload content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view content via signed URLs" ON storage.objects;

-- Storage policy: users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'content' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can read their own files
CREATE POLICY "Users can read their own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'content'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can update their own files
CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'content'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'content'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );