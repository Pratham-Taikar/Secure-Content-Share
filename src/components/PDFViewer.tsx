import { Loader2 } from "lucide-react";

interface PDFViewerProps {
  src: string;
  title: string;
}

export function PDFViewer({ src, title }: PDFViewerProps) {
  if (!src) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-card/90 backdrop-blur-sm border-b border-border z-10">
        <span className="text-sm text-foreground">{title}</span>
      </div>
      <iframe
        src={`${src}#toolbar=0`}
        className="w-full h-[80vh] pt-10"
        title={title}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
