import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BanknotesIcon,
  ClockIcon,
  MegaphoneIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { FiltersBar, type DateRangeValue } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { EventsBarChart } from "@/components/shared/EventsBarChart";
import { ClaimStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services/admin.service";
import { analyticsService } from "@/services/analytics.service";
import { claimsService } from "@/services/claims.service";
import { Coins } from "@/components/shared/Coins";
import { formatDateTime, formatNumber } from "@/utils/format";

const defaultFrom = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

const eventExportColumns: ExportColumn[] = [
  { key: "name", label: "Event" },
  { key: "count", label: "Count" },
];

export const DashboardPage = (): JSX.Element => {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.stats });
  const [range, setRange] = useState<DateRangeValue>({ from: defaultFrom, to: "" });

  const events = useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () =>
      analyticsService.summary({
        from: range.from ? `${range.from}T00:00:00.000Z` : undefined,
        to: range.to ? `${range.to}T23:59:59.999Z` : undefined,
      }),
  });

  const recentClaims = useQuery({
    queryKey: ["claims", "recent"],
    queryFn: () => claimsService.list({ page: 1, limit: 6 }),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview at a glance." />

      <FiltersBar
        dateRange={{ value: range, onChange: setRange }}
        onClearAll={() => setRange({ from: defaultFrom, to: "" })}
      >
        <ExportButton
          className="ml-auto"
          rows={(events.data?.byName ?? []) as unknown as Record<string, unknown>[]}
          columns={eventExportColumns}
          fileName="dashboard-events"
          title="Analytics events"
          filterSummary={`Range: ${range.from || "…"} – ${range.to || "today"}`}
        />
      </FiltersBar>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.data ? formatNumber(stats.data.totalUsers) : "—"}
          icon={UsersIcon}
          loading={stats.isLoading}
        />
        <StatCard
          label="Active campaigns"
          value={stats.data ? formatNumber(stats.data.activeCampaigns) : "—"}
          icon={MegaphoneIcon}
          loading={stats.isLoading}
        />
        <StatCard
          label="Pending claims"
          value={stats.data ? formatNumber(stats.data.pendingClaims) : "—"}
          icon={ClockIcon}
          hint={stats.data ? `${formatNumber(stats.data.approvedClaims)} approved` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label="Wallet liability"
          value={stats.data ? <Coins value={stats.data.totalWalletBalance} /> : "—"}
          icon={BanknotesIcon}
          hint="Total user balances"
          loading={stats.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Tracked analytics events by name in the selected range</CardDescription>
          </CardHeader>
          <CardContent>
            {events.isLoading ? (
              <TableSkeleton rows={4} />
            ) : (
              <EventsBarChart data={(events.data?.byName ?? []).slice(0, 8)} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent claims</CardTitle>
            <CardDescription>Latest submissions across all campaigns</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentClaims.isLoading ? (
              <TableSkeleton rows={5} />
            ) : recentClaims.data && recentClaims.data.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentClaims.data.items.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <p className="max-w-40 truncate font-medium">{claim.userEmail}</p>
                        <p className="max-w-40 truncate text-xs text-muted-foreground">
                          {claim.campaignTitle}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ClaimStatusBadge status={claim.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatDateTime(claim.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No claims yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
