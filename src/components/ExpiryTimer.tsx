import { cn } from "@/lib/utils";
import { Clock, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ExpiryTimerProps {
  timeRemaining: number;
  isExpired: boolean;
  onRefresh: () => void;
  loading?: boolean;
  showRefresh?: boolean;
}

export function ExpiryTimer({ timeRemaining, isExpired, onRefresh, loading, showRefresh = true }: ExpiryTimerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    if (isExpired) return "text-destructive";
    if (timeRemaining <= 30) return "text-warning timer-urgent";
    if (timeRemaining <= 60) return "text-warning";
    return "text-success";
  };

  const getProgressWidth = () => {
    const maxTime = 120;
    return Math.max(0, (timeRemaining / maxTime) * 100);
  };

  const getBorderColor = () => {
    if (isExpired) return "border-destructive/30";
    if (timeRemaining <= 30) return "border-warning/30";
    return "border-border";
  };

  return (
    <Card className={cn("overflow-hidden", getBorderColor())}>
      {/* Top progress bar */}
      <div className="h-1 bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-1000",
            isExpired
              ? "bg-destructive"
              : timeRemaining <= 30
              ? "bg-warning"
              : "vault-gradient"
          )}
          style={{ width: `${getProgressWidth()}%` }}
        />
      </div>
      <div className="flex items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isExpired ? "bg-destructive/10" : timeRemaining <= 30 ? "bg-warning/10" : "bg-primary/10"
          )}>
            <Clock className={cn("h-5 w-5", getStatusColor())} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Signed URL Expires In</span>
            <span className={cn("font-mono text-xl font-bold tracking-wider", getStatusColor())}>
              {isExpired ? "EXPIRED" : formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Security indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Secured</span>
        </div>

        {/* Refresh Button */}
        {showRefresh && (
          <Button
            variant={isExpired ? "default" : "outline"}
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              "gap-2",
              isExpired && "vault-gradient text-primary-foreground animate-pulse"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {isExpired ? "Refresh Access" : "Refresh"}
          </Button>
        )}
      </div>
    </Card>
  );
}
