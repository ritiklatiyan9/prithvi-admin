import type { ReactNode } from "react";
import { ArrowPathIcon, SignalIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/utils/format";
import type { GameActionTimelineItem } from "@/types/ludo-admin";
import { statusVariant, userLabel } from "./utils";

export const GameStatusBadge = ({
  status,
}: {
  status?: string | null;
}): JSX.Element => (
  <Badge variant={statusVariant(status)}>{status || "UNKNOWN"}</Badge>
);

export const PollingStatus = ({
  active,
  label = "Live data",
}: {
  active: boolean;
  label?: string;
}): JSX.Element => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
    {active ? `Refreshing ${label.toLowerCase()}…` : label}
  </span>
);

export const SectionError = ({
  title = "Could not load game data",
  retry,
}: {
  title?: string;
  retry: () => void;
}): JSX.Element => (
  <EmptyState
    title={title}
    description="The existing data was left untouched. Check the backend connection and try again."
    action={
      <Button variant="outline" size="sm" onClick={retry}>
        <ArrowPathIcon className="mr-2 h-4 w-4" /> Retry
      </Button>
    }
  />
);

export const DetailGrid = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => (
  <dl className="grid gap-3 rounded-lg border bg-muted/25 p-4 sm:grid-cols-2">
    {children}
  </dl>
);

export const DetailItem = ({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}): JSX.Element => (
  <div className={wide ? "sm:col-span-2" : undefined}>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 break-words text-sm">{children}</dd>
  </div>
);

export const JsonBlock = ({ value }: { value: unknown }): JSX.Element => (
  <pre className="max-h-64 overflow-auto rounded-lg border bg-background p-3 text-xs leading-relaxed">
    {JSON.stringify(value ?? null, null, 2)}
  </pre>
);

export const ActionTimeline = ({
  actions,
}: {
  actions?: GameActionTimelineItem[];
}): JSX.Element => {
  if (!actions?.length) {
    return (
      <EmptyState
        title="No action timeline"
        description="Server-authoritative actions will appear here when available."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Seq</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Game data</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action, index) => (
            <TableRow
              key={
                action.id ??
                `${action.sequence ?? index}-${action.createdAt ?? "action"}`
              }
            >
              <TableCell className="font-mono text-xs">
                {action.sequence ?? action.stateVersion ?? index + 1}
              </TableCell>
              <TableCell>
                <GameStatusBadge status={action.action ?? action.type} />
              </TableCell>
              <TableCell className="max-w-44 truncate text-sm">
                {userLabel(action.actor) !== "Unknown player"
                  ? userLabel(action.actor)
                  : (action.actorId ?? action.userId ?? "Server")}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {[
                  action.diceValue !== undefined && action.diceValue !== null
                    ? `Dice ${action.diceValue}`
                    : "",
                  action.pawnIndex !== undefined && action.pawnIndex !== null
                    ? `Pawn ${action.pawnIndex + 1}`
                    : "",
                  action.detail ?? "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                {formatDateTime(action.createdAt ?? action.timestamp ?? null)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const ConnectionBadge = ({
  connected,
  status,
}: {
  connected?: boolean;
  status?: string | null;
}): JSX.Element => {
  const resolved =
    status ??
    (connected === undefined
      ? "UNKNOWN"
      : connected
        ? "CONNECTED"
        : "DISCONNECTED");
  return (
    <Badge variant={statusVariant(resolved)}>
      <SignalIcon className="h-3 w-3" /> {resolved}
    </Badge>
  );
};
