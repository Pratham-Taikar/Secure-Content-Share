import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center animate-scale-in">
        <div className="flex justify-center mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl vault-gradient vault-glow">
            <Shield className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="text-8xl font-bold text-foreground mb-2 tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or may have been moved. Let's get you back on track.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button size="lg" className="gap-2 vault-gradient text-primary-foreground">
              <Home className="h-4 w-4" />
              Go to Library
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
