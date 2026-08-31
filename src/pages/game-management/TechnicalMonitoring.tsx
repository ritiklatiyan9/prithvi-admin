import { useQuery } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  QueueListIcon,
  ServerStackIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/shared/EmptyState";
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

export const TechnicalMonitoring = (): JSX.Element => {
  const monitoring = useQuery({
    queryKey: ["game-admin", "monitoring"],
    queryFn: ({ signal }) => ludoAdminService.monitoring(signal),
    refetchInterval: 5_000,
  });

  if (monitoring.isError && !monitoring.data) {
    return (
      <Card>
        <SectionError
          retry={() => void monitoring.refetch()}
          title="Could not load monitoring data"
        />
      </Card>
    );
  }

  const data = monitoring.data;
  const health =
    data?.websocketHealth ??
    (data && data.socketErrors === 0
      ? "HEALTHY"
      : data
        ? "DEGRADED"
        : "UNKNOWN");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Technical monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Socket, matchmaking, synchronisation, payment, and voice signalling
            telemetry.
          </p>
        </div>
        <PollingStatus
          active={monitoring.isFetching}
          label="5-second polling"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Socket connections"
          value={data ? formatNumber(data.socketConnections) : "—"}
          icon={SignalIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Socket errors"
          value={data ? formatNumber(data.socketErrors) : "—"}
          icon={ExclamationTriangleIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Matchmaking failures"
          value={data ? formatNumber(data.matchmakingFailures) : "—"}
          icon={QueueListIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Room creation failures"
          value={data ? formatNumber(data.roomCreationFailures) : "—"}
          icon={ServerStackIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Desync incidents"
          value={data ? formatNumber(data.desynchronisationIncidents) : "—"}
          icon={ArrowPathIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Webhook errors"
          value={data ? formatNumber(data.paymentWebhookErrors) : "—"}
          icon={CreditCardIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Voice signalling errors"
          value={data ? formatNumber(data.voiceSignallingErrors) : "—"}
          icon={ChatBubbleOvalLeftEllipsisIcon}
          loading={monitoring.isLoading}
        />
        <StatCard
          label="Realtime health"
          value={<GameStatusBadge status={health} />}
          icon={LinkIcon}
          loading={monitoring.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current telemetry snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailItem label="WebSocket layer">
              <GameStatusBadge status={health} />
            </DetailItem>
            <DetailItem label="Generated">
              {formatDateTime(data?.generatedAt ?? null)}
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold">Recent incidents</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Aggregated diagnostics only; credentials and raw signalling payloads
          remain server-side.
        </p>
        {!data?.incidents?.length ? (
          <EmptyState
            title="No recent incidents"
            description="Server diagnostics will surface here when intervention may be needed."
          />
        ) : (
          <div className="space-y-2">
            {data.incidents.map((incident, index) => (
              <div
                key={incident.id ?? `${incident.type}-${index}`}
                className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{incident.type}</p>
                    <GameStatusBadge status={incident.status} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {incident.detail ?? "No detail supplied"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {incident.count !== undefined && (
                    <p className="font-medium text-foreground">
                      {formatNumber(incident.count)} events
                    </p>
                  )}
                  <p>{formatDateTime(incident.createdAt ?? null)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
