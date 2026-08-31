import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellSlashIcon,
  LinkIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FiltersBar,
  type DateRangeValue,
} from "@/components/shared/FiltersBar";
import {
  ExportButton,
  type ExportColumn,
} from "@/components/shared/ExportButton";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { notificationsService } from "@/services/notifications.service";
import { formatDateTime } from "@/utils/format";
import type { PushAudience, PushLog, PushLogStatus } from "@/types/domain";

const PAGE_SIZE = 10;

const statusVariant: Record<
  PushLogStatus,
  "secondary" | "info" | "success" | "warning" | "destructive"
> = {
  QUEUED: "warning",
  SCHEDULED: "info",
  SENT: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
};

const audienceLabel = (log: PushLog): string => {
  if (log.audience === "all") return "All users";
  if (log.audience === "topic") return `Topic: ${log.topic}`;
  // ponytail: history rows carry only the recipient's userId — show it short,
  // full id in the native tooltip. Resolve to email server-side if it matters.
  return `User: ${log.userId?.slice(0, 8)}…`;
};

const AudienceChip = ({ log }: { log: PushLog }): JSX.Element => {
  if (log.audience === "all") return <Badge variant="info">All users</Badge>;
  if (log.audience === "topic")
    return <Badge variant="secondary">#{log.topic}</Badge>;
  return (
    <Badge variant="outline" title={log.userId ?? undefined}>
      User {log.userId?.slice(0, 8)}…
    </Badge>
  );
};

const EXPORT_COLUMNS: ExportColumn[] = [
  {
    key: "createdAt",
    label: "Sent",
    format: (v) => formatDateTime(v as string | null),
  },
  { key: "sentBy", label: "By", format: (v) => (v as { name: string }).name },
  {
    key: "audience",
    label: "Audience",
    format: (_, row) => audienceLabel(row as unknown as PushLog),
  },
  { key: "type", label: "Type" },
  { key: "title", label: "Title" },
  { key: "body", label: "Body" },
  { key: "status", label: "Status" },
  { key: "successCount", label: "Delivered" },
  { key: "failureCount", label: "Failed" },
  {
    key: "scheduledAt",
    label: "Scheduled for",
    format: (v) => (v ? formatDateTime(v as string) : ""),
  },
  { key: "error", label: "Error" },
];

/** yyyy-MM-dd in the viewer's timezone, to match the date-range inputs. */
const localDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-CA");

export const HistoryTable = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PushLogStatus | "ALL">("ALL");
  const [audience, setAudience] = useState<PushAudience | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRangeValue>({ from: "", to: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "history", page],
    queryFn: ({ signal }) =>
      notificationsService.history({ page, limit: PAGE_SIZE }, signal),
    // Poll while any loaded row is still queued, stop once all have settled.
    refetchInterval: (query) =>
      query.state.data?.items.some((log) => log.status === "QUEUED")
        ? 8000
        : false,
  });

  // The history endpoint only paginates — these filters apply to the loaded page client-side.
  const term = search.trim().toLowerCase();
  const visible = (data?.items ?? []).filter((log) => {
    const day = localDay(log.createdAt);
    return (
      (status === "ALL" || log.status === status) &&
      (audience === "ALL" || log.audience === audience) &&
      (!range.from || day >= range.from) &&
      (!range.to || day <= range.to) &&
      (!term ||
        log.title.toLowerCase().includes(term) ||
        log.body.toLowerCase().includes(term) ||
        (log.topic ?? "").toLowerCase().includes(term))
    );
  });

  const hasFilters =
    status !== "ALL" ||
    audience !== "ALL" ||
    Boolean(term) ||
    Boolean(range.from || range.to);
  const filterSummary =
    [
      status !== "ALL" ? `Status: ${status}` : "",
      audience !== "ALL" ? `Audience: ${audience}` : "",
      term ? `Search: ${term}` : "",
      range.from || range.to
        ? `Dates: ${range.from || "…"} – ${range.to || "…"}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  const table = isLoading ? (
    <TableSkeleton />
  ) : visible.length === 0 ? (
    hasFilters ? (
      <EmptyState
        title="No sends match these filters"
        description="Try widening the date range or clearing the filters above."
      />
    ) : (
      <EmptyState
        title="No notifications sent yet"
        description="Compose your first notification above — it lands on users' devices within seconds and shows up here with its delivery outcome."
      />
    )
  ) : (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Notification</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead>Extras</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDateTime(log.createdAt)}
                  <p className="text-xs text-muted-foreground">
                    by {log.sentBy.name}
                  </p>
                  {log.scheduledAt && log.status === "SCHEDULED" && (
                    <p className="text-xs text-muted-foreground">
                      fires {formatDateTime(log.scheduledAt)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <AudienceChip log={log} />
                </TableCell>
                <TableCell
                  className="max-w-64"
                  title={`${log.title}\n\n${log.body}`}
                >
                  <p className="truncate text-sm font-medium">{log.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.body}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                  {log.status === "QUEUED" || log.status === "SCHEDULED" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <>
                      <span className="text-teal-600 dark:text-teal-400">
                        {log.successCount}
                      </span>
                      {log.failureCount > 0 && (
                        <span className="text-red-500">
                          {" "}
                          / {log.failureCount} failed
                        </span>
                      )}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {log.imageUrl && (
                      <PhotoIcon
                        className="h-4 w-4"
                        title={log.imageUrl}
                        aria-label="Has image"
                      />
                    )}
                    {log.route && (
                      <LinkIcon
                        className="h-4 w-4"
                        title={`Opens ${log.route}`}
                        aria-label={`Opens ${log.route}`}
                      />
                    )}
                    {log.silent && (
                      <BellSlashIcon
                        className="h-4 w-4"
                        title="Silent (data-only)"
                        aria-label="Silent"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariant[log.status]}
                    title={log.error ?? undefined}
                  >
                    {log.status === "QUEUED" && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    )}
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data && <Pagination meta={data.meta} onPageChange={setPage} />}
    </>
  );

  return (
    <>
      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search title, body, topic…",
        }}
        selects={[
          {
            key: "status",
            value: status,
            onChange: (value) => setStatus(value as PushLogStatus | "ALL"),
            options: [
              { value: "ALL", label: "All statuses" },
              { value: "QUEUED", label: "Queued" },
              { value: "SCHEDULED", label: "Scheduled" },
              { value: "SENT", label: "Sent" },
              { value: "PARTIAL", label: "Partial" },
              { value: "FAILED", label: "Failed" },
            ],
            placeholder: "Status",
            className: "sm:w-36",
          },
          {
            key: "audience",
            value: audience,
            onChange: (value) => setAudience(value as PushAudience | "ALL"),
            options: [
              { value: "ALL", label: "All audiences" },
              { value: "all", label: "Broadcast" },
              { value: "user", label: "Single user" },
              { value: "topic", label: "Topic" },
            ],
            placeholder: "Audience",
            className: "sm:w-36",
          },
        ]}
        dateRange={{ value: range, onChange: setRange }}
        onClearAll={() => {
          setSearch("");
          setStatus("ALL");
          setAudience("ALL");
          setRange({ from: "", to: "" });
        }}
      >
        <div className="ml-auto">
          <ExportButton
            rows={visible as unknown as Record<string, unknown>[]}
            columns={EXPORT_COLUMNS}
            fileName="notification-history"
            title="Notification send history"
            page={page}
            filterSummary={filterSummary}
          />
        </div>
      </FiltersBar>
      <Card>{table}</Card>
    </>
  );
};
