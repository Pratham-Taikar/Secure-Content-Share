import { VideoPlayer } from "@/components/VideoPlayer";
import { PDFViewer } from "@/components/PDFViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ZoomIn, ZoomOut, RotateCcw, Music, FileText } from "lucide-react";
import { useState } from "react";

interface ContentViewerProps {
  src: string;
  title: string;
  contentCategory: string;
  mimeType?: string | null;
  fileExtension?: string | null;
}

export function ContentViewer({ src, title, contentCategory, mimeType, fileExtension }: ContentViewerProps) {
  const [zoom, setZoom] = useState(1);

  if (!src) return null;

  switch (contentCategory) {
    case "video":
      return <VideoPlayer src={src} title={title} />;

    case "audio":
      return (
        <Card className="overflow-hidden">
          <div className="h-1 vault-gradient" />
          <CardContent className="p-8 flex flex-col items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
              <Music className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold">{title}</p>
              {fileExtension && (
                <Badge variant="outline" className="uppercase text-xs font-mono">.{fileExtension}</Badge>
              )}
            </div>
            <div className="w-full max-w-lg">
              <audio
                controls
                autoPlay
                className="w-full"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              >
                <source src={src} type={mimeType || "audio/mpeg"} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </CardContent>
        </Card>
      );

    case "image":
      return (
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <div className="absolute top-3 right-3 z-10 flex gap-1.5">
              <Button size="icon" variant="secondary" className="h-9 w-9 bg-background/80 backdrop-blur-sm" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" className="h-9 w-9 bg-background/80 backdrop-blur-sm" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" className="h-9 w-9 bg-background/80 backdrop-blur-sm" onClick={() => setZoom(1)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            {zoom !== 1 && (
              <Badge className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm text-foreground">
                {Math.round(zoom * 100)}%
              </Badge>
            )}
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-muted/20 p-4 min-h-[300px]">
              <img
                src={src}
                alt={title}
                className="max-w-full transition-transform duration-200 rounded-sm"
                style={{ transform: `scale(${zoom})` }}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            </div>
          </CardContent>
        </Card>
      );

    case "document":
      if (mimeType === "application/pdf") {
        return <PDFViewer src={src} title={title} />;
      }
      return (
        <Card className="overflow-hidden">
          <div className="h-1 vault-gradient" />
          <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">
                This document type ({fileExtension || "unknown"}) can't be previewed in the browser.
              </p>
            </div>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 vault-gradient text-primary-foreground">
                <Download className="h-5 w-5" />
                Download File
              </Button>
            </a>
            <p className="text-xs text-muted-foreground">
              This download link expires in 120 seconds
            </p>
          </CardContent>
        </Card>
      );

    default:
      return <PDFViewer src={src} title={title} />;
  }
}
