import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { rouletteService } from "@/services/roulette.service";
import { formatDateTime } from "@/utils/format";

const PAGE_SIZE = 20;

export const RouletteAudit = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["roulette", "audit", page],
    queryFn: ({ signal }) =>
      rouletteService.auditLogs({ page, limit: PAGE_SIZE }, signal),
  });

  return (
    <Card>
      <div className="border-b p-4">
        <p className="text-sm font-semibold">Audit log</p>
        <p className="text-sm text-muted-foreground">
          Immutable record of roulette configuration and probability changes.
        </p>
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="Config and probability changes appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">
                  Reason / detail
                </TableHead>
                <TableHead className="hidden lg:table-cell">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((entry) => {
                const meta = (entry.metadata ?? {}) as {
                  newValue?: { reason?: string };
                  oldValue?: unknown;
                };
                const reason = meta.newValue?.reason;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs">
                      {entry.adminEmail ?? entry.adminId ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-72 truncate text-sm text-muted-foreground md:table-cell">
                      {reason ?? entry.path}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {entry.ip ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {data && <Pagination meta={data.meta} onPageChange={setPage} />}
    </Card>
  );
};
