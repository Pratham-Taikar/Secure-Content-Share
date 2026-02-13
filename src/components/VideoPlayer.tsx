import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title: string;
}

export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Load video when src changes
    if (videoRef.current && src) {
      videoRef.current.load();
    }
  }, [src]);

  if (!src) {
    return (
      <div className="flex items-center justify-center aspect-video bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      <video
        ref={videoRef}
        controls
        className="w-full aspect-video"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 rounded-md backdrop-blur-sm">
        <span className="text-sm text-white/90">{title}</span>
      </div>
    </div>
  );
}
