import { useQuery } from "@tanstack/react-query";
import {
  ArrowPathRoundedSquareIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  QueueListIcon,
  SignalIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { formatDateTime, formatNumber } from "@/utils/format";
import {
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  PollingStatus,
  SectionError,
} from "./shared";
import { formatDuration, formatRate } from "./utils";

export const GameOverview = (): JSX.Element => {
  const overview = useQuery({
    queryKey: ["game-admin", "overview"],
    queryFn: ({ signal }) => ludoAdminService.overview(signal),
    refetchInterval: 10_000,
  });

  if (overview.isError && !overview.data) {
    return (
      <Card>
        <SectionError retry={() => void overview.refetch()} />
      </Card>
    );
  }

  const data = overview.data;
  const websocketHealth =
    data?.websocketHealth ??
    (data && data.websocketErrors === 0
      ? "HEALTHY"
      : data
        ? "DEGRADED"
        : "UNKNOWN");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Operations overview</h2>
          <p className="text-sm text-muted-foreground">
            Near-real-time server metrics. Figures refresh every ten seconds.
          </p>
        </div>
        <PollingStatus active={overview.isFetching} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Players online"
          value={data ? formatNumber(data.onlinePlayers) : "—"}
          icon={UsersIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="In matchmaking"
          value={data ? formatNumber(data.matchmakingPlayers) : "—"}
          icon={QueueListIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="Active rooms"
          value={data ? formatNumber(data.activeRooms) : "—"}
          icon={BoltIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="Socket connections"
          value={
            data?.websocketConnections !== undefined
              ? formatNumber(data.websocketConnections)
              : "—"
          }
          icon={SignalIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="Completed matches"
          value={data ? formatNumber(data.completedMatches) : "—"}
          icon={TrophyIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="Abandoned matches"
          value={data ? formatNumber(data.abandonedMatches) : "—"}
          icon={ExclamationTriangleIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="Average duration"
          value={formatDuration(data?.averageMatchDurationSeconds)}
          icon={ClockIcon}
          loading={overview.isLoading}
        />
        <StatCard
          label="Forfeit rate"
          value={formatRate(data?.forfeitRate)}
          icon={FlagIcon}
          loading={overview.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection quality</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailItem label="WebSocket health">
                <GameStatusBadge status={websocketHealth} />
              </DetailItem>
              <DetailItem label="Reconnection rate">
                <span className="text-lg font-semibold tabular-nums">
                  {formatRate(data?.reconnectionRate)}
                </span>
              </DetailItem>
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot freshness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/25 p-4">
              <ArrowPathRoundedSquareIcon className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">
                  {overview.isFetching
                    ? "Refreshing now"
                    : "Metrics are current"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Server snapshot: {formatDateTime(data?.generatedAt ?? null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
