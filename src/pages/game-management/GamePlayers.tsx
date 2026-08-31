import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { formatDateTime } from "@/utils/format";
import { GameStatusBadge, SectionError } from "./shared";
import { formatRate, userLabel } from "./utils";
import { PlayerDetailsDialog } from "./PlayerDetailsDialog";

const PAGE_SIZE = 20;

const hasFutureRestriction = (value?: string | null): boolean =>
  Boolean(value && new Date(value).getTime() > Date.now());

export const GamePlayers = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const players = useQuery({
    queryKey: ["game-admin", "players", { page, search }],
    queryFn: ({ signal }) =>
      ludoAdminService.players(
        { page, limit: PAGE_SIZE, search: search.trim() || undefined },
        signal,
      ),
    refetchInterval: 15_000,
  });

  const rows = players.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Player management</h2>
        <p className="text-sm text-muted-foreground">
          Review game profiles, server-calculated statistics, plans, reports,
          and active restrictions.
        </p>
      </div>

      <FiltersBar
        className="mb-0"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Name, email or user ID…",
          className: "sm:w-80",
        }}
        onClearAll={() => {
          setSearch("");
          setPage(1);
        }}
      />

      <Card>
        {players.isLoading ? (
          <TableSkeleton rows={8} />
        ) : players.isError && !players.data ? (
          <SectionError
            retry={() => void players.refetch()}
            title="Could not load players"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No game players found"
            description="Profiles are created by the backend when registered users enter Ludo."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Presence</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                  <TableHead>Restrictions</TableHead>
                  <TableHead className="text-right">Last seen</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((player) => {
                  const playerId =
                    player.userId ?? player.user?.id ?? player.id;
                  const statistics = player.statistics ?? player.stats;
                  const suspendedUntil =
                    player.restrictions?.gameSuspendedUntil ??
                    player.gameSuspendedUntil;
                  const mutedUntil =
                    player.restrictions?.chatMutedUntil ??
                    player.chatMutedUntil;
                  const suspended = hasFutureRestriction(suspendedUntil);
                  const muted = hasFutureRestriction(mutedUntil);
                  return (
                    <TableRow key={playerId}>
                      <TableCell className="max-w-56">
                        <p className="truncate font-medium">
                          {userLabel(player)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {player.email ?? player.user?.email ?? playerId}
                        </p>
                      </TableCell>
                      <TableCell>
                        <GameStatusBadge
                          status={
                            player.online || player.isOnline
                              ? "ONLINE"
                              : "OFFLINE"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {player.subscriptionPlan ??
                            player.plan ??
                            player.entitlement?.plan ??
                            "FREE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {statistics?.totalMatches ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRate(statistics?.winPercentage)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {player.reportCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {!suspended && !muted && (
                            <Badge variant="secondary">None</Badge>
                          )}
                          {suspended && (
                            <Badge variant="destructive">Game suspended</Badge>
                          )}
                          {muted && <Badge variant="warning">Muted</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatDateTime(player.lastSeenAt ?? null)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(playerId)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {players.data && (
          <Pagination meta={players.data.meta} onPageChange={setPage} />
        )}
      </Card>

      <PlayerDetailsDialog
        userId={selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </div>
  );
};
