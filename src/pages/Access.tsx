import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ContentViewer } from "@/components/ContentViewer";
import { SecureViewerWrapper } from "@/components/SecureViewerWrapper";
import { ExpiryTimer } from "@/components/ExpiryTimer";
import { useSharedContent } from "@/hooks/useSignedUrl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Search,
  Loader2,
  Clock,
  Shield,
  Lock,
  Video,
  FileText,
  Music,
  Image,
  XCircle,
  ArrowRight,
  KeyRound,
  LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, typeof Video> = {
  video: Video,
  audio: Music,
  image: Image,
  document: FileText,
};

export default function Access() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState("");
  const [activeToken, setActiveToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setActiveToken(tokenFromUrl);
      setInputValue(tokenFromUrl);
    }
  }, [searchParams]);

  const { data, loading, error, errorCode, timeRemaining, isExpired, refresh } = useSharedContent(activeToken);

  const extractToken = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      const token = url.searchParams.get("token");
      if (token) return token;
    } catch {}
    const pathMatch = trimmed.match(/\/access\?token=([a-fA-F0-9]+)/);
    if (pathMatch) return pathMatch[1];
    if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return trimmed;
    return trimmed;
  };

  const handleAccess = () => {
    const token = extractToken(inputValue);
    if (token) {
      setActiveToken(token);
      setSearchParams({ token });
    }
  };

  const clearAccess = () => {
    setActiveToken(null);
    setInputValue("");
    setSearchParams({});
  };

  const category = data?.contentCategory || (data?.fileType === "video" ? "video" : "document");
  const Icon = categoryIcons[category] || FileText;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl vault-gradient">
              <KeyRound className="h-5 w-5 text-primary-foreground" />
            </div>
            Access Content
          </h1>
          <p className="text-muted-foreground ml-[52px]">Enter a share link or token to view shared content</p>
        </div>

        {/* Input Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Paste your share link or token here..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAccess()}
                  className="pl-10 h-11"
                />
              </div>
              <Button onClick={handleAccess} disabled={!inputValue.trim() || loading} size="lg" className="vault-gradient text-primary-foreground gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" />Access</>}
              </Button>
              {activeToken && (
                <Button variant="outline" size="lg" onClick={clearAccess}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {activeToken && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying access...</p>
              </div>
            ) : error ? (
              <Card className="border-destructive/30 overflow-hidden">
                <div className="h-1 bg-destructive" />
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className={cn("flex h-20 w-20 items-center justify-center rounded-2xl mb-6", errorCode === "LINK_EXPIRED" ? "bg-warning/15" : "bg-destructive/15")}>
                    {errorCode === "LINK_EXPIRED" ? <Clock className="h-10 w-10 text-warning" /> : errorCode === "EMAIL_NOT_ALLOWED" ? <Lock className="h-10 w-10 text-destructive" /> : <XCircle className="h-10 w-10 text-destructive" />}
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    {errorCode === "LINK_EXPIRED" ? "This Link Has Expired" : errorCode === "EMAIL_NOT_ALLOWED" ? "Access Denied" : "Something Went Wrong"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-2">{error}</p>
                  {errorCode === "LINK_EXPIRED" && <p className="text-sm text-muted-foreground mb-6">Ask the content owner to generate a new share link.</p>}
                  {errorCode === "EMAIL_NOT_ALLOWED" && <p className="text-sm text-muted-foreground mb-6">Your email address isn't in the allowed list. Contact the content owner.</p>}
                  <Button variant="outline" onClick={clearAccess} className="gap-2">Try Another Link</Button>
                </CardContent>
              </Card>
            ) : data ? (
              <div className="space-y-6 animate-fade-in">
                <Card className="bg-primary/5 border-primary/20 overflow-hidden">
                  <div className="h-0.5 vault-gradient" />
                  <CardContent className="flex items-center gap-3 p-4">
                    <Shield className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Protected Shared Access</p>
                      <p className="text-xs text-muted-foreground">This content is shared via a time-limited secure link. Security restrictions are active.</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">Shared</Badge>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <Icon className="h-3 w-3" />
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Badge>
                    {data.fileExtension && <Badge variant="outline" className="uppercase text-xs font-mono">.{data.fileExtension}</Badge>}
                  </div>
                  <h2 className="text-2xl font-bold">{data.title}</h2>
                  {data.description && <p className="text-muted-foreground">{data.description}</p>}
                </div>

                <ExpiryTimer timeRemaining={timeRemaining} isExpired={isExpired} onRefresh={refresh} loading={loading} showRefresh={!isExpired} />

                {isExpired && (
                  <Card className="border-warning/30 overflow-hidden">
                    <div className="h-1 bg-warning" />
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Clock className="h-8 w-8 text-warning mb-4" />
                      <h3 className="font-semibold mb-2">Access Link Expired</h3>
                      <p className="text-sm text-muted-foreground max-w-md mb-4">Your secure access has expired. Click below to refresh.</p>
                      <Button onClick={refresh} disabled={loading} className="vault-gradient text-primary-foreground gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}Refresh Access
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {!isExpired && data.signedUrl && (
                  <SecureViewerWrapper isOwnerAccess={false}>
                    <ContentViewer
                      src={data.signedUrl}
                      title={data.title}
                      contentCategory={category}
                      mimeType={data.mimeType}
                      fileExtension={data.fileExtension}
                    />
                  </SecureViewerWrapper>
                )}
              </div>
            ) : null}
          </>
        )}

        {!activeToken && (
          <Card className="border-dashed border-2 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl vault-gradient-subtle mb-6">
                <Share2 className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Access Shared Content</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Paste a share link you received from a content owner above to securely access their shared content.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
