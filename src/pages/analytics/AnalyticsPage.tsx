import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon, CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar, type DateRangeValue } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { StatCard } from "@/components/shared/StatCard";
import { EventsBarChart } from "@/components/shared/EventsBarChart";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [dates, setDates] = useState<DateRangeValue>({ from: "", to: "" });
  const [search, setSearch] = useState("");

  // A custom date range (API-supported from/to) overrides the preset range.
  const customDates = dates.from !== "" || dates.to !== "";
  const params = customDates
    ? {
        from: dates.from ? new Date(dates.from).toISOString() : undefined,
        to: dates.to ? new Date(`${dates.to}T23:59:59.999`).toISOString() : undefined,
      }
    : range === "all"
      ? {}
      : { from: new Date(Date.now() - Number(range) * 86_400_000).toISOString() };

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "summary", range, dates],
    queryFn: () => analyticsService.summary(params),
  });

  const topEvent = data?.byName[0];

  // The summary endpoint can't filter by event name — filter the loaded rows client-side.
  const term = search.trim().toLowerCase();
  const events = (data?.byName ?? []).filter((event) =>
    event.name.toLowerCase().includes(term),
  );
  const totalEvents = data?.totalEvents ?? 0;

  const exportColumns: ExportColumn[] = [
    { key: "name", label: "Event name" },
    { key: "count", label: "Count" },
    {
      key: "count",
      label: "Share %",
      format: (v) => (totalEvents > 0 ? (((v as number) / totalEvents) * 100).toFixed(1) : ""),
    },
  ];

  const filterSummary =
    [
      customDates
        ? `Dates: ${dates.from || "…"} – ${dates.to || "…"}`
        : RANGES.find((option) => option.value === range)?.label ?? "",
      term ? `Search: ${term}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <div>
      <PageHeader title="Analytics" description="Event volume tracked across the platform." />

      <FiltersBar
        search={{ value: search, onChange: setSearch, placeholder: "Search event names…" }}
        selects={[
          {
            key: "range",
            value: range,
            onChange: (value) => setRange(value as RangeValue),
            options: [...RANGES],
            placeholder: "Range",
            className: "sm:w-40",
          },
        ]}
        dateRange={{ value: dates, onChange: setDates }}
        onClearAll={() => {
          setSearch("");
          setRange("30");
          setDates({ from: "", to: "" });
        }}
      >
        <div className="ml-auto">
          <ExportButton
            rows={events as unknown as Record<string, unknown>[]}
            columns={exportColumns}
            fileName="analytics-events"
            title="Analytics — events by name"
            filterSummary={filterSummary}
          />
        </div>
      </FiltersBar>

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
            <EventsBarChart data={events.slice(0, 12)} height={320} />
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
        ) : events.length === 0 ? (
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
              {events.map((event) => (
                <TableRow key={event.name}>
                  <TableCell className="font-mono text-xs">{event.name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(event.count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {totalEvents > 0
                      ? `${((event.count / totalEvents) * 100).toFixed(1)}%`
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
