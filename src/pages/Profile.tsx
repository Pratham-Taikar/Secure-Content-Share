import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Shield,
  Calendar,
  LogOut,
  Loader2,
  CheckCircle2,
  Clock,
  Lock,
  Globe,
  FileKey,
  Share2,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl vault-gradient">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            My Profile
          </h1>
          <p className="text-muted-foreground ml-[52px]">
            Your account details and security information
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* User Info Card */}
          <Card className="overflow-hidden">
            <div className="h-20 vault-gradient opacity-80" />
            <CardContent className="relative pt-0 -mt-10 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card border-4 border-card shadow-lg">
                      <span className="text-2xl font-bold text-primary">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="pb-1">
                      <h3 className="font-bold text-lg">
                        {profile?.full_name || "User"}
                      </h3>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Zap className="h-3 w-3" />
                        Active Account
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-muted/50">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{user?.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-muted/50">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Joined{" "}
                        {profile?.created_at
                          ? format(new Date(profile.created_at), "MMMM d, yyyy")
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-success/5 border border-success/20">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-success">Email verified</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="w-full mt-4 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-sm">Secure Session</p>
                  <p className="text-xs text-muted-foreground">Your session is encrypted end-to-end</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">HTTPS Enforced</p>
                  <p className="text-xs text-muted-foreground">All connections use TLS encryption</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Signed URLs</p>
                  <p className="text-xs text-muted-foreground">Content links auto-expire in 120 seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Architecture Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Lock, title: "Private Storage", desc: "All content stored in private encrypted buckets" },
                  { icon: Share2, title: "Email-Based Sharing", desc: "Share links restricted to specific emails" },
                  { icon: FileKey, title: "Expiring Links", desc: "Share links expire after your set time limit" },
                  { icon: Globe, title: "Fast Delivery", desc: "Global CDN for fast, secure content access" },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors group">
                    <item.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-medium mb-1 text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
