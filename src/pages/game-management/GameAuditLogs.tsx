import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ExportButton,
  type ExportColumn,
} from "@/components/shared/ExportButton";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ludoAdminService } from "@/services/ludo-admin.service";
import type { GameAuditEntry } from "@/types/ludo-admin";
import { formatDateTime } from "@/utils/format";
import {
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  JsonBlock,
  SectionError,
} from "./shared";
import { userLabel } from "./utils";

const PAGE_SIZE = 25;

const EXPORT_COLUMNS: ExportColumn[] = [
  {
    key: "createdAt",
    label: "When",
    format: (value) => formatDateTime(value as string | null),
  },
  {
    key: "admin",
    label: "Admin",
    format: (value, row) =>
      userLabel(value as GameAuditEntry["admin"]) !== "Unknown player"
        ? userLabel(value as GameAuditEntry["admin"])
        : String(row.adminEmail ?? row.adminId ?? ""),
  },
  { key: "action", label: "Action" },
  { key: "targetType", label: "Target type" },
  { key: "targetId", label: "Target ID" },
  { key: "ip", label: "IP" },
  { key: "userAgent", label: "Device / user agent" },
];

export const GameAuditLogs = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GameAuditEntry | null>(null);

  const logs = useQuery({
    queryKey: ["game-admin", "audit", { page, search }],
    queryFn: ({ signal }) =>
      ludoAdminService.auditLogs(
        { page, limit: PAGE_SIZE, search: search.trim() || undefined },
        signal,
      ),
    refetchInterval: 30_000,
  });

  const term = search.trim().toLowerCase();
  const rows = (logs.data?.items ?? []).filter((entry) => {
    if (!term) return true;
    return [
      entry.adminEmail,
      entry.adminId,
      entry.admin ? userLabel(entry.admin) : null,
      entry.action,
      entry.targetType,
      entry.targetId,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Game audit logs</h2>
        <p className="text-sm text-muted-foreground">
          Immutable administrative changes with before/after values and request
          metadata.
        </p>
      </div>

      <FiltersBar
        className="mb-0"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Admin, action, user or room…",
          className: "sm:w-80",
        }}
        onClearAll={() => {
          setSearch("");
          setPage(1);
        }}
      >
        <ExportButton
          className="ml-auto"
          rows={rows as unknown as Record<string, unknown>[]}
          columns={EXPORT_COLUMNS}
          fileName="ludo-admin-audit"
          title="Ludo Admin Audit Log"
          page={page}
          filterSummary={search.trim() ? `Search: ${search.trim()}` : undefined}
        />
      </FiltersBar>

      <Card>
        {logs.isLoading ? (
          <TableSkeleton rows={9} />
        ) : logs.isError && !logs.data ? (
          <SectionError
            retry={() => void logs.refetch()}
            title="Could not load audit logs"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No audit entries found"
            description="Game configuration and moderation changes appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt ?? null)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">
                      {entry.admin
                        ? userLabel(entry.admin)
                        : (entry.adminEmail ?? entry.adminId ?? "System")}
                    </TableCell>
                    <TableCell>
                      <GameStatusBadge status={entry.action} />
                    </TableCell>
                    <TableCell className="max-w-52">
                      <p className="truncate text-sm">
                        {entry.targetType ?? "—"}
                      </p>
                      <code className="block truncate text-[11px] text-muted-foreground">
                        {entry.targetId ?? "—"}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-32 truncate font-mono text-xs text-muted-foreground">
                      {entry.ip ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.previousValue !== undefined ||
                      entry.newValue !== undefined
                        ? "Recorded"
                        : "Metadata only"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(entry)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {logs.data && (
          <Pagination meta={logs.data.meta} onPageChange={setPage} />
        )}
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit entry</DialogTitle>
            <DialogDescription>
              Immutable backend record. Sensitive credentials are never rendered
              here.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <DetailGrid>
                <DetailItem label="Action">
                  <GameStatusBadge status={selected.action} />
                </DetailItem>
                <DetailItem label="Timestamp">
                  {formatDateTime(selected.createdAt ?? null)}
                </DetailItem>
                <DetailItem label="Admin">
                  {selected.admin
                    ? userLabel(selected.admin)
                    : (selected.adminEmail ?? selected.adminId ?? "System")}
                </DetailItem>
                <DetailItem label="Target">
                  {selected.targetType ?? "—"} · {selected.targetId ?? "—"}
                </DetailItem>
                <DetailItem label="IP address">{selected.ip ?? "—"}</DetailItem>
                <DetailItem label="Device / user agent">
                  {selected.userAgent ?? "—"}
                </DetailItem>
              </DetailGrid>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">Previous value</p>
                  <JsonBlock value={selected.previousValue} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">New value</p>
                  <JsonBlock value={selected.newValue} />
                </div>
              </div>
              {selected.metadata !== undefined && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Metadata</p>
                  <JsonBlock value={selected.metadata} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
