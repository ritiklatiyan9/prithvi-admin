import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon, CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EventsBarChart } from "@/components/shared/EventsBarChart";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { analyticsService } from "@/services/analytics.service";
import { formatNumber } from "@/utils/format";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

export const AnalyticsPage = (): JSX.Element => {
  const [range, setRange] = useState<RangeValue>("30");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () =>
      analyticsService.summary(
        range === "all"
          ? {}
          : { from: new Date(Date.now() - Number(range) * 86_400_000).toISOString() },
      ),
  });

  const topEvent = data?.byName[0];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Event volume tracked across the platform."
        actions={
          <Select value={range} onValueChange={(value) => setRange(value as RangeValue)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total events"
          value={data ? formatNumber(data.totalEvents) : "—"}
          icon={ChartBarIcon}
          loading={isLoading}
        />
        <StatCard
          label="Top event"
          value={topEvent ? topEvent.name : "—"}
          icon={CursorArrowRaysIcon}
          hint={topEvent ? `${formatNumber(topEvent.count)} occurrences` : undefined}
          loading={isLoading}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Events by name</CardTitle>
          <CardDescription>Distribution over the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : (
            <EventsBarChart data={(data?.byName ?? []).slice(0, 12)} height={320} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All events</CardTitle>
          <CardDescription>Table view of every tracked event name</CardDescription>
        </CardHeader>
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : !data || data.byName.length === 0 ? (
          <EmptyState title="No events tracked" description="Events appear once clients call the track endpoint." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event name</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byName.map((event) => (
                <TableRow key={event.name}>
                  <TableCell className="font-mono text-xs">{event.name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(event.count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {data.totalEvents > 0
                      ? `${((event.count / data.totalEvents) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
