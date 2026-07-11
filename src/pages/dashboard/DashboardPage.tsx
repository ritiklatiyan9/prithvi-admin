import { useQuery } from "@tanstack/react-query";
import {
  BanknotesIcon,
  ClockIcon,
  MegaphoneIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
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
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";

export const DashboardPage = (): JSX.Element => {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.stats });

  const events = useQuery({
    queryKey: ["analytics", "summary", "30d"],
    queryFn: () =>
      analyticsService.summary({
        from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      }),
  });

  const recentClaims = useQuery({
    queryKey: ["claims", "recent"],
    queryFn: () => claimsService.list({ page: 1, limit: 6 }),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview at a glance." />

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
          value={stats.data ? formatCurrency(stats.data.totalWalletBalance) : "—"}
          icon={BanknotesIcon}
          hint="Total user balances"
          loading={stats.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Events — last 30 days</CardTitle>
            <CardDescription>Tracked analytics events by name</CardDescription>
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
