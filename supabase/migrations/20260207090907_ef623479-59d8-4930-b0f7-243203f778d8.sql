-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'premium', 'staff');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table for proper role management (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create content_type enum
CREATE TYPE public.content_type AS ENUM ('video', 'pdf');

-- Create visibility_type enum  
CREATE TYPE public.visibility_type AS ENUM ('restricted', 'public_to_logged_users');

-- Create contents table
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_type content_type NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  visibility visibility_type NOT NULL DEFAULT 'restricted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create content_access table for authorization
CREATE TABLE public.content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, user_id)
);

-- Create event_type enum for access logs
CREATE TYPE public.access_event_type AS ENUM ('SIGNED_URL_CREATED', 'CONTENT_OPENED', 'URL_REFRESHED', 'ACCESS_DENIED');

-- Create access_logs table for auditing
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_id UUID REFERENCES public.contents(id) ON DELETE SET NULL,
  event_type access_event_type NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check content access
CREATE OR REPLACE FUNCTION public.user_can_access_content(_user_id UUID, _content_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = _content_id
    AND (
      c.visibility = 'public_to_logged_users'
      OR EXISTS (
        SELECT 1 FROM public.content_access ca
        WHERE ca.content_id = _content_id
        AND ca.user_id = _user_id
      )
    )
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Contents policies - users can see content they have access to
CREATE POLICY "Users can view accessible content"
  ON public.contents FOR SELECT
  TO authenticated
  USING (
    visibility = 'public_to_logged_users'
    OR EXISTS (
      SELECT 1 FROM public.content_access ca
      WHERE ca.content_id = id
      AND ca.user_id = auth.uid()
    )
  );

-- Content access policies
CREATE POLICY "Users can view their own access records"
  ON public.content_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Access logs policies
CREATE POLICY "Users can insert their own logs"
  ON public.access_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_content_access_user ON public.content_access(user_id);
CREATE INDEX idx_content_access_content ON public.content_access(content_id);
CREATE INDEX idx_access_logs_user ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_content ON public.access_logs(content_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_content ON public.favorites(content_id);
CREATE INDEX idx_contents_visibility ON public.contents(visibility);
CREATE INDEX idx_contents_file_type ON public.contents(file_type);

-- Create storage bucket for content (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', false);

-- Storage policies for content bucket
CREATE POLICY "Authenticated users can upload to content bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'content');

CREATE POLICY "Authenticated users can read content they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND (
      -- Allow thumbnail access
      (storage.foldername(name))[1] = 'thumbnails'
      OR
      -- For actual content, check access
      EXISTS (
        SELECT 1 FROM public.contents c
        WHERE c.file_path = name
        AND (
          c.visibility = 'public_to_logged_users'
          OR EXISTS (
            SELECT 1 FROM public.content_access ca
            WHERE ca.content_id = c.id
            AND ca.user_id = auth.uid()
          )
        )
      )
    )
  );