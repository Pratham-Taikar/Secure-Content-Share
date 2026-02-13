import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Login() {
  const { signIn, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  // Resend countdown effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(
        () => setResendCountdown(resendCountdown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnconfirmedEmail(null);

    const { error } = await signIn(email, password);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("email not confirmed")) {
        setUnconfirmedEmail(email);
        toast.error("Please confirm your email before logging in.");
      } else if (
        message.includes("rate limit") ||
        message.includes("too many requests")
      ) {
        toast.error("Too many login attempts. Please wait a few minutes.");
      } else if (message.includes("invalid login credentials")) {
        toast.error("Invalid email or password.");
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate(from, { replace: true });
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail || resendCountdown > 0) return;

    setResending(true);
    const { error } = await resendConfirmation(unconfirmedEmail);
    setResending(false);

    if (error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("rate limit") ||
        message.includes("too many requests")
      ) {
        toast.error(
          "Email rate limit exceeded. Please wait before requesting another link."
        );
        setResendCountdown(60);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Confirmation email resent! Please check your inbox.");
      setResendCountdown(60);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl vault-gradient vault-glow mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Safe-Stream-Share
          </h1>
          <p className="text-muted-foreground">
            Secure content distribution platform
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your secure content
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {unconfirmedEmail && (
                <Alert
                  variant="destructive"
                  className="bg-destructive/10 border-destructive/20 text-foreground"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Email not confirmed</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>Please check your inbox for the confirmation link.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={resending || resendCountdown > 0}
                      className="w-fit"
                    >
                      {resending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      ) : null}
                      {resendCountdown > 0
                        ? `Resend in ${resendCountdown}s`
                        : "Resend confirmation email"}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full vault-gradient text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
}
