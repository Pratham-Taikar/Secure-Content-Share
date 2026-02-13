import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContentType = "video" | "pdf";
export type ContentCategory = "video" | "audio" | "image" | "document";

export interface Content {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  file_type: ContentType;
  content_category: string;
  file_extension: string | null;
  file_path: string;
  thumbnail_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  content_id: string;
  owner_id: string;
  share_token: string;
  allowed_emails: string[];
  expires_at: string;
  expiry_minutes: number | null;
  created_at: string;
  is_active: boolean;
}

export type AccessEventType =
  | "UPLOAD"
  | "LINK_CREATED"
  | "ACCESS_GRANTED"
  | "ACCESS_DENIED"
  | "LINK_EXPIRED"
  | "OWNER_ACCESS"
  | "URL_REFRESHED"
  | "SUSPICIOUS_ACTIVITY";

export interface AccessLog {
  id: string;
  user_id: string | null;
  content_id: string | null;
  share_token: string | null;
  event_type: AccessEventType;
  accessed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  content?: Content | null;
}

// Fetch user's own contents
export function useMyContents(filter?: { category?: ContentCategory; search?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-contents", user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("contents")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter?.category) {
        query = query.eq("content_category", filter.category);
      }

      if (filter?.search) {
        query = query.ilike("title", `%${filter.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Content[];
    },
    enabled: !!user,
  });
}

// Fetch a single content by ID (only if owner)
export function useContent(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Content | null;
    },
    enabled: !!id && !!user,
  });
}

// Fetch user's share links
export function useMyShareLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-share-links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_links")
        .select(`*, content:contents(*)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (ShareLink & { content: Content })[];
    },
    enabled: !!user,
  });
}

// Fetch user's access logs
export function useAccessLogs(filter?: { eventType?: AccessEventType }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["access_logs", user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("access_logs")
        .select(`*, content:contents(*)`)
        .order("accessed_at", { ascending: false })
        .limit(100);

      if (filter?.eventType) {
        query = query.eq("event_type", filter.eventType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (AccessLog & { content: Content | null })[];
    },
    enabled: !!user,
  });
}

// Delete content
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const { data: content, error: fetchError } = await supabase
        .from("contents")
        .select("file_path")
        .eq("id", contentId)
        .single();

      if (fetchError) throw fetchError;

      if (content?.file_path) {
        await supabase.storage.from("content").remove([content.file_path]);
      }

      const { error } = await supabase
        .from("contents")
        .delete()
        .eq("id", contentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-contents"] });
      queryClient.invalidateQueries({ queryKey: ["my-share-links"] });
    },
  });
}

// Deactivate share link
export function useDeactivateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareLinkId: string) => {
      const { error } = await supabase
        .from("share_links")
        .update({ is_active: false })
        .eq("id", shareLinkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-share-links"] });
    },
  });
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}
