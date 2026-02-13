import { Link } from "react-router-dom";
import { Content } from "@/hooks/useContent";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Play, FileText, Eye, Share2, Trash2, Music, Image, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ContentCardProps {
  content: Content;
  onGenerateLink?: () => void;
  onDelete?: () => void;
}

const categoryConfig: Record<string, { icon: typeof Play; label: string; color: string; bgGradient: string }> = {
  video: { icon: Play, label: "Video", color: "text-primary", bgGradient: "from-primary/20 to-primary/5" },
  audio: { icon: Music, label: "Audio", color: "text-accent-foreground", bgGradient: "from-accent/30 to-accent/10" },
  image: { icon: Image, label: "Image", color: "text-success", bgGradient: "from-success/20 to-success/5" },
  document: { icon: FileText, label: "Document", color: "text-accent-foreground", bgGradient: "from-accent/20 to-accent/5" },
};

export function ContentCard({ content, onGenerateLink, onDelete }: ContentCardProps) {
  const category = content.content_category || "document";
  const config = categoryConfig[category] || categoryConfig.document;
  const Icon = config.icon;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Card className="group overflow-hidden vault-card-hover bg-card border-border hover:shadow-vault-sm">
      {/* Thumbnail Area */}
      <div className={cn("relative aspect-[16/10] overflow-hidden bg-gradient-to-br", config.bgGradient)}>
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/30 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Icon className={cn("h-8 w-8", config.color)} />
          </div>
        </div>
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur-md text-xs font-medium">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          {content.file_extension && (
            <Badge variant="outline" className="bg-background/80 backdrop-blur-md uppercase text-[10px] font-mono tracking-wider">
              .{content.file_extension}
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-4 space-y-1.5">
        <h3 className="font-semibold text-foreground line-clamp-1 text-sm group-hover:text-primary transition-colors">
          {content.title}
        </h3>
        {content.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{content.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">No description</p>
        )}
      </CardContent>

      {/* Footer */}
      <CardFooter className="px-4 pb-4 pt-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}</span>
          {content.size_bytes && (
            <>
              <span className="text-border">•</span>
              <span className="font-mono">{formatFileSize(content.size_bytes)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 w-full">
          {onGenerateLink && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 flex-1 text-xs" onClick={onGenerateLink}>
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a secure share link</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={`/viewer/${content.id}`} className="flex-1">
                <Button size="sm" className="gap-1.5 vault-gradient text-primary-foreground w-full text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  Open
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>View content as owner</TooltipContent>
          </Tooltip>
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete content</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
