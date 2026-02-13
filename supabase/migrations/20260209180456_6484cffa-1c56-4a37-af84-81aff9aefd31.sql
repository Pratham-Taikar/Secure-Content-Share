
-- Add new columns to contents table for expanded file format support
ALTER TABLE public.contents 
  ADD COLUMN IF NOT EXISTS content_category text NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS file_extension text;

-- Add expiry_minutes to share_links
ALTER TABLE public.share_links 
  ADD COLUMN IF NOT EXISTS expiry_minutes integer;

-- Add new event types to the access_event_type enum
ALTER TYPE public.access_event_type ADD VALUE IF NOT EXISTS 'OWNER_ACCESS';
ALTER TYPE public.access_event_type ADD VALUE IF NOT EXISTS 'URL_REFRESHED';
ALTER TYPE public.access_event_type ADD VALUE IF NOT EXISTS 'SUSPICIOUS_ACTIVITY';
