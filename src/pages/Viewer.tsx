import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ContentViewer } from "@/components/ContentViewer";
import { SecureViewerWrapper } from "@/components/SecureViewerWrapper";
import { ExpiryTimer } from "@/components/ExpiryTimer";
import { useContent } from "@/hooks/useContent";
import { useOwnerSignedUrl } from "@/hooks/useOwnerSignedUrl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Shield,
  Lock,
  Video,
  FileText,
  Music,
  Image,
  Loader2,
  AlertTriangle,
  Unlock,
} from "lucide-react";

const categoryIcons: Record<string, typeof Video> = {
  video: Video,
  audio: Music,
  image: Image,
  document: FileText,
};

const categoryLabels: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  image: "Image",
  document: "Document",
};

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const { data: content, isLoading: contentLoading, error: contentError } = useContent(id || "");
  const { data: ownerData, signedUrl, loading: urlLoading, error: urlError, timeRemaining, isExpired, refresh } = useOwnerSignedUrl(id || "");

  if (contentLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      </Layout>
    );
  }

  if (contentError || !content) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Content Not Found</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            The content you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const category = content.content_category || "document";
  const Icon = categoryIcons[category] || FileText;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>

        {/* Owner Banner */}
        <Card className="bg-primary/5 border-primary/20 overflow-hidden">
          <div className="h-0.5 vault-gradient" />
          <CardContent className="flex items-center gap-3 p-4">
            <Unlock className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Owner Access — No Restrictions</p>
              <p className="text-xs text-muted-foreground">
                You're viewing your own content. No watermarks or security restrictions applied.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              Owner
            </Badge>
          </CardContent>
        </Card>

        {/* Content Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Icon className="h-3 w-3" />
              {categoryLabels[category] || "Document"}
            </Badge>
            {content.file_extension && (
              <Badge variant="outline" className="uppercase text-xs font-mono">
                .{content.file_extension}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{content.title}</h1>
          {content.description && (
            <p className="text-muted-foreground">{content.description}</p>
          )}
        </div>

        {/* Expiry Timer */}
        <ExpiryTimer
          timeRemaining={timeRemaining}
          isExpired={isExpired}
          onRefresh={refresh}
          loading={urlLoading}
        />

        {/* Content */}
        {urlError ? (
          <Card className="border-destructive/30 overflow-hidden">
            <div className="h-1 bg-destructive" />
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="font-bold text-lg mb-2">Error Loading Content</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">{urlError}</p>
              <Button onClick={refresh} className="vault-gradient text-primary-foreground">Try Again</Button>
            </CardContent>
          </Card>
        ) : isExpired ? (
          <Card className="border-warning/30 overflow-hidden">
            <div className="h-1 bg-warning" />
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Lock className="h-10 w-10 text-warning mb-4" />
              <h3 className="font-bold text-lg mb-2">Access Expired</h3>
              <p className="text-sm text-muted-foreground mb-6">Your signed URL has expired. Click below to get a fresh one.</p>
              <Button onClick={refresh} disabled={urlLoading} className="vault-gradient text-primary-foreground gap-2">
                {urlLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Refresh Access
              </Button>
            </CardContent>
          </Card>
        ) : signedUrl ? (
          <SecureViewerWrapper contentId={id} isOwnerAccess={true}>
            <ContentViewer
              src={signedUrl}
              title={content.title}
              contentCategory={category}
              mimeType={content.mime_type}
              fileExtension={content.file_extension}
            />
          </SecureViewerWrapper>
        ) : null}
      </div>
    </Layout>
  );
}
