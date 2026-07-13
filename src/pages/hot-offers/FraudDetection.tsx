import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
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
import { hotOffersService } from "@/services/hot-offers.service";
import { formatDateTime } from "@/utils/format";

const typeBadge: Record<string, "destructive" | "warning" | "secondary"> = {
  DUPLICATE_IMAGE: "destructive",
  DAILY_LIMIT: "warning",
  EXCESS_PENDING: "warning",
  MANUAL: "secondary",
};

const typeLabel = (type: string): string =>
  type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const USER_COLUMNS: ExportColumn[] = [
  { key: "user", label: "Name", format: (v) => (v as { name: string }).name },
  { key: "user", label: "Email", format: (v) => (v as { email: string }).email },
  { key: "events", label: "Events" },
  { key: "score", label: "Score" },
  { key: "flagged", label: "Flagged", format: (v) => (v ? "Yes" : "No") },
];

const LOG_COLUMNS: ExportColumn[] = [
  { key: "createdAt", label: "When", format: (v) => formatDateTime(v as string | null) },
  { key: "user", label: "User", format: (v) => (v as { name: string }).name },
  { key: "user", label: "Email", format: (v) => (v as { email: string }).email },
  { key: "type", label: "Type", format: (v) => typeLabel(v as string) },
  { key: "score", label: "Score" },
  { key: "detail", label: "Detail" },
];

export const FraudDetection = (): JSX.Element => {
  const { data, isLoading } = useQuery({
    queryKey: ["hot-offers", "fraud"],
    queryFn: hotOffersService.fraudOverview,
  });

  // ponytail: the fraud endpoint has no query params — search/flag filters are client-side.
  const [search, setSearch] = useState("");
  const [flagFilter, setFlagFilter] = useState<"ALL" | "FLAGGED" | "OK">("ALL");

  if (isLoading) return <TableSkeleton />;

  const term = search.trim().toLowerCase();
  const matchesUser = (user: { name: string; email: string }): boolean =>
    !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);

  const users = (data?.flaggedUsers ?? []).filter(
    (row) =>
      matchesUser(row.user) &&
      (flagFilter === "ALL" || (flagFilter === "FLAGGED" ? row.flagged : !row.flagged)),
  );
  const logs = (data?.recentLogs ?? []).filter((log) => matchesUser(log.user));

  const filterSummary =
    [flagFilter !== "ALL" ? `Status: ${flagFilter}` : "", term ? `Search: ${term}` : ""]
      .filter(Boolean)
      .join(" · ") || undefined;

  const flaggedCount = data?.flaggedUsers.filter((u) => u.flagged).length ?? 0;

  return (
    <div className="space-y-4">
      <FiltersBar
        className="mb-0"
        search={{ value: search, onChange: setSearch, placeholder: "Search by user or email…" }}
        selects={[
          {
            key: "flagged",
            value: flagFilter,
            onChange: (value) => setFlagFilter(value as typeof flagFilter),
            options: [
              { value: "ALL", label: "All users" },
              { value: "FLAGGED", label: "Flagged only" },
              { value: "OK", label: "Not flagged" },
            ],
            placeholder: "Flag status",
          },
        ]}
        onClearAll={() => {
          setSearch("");
          setFlagFilter("ALL");
        }}
      />

      <Card className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-950">
          <ShieldExclamationIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Flagged users</p>
          <p className="text-2xl font-semibold">
            {flaggedCount}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (score ≥ {data?.flagThreshold ?? "—"})
            </span>
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Users by fraud score</p>
            <ExportButton
              rows={users as unknown as Record<string, unknown>[]}
              columns={USER_COLUMNS}
              fileName="fraud-users"
              title="Users by fraud score"
              filterSummary={filterSummary}
            />
          </div>
          {users.length === 0 ? (
            <EmptyState title="No fraud signals" description="Suspicious activity will surface here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((row) => (
                  <TableRow key={row.user.id}>
                    <TableCell className="max-w-48">
                      <p className="truncate text-sm font-medium">{row.user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.user.email}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.events}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{row.score}</TableCell>
                    <TableCell>
                      {row.flagged ? (
                        <Badge variant="destructive">Flagged</Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Recent fraud events</p>
            <ExportButton
              rows={logs as unknown as Record<string, unknown>[]}
              columns={LOG_COLUMNS}
              fileName="fraud-events"
              title="Recent fraud events"
              filterSummary={term ? `Search: ${term}` : undefined}
            />
          </div>
          {logs.length === 0 ? (
            <EmptyState title="Nothing logged" description="Fraud events appear here as they happen." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">+Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-sm">{log.user.name}</TableCell>
                    <TableCell>
                      <Badge variant={typeBadge[log.type] ?? "secondary"} title={log.detail ?? undefined}>
                        {typeLabel(log.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{log.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};
