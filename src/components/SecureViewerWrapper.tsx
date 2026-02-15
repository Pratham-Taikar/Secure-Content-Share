import { useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SecureViewerWrapperProps {
  children: ReactNode;
  contentId?: string;
  isOwnerAccess?: boolean;
}

export function SecureViewerWrapper({ children, contentId, isOwnerAccess = false }: SecureViewerWrapperProps) {
  const { user } = useAuth();
  const [watermarkPos, setWatermarkPos] = useState({ top: 20, left: 20 });
  const [showWarning, setShowWarning] = useState(false);

  const logSuspicious = useCallback(async (detail: string) => {
    if (!user || !contentId) return;
    try {
      await supabase.from("access_logs").insert({
        user_id: user.id,
        content_id: contentId,
        event_type: "SUSPICIOUS_ACTIVITY" as any,
        user_agent: navigator.userAgent,
      });
    } catch {}
    console.warn("Suspicious activity:", detail);
  }, [user, contentId]);

  useEffect(() => {
    if (isOwnerAccess) return;
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.random() * 70 + 5,
        left: Math.random() * 60 + 5,
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isOwnerAccess]);

  useEffect(() => {
    if (isOwnerAccess) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        logSuspicious("PrintScreen key pressed");
        toast.error("Screenshots are not allowed");
      }
      // Block Ctrl+S
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        logSuspicious("Ctrl+S pressed");
      }
      // Block Ctrl+P
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        logSuspicious("Ctrl+P pressed");
      }
      // Block Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        logSuspicious("DevTools shortcut pressed");
      }
      // Block F12
      if (e.key === "F12") {
        e.preventDefault();
        logSuspicious("F12 pressed");
      }
      // Block Ctrl+U
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        logSuspicious("Ctrl+U pressed");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowWarning(true);
        logSuspicious("Tab switched / window minimized");
        // Pause all media
        document.querySelectorAll("video, audio").forEach((el) => {
          (el as HTMLMediaElement).pause();
        });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isOwnerAccess, logSuspicious]);

  const dismissWarning = () => setShowWarning(false);

  const watermarkText = `${user?.email || "unknown"} • ${new Date().toLocaleString()}`;

  // Owner bypass: render children without any restrictions
  if (isOwnerAccess) {
    return <div>{children}</div>;
  }

  return (
    <div
      className="relative select-none"
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Warning Banner */}
      <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <span className="text-warning">
          This content is protected. Recording, screenshots, or sharing is prohibited.
        </span>
      </div>

      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center space-y-4 shadow-2xl">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
            <h3 className="text-xl font-bold">Tab Switch Detected</h3>
            <p className="text-muted-foreground">
              Media playback has been paused because you switched tabs or minimized the window.
              This activity has been logged.
            </p>
            <button
              onClick={dismissWarning}
              className="px-6 py-2 rounded-lg vault-gradient text-primary-foreground font-medium"
            >
              Continue Viewing
            </button>
          </div>
        </div>
      )}

      {children}

      <div
        className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute text-gray-500 text-sm font-mono whitespace-nowrap transition-all duration-1000 ease-in-out"
          style={{
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            transform: "rotate(-25deg)",
          }}
        >
          {watermarkText}
        </div>
        <div className="absolute top-[10%] left-[50%] text-foreground/5 text-xs font-mono whitespace-nowrap -rotate-12">
          {watermarkText}
        </div>
        <div className="absolute top-[60%] left-[10%] text-foreground/5 text-xs font-mono whitespace-nowrap -rotate-12">
          {watermarkText}
        </div>
        <div className="absolute top-[40%] left-[70%] text-foreground/5 text-xs font-mono whitespace-nowrap -rotate-12">
          {watermarkText}
        </div>
      </div>
    </div>
  );
}
