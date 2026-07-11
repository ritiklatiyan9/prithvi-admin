import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notificationsService } from "@/services/notifications.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/utils/format";
import type { NotificationType, PushLog, PushLogStatus } from "@/types/domain";
import { SendNotificationDialog } from "./SendNotificationDialog";

const PAGE_SIZE = 10;

const typeBadge: Record<NotificationType, "secondary" | "info" | "warning" | "success"> = {
  SYSTEM: "secondary",
  CAMPAIGN: "info",
  CLAIM: "warning",
  WALLET: "success",
};

const statusBadge: Record<
  PushLogStatus,
  "secondary" | "info" | "success" | "warning" | "destructive"
> = {
  QUEUED: "secondary",
  SCHEDULED: "info",
  SENT: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
};

const audienceLabel = (log: PushLog): string => {
  if (log.audience === "all") return "All users";
  if (log.audience === "topic") return `Topic: ${log.topic}`;
  return `User: ${log.userId?.slice(0, 8)}…`;
};

const HistoryTable = (): JSX.Element => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "history", page],
    queryFn: () => notificationsService.history({ page, limit: PAGE_SIZE }),
  });

  if (isLoading) return <TableSkeleton />;
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="No notifications sent yet"
        description="Sends from this dashboard appear here with their delivery outcome."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDateTime(log.createdAt)}
                  {log.scheduledAt && log.status === "SCHEDULED" && (
                    <p className="text-xs text-muted-foreground">
                      fires {formatDateTime(log.scheduledAt)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{log.sentBy.name}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{audienceLabel(log)}</TableCell>
                <TableCell>
                  <Badge variant={typeBadge[log.type]}>{log.type}</Badge>
                </TableCell>
                <TableCell className="max-w-56">
                  <p className="truncate text-sm font-medium">{log.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.silent ? "Silent (data-only)" : log.body}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm">
                  {log.successCount}
                  {log.failureCount > 0 && (
                    <span className="text-red-500"> / {log.failureCount} failed</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadge[log.status]} title={log.error ?? undefined}>
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination meta={data.meta} onPageChange={setPage} />
    </>
  );
};

export const NotificationsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canSend = user?.role === "SUPER_ADMIN";

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [senderOpen, setSenderOpen] = useState(false);
  const [view, setView] = useState<"inbox" | "history">("inbox");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", { page, unreadOnly }],
    queryFn: () => notificationsService.list({ page, limit: PAGE_SIZE, unreadOnly }),
    enabled: view === "inbox",
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: invalidate,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const markAllRead = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      invalidate();
      toast.success("All notifications marked as read");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Your notification inbox and the user notification sender."
        actions={
          <>
            {view === "inbox" && (
              <Button
                variant="outline"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckIcon className="mr-1.5 h-4 w-4" /> Mark all read
              </Button>
            )}
            {/* The server enforces SUPER_ADMIN on /send — this just hides a button that would 403. */}
            {canSend && (
              <Button onClick={() => setSenderOpen(true)}>
                <PaperAirplaneIcon className="mr-1.5 h-4 w-4" /> Send notification
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant={view === "inbox" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("inbox")}
        >
          Inbox
        </Button>
        <Button
          variant={view === "history" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("history")}
        >
          Send history
        </Button>
        {view === "inbox" && (
          <div className="ml-4 flex items-center gap-2">
            <Switch
              id="unreadOnly"
              checked={unreadOnly}
              onCheckedChange={(checked) => {
                setUnreadOnly(checked);
                setPage(1);
              }}
            />
            <Label htmlFor="unreadOnly" className="cursor-pointer">
              Unread only
            </Label>
          </div>
        )}
      </div>

      <Card>
        {view === "history" ? (
          <HistoryTable />
        ) : isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No notifications"
            description={unreadOnly ? "You're all caught up." : "Nothing here yet."}
          />
        ) : (
          <>
            <ul className="divide-y">
              {data.items.map((notification) => {
                const unread = notification.readAt === null;
                return (
                  <li
                    key={notification.id}
                    className={`flex items-start gap-3 p-4 ${unread ? "bg-muted/40" : ""}`}
                  >
                    <span
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                        unread ? "bg-blue-500" : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm ${unread ? "font-semibold" : "font-medium"}`}>
                          {notification.title}
                        </p>
                        <Badge variant={typeBadge[notification.type]}>{notification.type}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {unread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead.mutate(notification.id)}
                        disabled={markRead.isPending}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            {data && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </Card>

      <SendNotificationDialog open={senderOpen} onOpenChange={setSenderOpen} />
    </div>
  );
};
