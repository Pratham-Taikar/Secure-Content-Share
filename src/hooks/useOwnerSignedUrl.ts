import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OwnerSignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
  title: string;
  description: string | null;
  fileType: string;
  contentCategory: string;
  mimeType: string | null;
  fileExtension: string | null;
}

interface UseOwnerSignedUrlResult {
  data: OwnerSignedUrlResponse | null;
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
  expiresAt: Date | null;
  timeRemaining: number;
  refresh: () => Promise<void>;
  isExpired: boolean;
}

export function useOwnerSignedUrl(contentId: string): UseOwnerSignedUrlResult {
  const { session } = useAuth();
  const [data, setData] = useState<OwnerSignedUrlResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const fetchSignedUrl = useCallback(async () => {
    if (!session?.access_token || !contentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: fnError } = await supabase.functions.invoke<OwnerSignedUrlResponse>(
        "owner-signed-url",
        { body: { contentId } }
      );

      if (fnError) throw new Error(fnError.message);
      if (!responseData?.signedUrl) throw new Error("No signed URL returned");

      setData(responseData);
      setExpiresAt(new Date(responseData.expiresAt));
      setTimeRemaining(responseData.expiresIn);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get signed URL";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, contentId]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    data,
    signedUrl: data?.signedUrl || null,
    loading,
    error,
    expiresAt,
    timeRemaining,
    refresh: fetchSignedUrl,
    isExpired: timeRemaining === 0 && !loading,
  };
}
