import { useQuery } from "@tanstack/react-query";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
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

export const FraudDetection = (): JSX.Element => {
  const { data, isLoading } = useQuery({
    queryKey: ["hot-offers", "fraud"],
    queryFn: hotOffersService.fraudOverview,
  });

  if (isLoading) return <TableSkeleton />;

  const flaggedCount = data?.flaggedUsers.filter((u) => u.flagged).length ?? 0;

  return (
    <div className="space-y-4">
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
          <p className="mb-3 text-sm font-semibold">Users by fraud score</p>
          {!data || data.flaggedUsers.length === 0 ? (
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
                {data.flaggedUsers.map((row) => (
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
          <p className="mb-3 text-sm font-semibold">Recent fraud events</p>
          {!data || data.recentLogs.length === 0 ? (
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
                {data.recentLogs.map((log) => (
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
