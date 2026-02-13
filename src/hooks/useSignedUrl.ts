import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Hook for shared content access
interface SharedContentResponse {
  title: string;
  description: string | null;
  fileType: string;
  contentCategory: string;
  mimeType: string | null;
  fileExtension: string | null;
  signedUrl: string;
  expiresIn: number;
  linkExpiresAt: string;
  linkRemainingMinutes: number;
}

interface UseSharedContentResult {
  data: SharedContentResponse | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  timeRemaining: number;
  isExpired: boolean;
  refresh: () => Promise<void>;
}

export function useSharedContent(shareToken: string | null): UseSharedContentResult {
  const { session } = useAuth();

  const [data, setData] = useState<SharedContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const fetchSharedContent = useCallback(async () => {
    if (!session?.access_token || !shareToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data: responseData, error: fnError } = await supabase.functions.invoke<SharedContentResponse | { error: string; code?: string }>(
        "access-shared-content",
        { body: { shareToken } }
      );

      if (fnError) throw new Error(fnError.message);

      if (responseData && "error" in responseData) {
        setErrorCode((responseData as any).code || null);
        throw new Error(responseData.error);
      }

      const content = responseData as SharedContentResponse;
      setData(content);
      setExpiresAt(new Date(Date.now() + content.expiresIn * 1000));
      setTimeRemaining(content.expiresIn);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access shared content";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, shareToken]);

  useEffect(() => {
    if (shareToken) fetchSharedContent();
  }, [fetchSharedContent, shareToken]);

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
    loading,
    error,
    errorCode,
    timeRemaining,
    isExpired: timeRemaining === 0 && !loading && !!data,
    refresh: fetchSharedContent,
  };
}
