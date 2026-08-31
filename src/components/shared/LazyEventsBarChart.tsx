import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventsBarChartProps } from "./EventsBarChart";

const EventsBarChart = lazy(async () => {
  const module = await import("./EventsBarChart");
  return { default: module.EventsBarChart };
});

/** Lets the page shell and API data render without waiting for Recharts. */
export const LazyEventsBarChart = ({
  height = 280,
  ...props
}: EventsBarChartProps): JSX.Element => (
  <Suspense fallback={<Skeleton className="w-full" style={{ height }} />}>
    <EventsBarChart height={height} {...props} />
  </Suspense>
);
