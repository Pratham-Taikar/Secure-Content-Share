import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { ContentCard } from "@/components/ContentCard";
import { useMyContents, ContentCategory, useDeleteContent } from "@/hooks/useContent";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  SortAsc,
  SortDesc,
  LayoutDashboard,
  Loader2,
  FileQuestion,
  Video,
  FileText,
  Upload,
  Plus,
  Copy,
  Check,
  X,
  Clock,
  Music,
  Image,
  Sparkles,
  FolderOpen,
  Share2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type SortOrder = "newest" | "oldest";
type FilterCategory = "all" | ContentCategory;

const ACCEPTED_TYPES = [
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/x-m4a", "audio/mp4",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
].join(",");

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("image/")) return Image;
  return FileText;
}

export default function Dashboard() {
  const { session, user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Share link modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContentId, setShareContentId] = useState<string | null>(null);
  const [shareContentTitle, setShareContentTitle] = useState("");
  const [shareEmails, setShareEmails] = useState("");
  const [shareExpiryPreset, setShareExpiryPreset] = useState("60");
  const [shareCustomExpiry, setShareCustomExpiry] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const deleteContent = useDeleteContent();

  const catFilter = filterCategory === "all" ? undefined : filterCategory;
  const { data: contents, isLoading, error, refetch } = useMyContents({
    category: catFilter,
    search: search || undefined,
  });

  const sortedContents = contents?.slice().sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !session?.access_token) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("upload-content", {
        body: {
          title: uploadTitle,
          description: uploadDescription || null,
          fileName: uploadFile.name,
          mimeType: uploadFile.type,
          sizeBytes: uploadFile.size,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.uploadUrl) throw new Error("No upload URL returned");

      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload file");

      toast.success("Content uploaded successfully!");
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadFile(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openShareModal = (contentId: string, title: string) => {
    setShareContentId(contentId);
    setShareContentTitle(title);
    setShareEmails("");
    setShareExpiryPreset("60");
    setShareCustomExpiry("");
    setGeneratedLink(null);
    setShareOpen(true);
  };

  const getExpiryMinutes = (): number => {
    if (shareExpiryPreset === "custom") {
      const val = parseInt(shareCustomExpiry);
      return isNaN(val) || val < 1 ? 60 : val;
    }
    return parseInt(shareExpiryPreset);
  };

  const handleGenerateLink = async () => {
    if (!shareContentId || !shareEmails.trim()) {
      toast.error("Please enter at least one email address");
      return;
    }

    const emails = shareEmails.split(",").map((e) => e.trim()).filter((e) => e);
    if (emails.length === 0) {
      toast.error("Please enter valid email addresses");
      return;
    }

    const expiryMinutes = getExpiryMinutes();

    setGeneratingLink(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-share-link", {
        body: { contentId: shareContentId, allowedEmails: emails, expiryMinutes },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.shareToken) throw new Error("No share token returned");

      setGeneratedLink(data.shareToken);
      toast.success("Access token generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Access token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteContentId) {
      try {
        await deleteContent.mutateAsync(deleteContentId);
        toast.success("Content deleted successfully");
        setDeleteOpen(false);
        setDeleteContentId(null);
      } catch {
        toast.error("Failed to delete content");
      }
    }
  };

  const expiryMinutesDisplay = getExpiryMinutes();
  const expiryLabel =
    expiryMinutesDisplay >= 1440
      ? `${expiryMinutesDisplay / 1440} day(s)`
      : expiryMinutesDisplay >= 60
      ? `${expiryMinutesDisplay / 60} hour(s)`
      : `${expiryMinutesDisplay} minutes`;

  const firstName = user?.email?.split("@")[0] || "there";

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Welcome back</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Hey, <span className="text-primary">{firstName}</span> 👋
            </h1>
            <p className="text-muted-foreground">
              Upload, manage, and securely share your content from your library.
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} size="lg" className="gap-2 vault-gradient text-primary-foreground shadow-vault-sm hover:shadow-vault transition-shadow">
            <Plus className="h-5 w-5" />
            Upload Content
          </Button>
        </div>

        {/* Quick Stats */}
        {sortedContents && sortedContents.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Files", value: sortedContents.length, icon: FolderOpen },
              { label: "Videos", value: sortedContents.filter(c => c.content_category === "video").length, icon: Video },
              { label: "Images", value: sortedContents.filter(c => c.content_category === "image").length, icon: Image },
              { label: "Documents", value: sortedContents.filter(c => c.content_category === "document").length, icon: FileText },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card/50 border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search your content..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Tabs value={filterCategory} onValueChange={(v) => setFilterCategory(v as FilterCategory)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-5 h-10">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="video" className="gap-1 text-xs"><Video className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="audio" className="gap-1 text-xs"><Music className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="image" className="gap-1 text-xs"><Image className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="document" className="gap-1 text-xs"><FileText className="h-3.5 w-3.5" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest"><span className="flex items-center gap-2"><SortDesc className="h-4 w-4" />Newest</span></SelectItem>
              <SelectItem value="oldest"><span className="flex items-center gap-2"><SortAsc className="h-4 w-4" />Oldest</span></SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your library...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <FileQuestion className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Something went wrong</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{error instanceof Error ? error.message : "We couldn't load your content. Please try again."}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">Try Again</Button>
          </div>
        ) : sortedContents && sortedContents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
            {sortedContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onGenerateLink={() => openShareModal(content.id, content.title)}
                onDelete={() => { setDeleteContentId(content.id); setDeleteOpen(true); }}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl vault-gradient-subtle mb-6">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your library is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Start by uploading your first file. We support videos, audio, images, and documents.
              </p>
              <Button onClick={() => setUploadOpen(true)} size="lg" className="gap-2 vault-gradient text-primary-foreground">
                <Plus className="h-5 w-5" />
                Upload Your First File
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Content
            </DialogTitle>
            <DialogDescription>Upload a file to your secure library. It will be encrypted and stored safely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Give your content a name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Add an optional description..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" className="w-full h-28 border-dashed border-2 gap-2 hover:bg-primary/5 hover:border-primary/30 transition-colors" onClick={() => fileInputRef.current?.click()}>
                {uploadFile ? (
                  <div className="flex items-center gap-3">
                    {(() => { const IC = getFileIcon(uploadFile.type); return <IC className="h-6 w-6 text-primary" />; })()}
                    <div className="text-left">
                      <span className="truncate max-w-[180px] block text-sm font-medium">{uploadFile.name}</span>
                      <span className="text-xs text-muted-foreground">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-2" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to select a file</span>
                    <span className="text-xs text-muted-foreground/60">Video, Audio, Image, PDF, DOC, PPT, TXT</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadTitle || uploading} className="vault-gradient text-primary-foreground">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</> : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Link Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Content
            </DialogTitle>
            <DialogDescription>Generate a secure, time-limited access token for "{shareContentTitle}"</DialogDescription>
          </DialogHeader>
          {generatedLink ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm font-medium text-success mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Access Token Generated!
                </p>
                <label className="text-xs text-muted-foreground mb-1 block">Share this token with your recipients — they can paste it on the Access Content page</label>
                <div className="flex items-center gap-2">
                  <Input value={generatedLink} readOnly className="text-xs font-mono" />
                  <Button size="icon" onClick={copyToClipboard} className={copied ? "bg-success hover:bg-success" : ""}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                This token expires in {expiryLabel}
              </p>
              <DialogFooter>
                <Button onClick={() => setShareOpen(false)} className="w-full">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emails">Recipient Emails *</Label>
                <Textarea id="emails" value={shareEmails} onChange={(e) => setShareEmails(e.target.value)} placeholder="email1@example.com, email2@example.com" rows={3} />
                <p className="text-xs text-muted-foreground">Only these email addresses will be able to access the content</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Link Expiry</Label>
                <Select value={shareExpiryPreset} onValueChange={setShareExpiryPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {shareExpiryPreset === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={1}
                      max={10080}
                      placeholder="Minutes"
                      value={shareCustomExpiry}
                      onChange={(e) => setShareCustomExpiry(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">minutes (max 7 days)</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerateLink} disabled={generatingLink || !shareEmails.trim()} className="vault-gradient text-primary-foreground">
                  {generatingLink ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : "Generate Link"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone. All share links for this content will also be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteContent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
