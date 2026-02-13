import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAccessLogs, AccessEventType } from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History as HistoryIcon,
  Loader2,
  Upload,
  Link2,
  CheckCircle2,
  ShieldX,
  Clock,
  ExternalLink,
  Eye,
  RefreshCw,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const eventTypeConfig: Record<AccessEventType, { label: string; icon: typeof Upload; color: string; bgColor: string }> = {
  UPLOAD: { label: "Uploaded", icon: Upload, color: "text-primary", bgColor: "bg-primary/10" },
  LINK_CREATED: { label: "Link Created", icon: Link2, color: "text-success", bgColor: "bg-success/10" },
  ACCESS_GRANTED: { label: "Access Granted", icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
  ACCESS_DENIED: { label: "Denied", icon: ShieldX, color: "text-destructive", bgColor: "bg-destructive/10" },
  LINK_EXPIRED: { label: "Link Expired", icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  OWNER_ACCESS: { label: "Owner Access", icon: Eye, color: "text-primary", bgColor: "bg-primary/10" },
  URL_REFRESHED: { label: "URL Refreshed", icon: RefreshCw, color: "text-muted-foreground", bgColor: "bg-muted" },
  SUSPICIOUS_ACTIVITY: { label: "Suspicious", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

export default function History() {
  const [filterType, setFilterType] = useState<string>("all");
  
  const filter = filterType !== "all" ? { eventType: filterType as AccessEventType } : undefined;
  const { data: logs, isLoading, error } = useAccessLogs(filter);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl vault-gradient">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              Activity History
            </h1>
            <p className="text-muted-foreground ml-[52px]">
              Full audit trail of uploads, shares, and access events
            </p>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="UPLOAD">Uploads</SelectItem>
              <SelectItem value="LINK_CREATED">Links Created</SelectItem>
              <SelectItem value="ACCESS_GRANTED">Access Granted</SelectItem>
              <SelectItem value="ACCESS_DENIED">Access Denied</SelectItem>
              <SelectItem value="LINK_EXPIRED">Link Expired</SelectItem>
              <SelectItem value="OWNER_ACCESS">Owner Access</SelectItem>
              <SelectItem value="SUSPICIOUS_ACTIVITY">Suspicious Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-destructive font-medium">Error loading history</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
            </CardContent>
          </Card>
        ) : logs && logs.length > 0 ? (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Content</TableHead>
                  <TableHead className="font-semibold">Event</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Share Token</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const config = eventTypeConfig[log.event_type];
                  const Icon = config.icon;

                  return (
                    <TableRow key={log.id} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(log.accessed_at), "MMM d, yyyy")}
                        <br />
                        <span className="text-muted-foreground/60">{format(new Date(log.accessed_at), "HH:mm:ss")}</span>
                      </TableCell>
                      <TableCell>
                        {log.content ? (
                          <span className="text-sm truncate max-w-[200px] block">{log.content.title}</span>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-sm">Deleted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("gap-1.5 font-medium", config.color, config.bgColor, "border-transparent")}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[100px] block">
                          {log.share_token ? `${log.share_token.substring(0, 12)}...` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.content && (
                          <Link to={`/viewer/${log.content.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="border-dashed border-2 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl vault-gradient-subtle mb-6">
                <HistoryIcon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Your activity history will appear here as you upload, share, and access content.
              </p>
              <Link to="/dashboard">
                <Button variant="outline" className="gap-2">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
