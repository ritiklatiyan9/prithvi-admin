import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { EmptyState } from "./EmptyState";

export interface EventsBarChartProps {
  data: { name: string; count: number }[];
  height?: number;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {payload[0].value?.toLocaleString()} events
      </p>
    </div>
  );
};

/**
 * Single-series bar chart (magnitude job). Palette validated with the dataviz
 * skill for both surfaces; colors resolve via CSS vars so dark mode swaps free.
 */
export const EventsBarChart = ({
  data,
  height = 280,
}: EventsBarChartProps): JSX.Element => {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Tracked events will appear here."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
          interval={0}
          angle={data.length > 6 ? -30 : 0}
          textAnchor={data.length > 6 ? "end" : "middle"}
          height={data.length > 6 ? 60 : 24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
        />
        <Bar
          dataKey="count"
          fill="var(--chart-series-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
