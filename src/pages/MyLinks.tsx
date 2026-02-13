import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useMyShareLinks, useDeactivateShareLink } from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Link2,
  Play,
  FileText,
  Eye,
  Loader2,
  Copy,
  Check,
  Clock,
  XCircle,
  Users,
  Music,
  Image,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format, isPast } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, typeof Play> = {
  video: Play,
  audio: Music,
  image: Image,
  document: FileText,
};

export default function MyLinks() {
  const { data: shareLinks, isLoading, error } = useMyShareLinks();
  const deactivateLink = useDeactivateShareLink();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id);
    toast.success("Access token copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateLink.mutateAsync(id);
      toast.success("Share link deactivated");
    } catch {
      toast.error("Failed to deactivate link");
    }
  };

  const activeLinks = shareLinks?.filter(l => l.is_active && !isPast(new Date(l.expires_at))) || [];
  const inactiveLinks = shareLinks?.filter(l => !l.is_active || isPast(new Date(l.expires_at))) || [];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl vault-gradient">
                <Link2 className="h-5 w-5 text-primary-foreground" />
              </div>
              My Share Links
            </h1>
            <p className="text-muted-foreground ml-[52px]">
              Track and manage all your generated share links
            </p>
          </div>
          {shareLinks && shareLinks.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1 text-xs py-1">
                <Check className="h-3 w-3 text-success" />
                {activeLinks.length} Active
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs py-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {inactiveLinks.length} Expired
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your share links...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-destructive font-medium">Error loading share links</p>
            </CardContent>
          </Card>
        ) : shareLinks && shareLinks.length > 0 ? (
          <div className="space-y-3">
            {shareLinks.map((link) => {
              const isExpired = isPast(new Date(link.expires_at));
              const isActive = link.is_active && !isExpired;
              const content = link.content;
              const category = (content as any)?.content_category || (content?.file_type === "video" ? "video" : "document");
              const Icon = categoryIcons[category] || FileText;

              return (
                <Card key={link.id} className={cn(
                  "vault-card-hover transition-all",
                  !isActive && "opacity-50 hover:opacity-70"
                )}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Content Icon */}
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                        isActive ? "bg-primary/15" : "bg-muted"
                      )}>
                        <Icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3 className="font-semibold truncate text-sm">{content?.title || "Deleted Content"}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            variant={isActive ? "default" : "secondary"}
                            className={cn(
                              "gap-1 text-xs",
                              isActive ? "bg-success/15 text-success border-success/30 hover:bg-success/20" : ""
                            )}
                          >
                            {!link.is_active ? (
                              <><Ban className="h-3 w-3" />Deactivated</>
                            ) : isExpired ? (
                              <><Clock className="h-3 w-3" />Expired</>
                            ) : (
                              <><Check className="h-3 w-3" />Active</>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {link.allowed_emails.length} recipient{link.allowed_emails.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                          <span className="text-border mx-1">•</span>
                          {isExpired 
                            ? `Expired ${formatDistanceToNow(new Date(link.expires_at), { addSuffix: true })}`
                            : `Expires ${format(new Date(link.expires_at), "MMM d, yyyy HH:mm")}`
                          }
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isActive && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => copyLink(link.share_token, link.id)}
                                >
                                  {copiedId === link.id ? (
                                    <Check className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                  Copy
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy share link to clipboard</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeactivate(link.id)}
                                  disabled={deactivateLink.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Deactivate this link</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {content && (
                          <Link to={`/viewer/${content.id}`}>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl vault-gradient-subtle mb-6">
                <Link2 className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No share links yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                When you generate share links from your library, they'll appear here for easy management.
              </p>
              <Link to="/dashboard">
                <Button className="gap-2 vault-gradient text-primary-foreground">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
