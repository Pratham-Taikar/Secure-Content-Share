import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Shield, Github, Heart } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Safe-Stream-Share</span>
              <span className="text-border">•</span>
              <span>Enterprise-grade content protection</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Built with</span>
              <Heart className="h-3 w-3 text-destructive fill-destructive" />
              <span>for secure sharing</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
