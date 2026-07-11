import type { ComponentType, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  hint?: string;
  loading?: boolean;
}

export const StatCard = ({ label, value, icon: Icon, hint, loading }: StatCardProps): JSX.Element => (
  <Card>
    <CardContent className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="rounded-lg bg-muted p-2.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
);
