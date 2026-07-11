import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 6 }: { rows?: number }): JSX.Element => (
  <div className="space-y-2 p-3">
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} className="h-11 w-full" />
    ))}
  </div>
);
