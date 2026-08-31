import type { ReactNode } from "react";
import { InboxIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps): JSX.Element => (
  <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
    <div className="rounded-full bg-muted p-3">
      <InboxIcon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="font-medium">{title}</p>
    {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
