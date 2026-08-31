import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
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
import { GameStatusBadge, PollingStatus, SectionError } from "./shared";
import {
  formatDuration,
  formatGameMode,
  playerNames,
  userLabel,
} from "./utils";
import { RoomDetailsDialog } from "./RoomDetailsDialog";

const PAGE_SIZE = 20;
type RoomStatus =
  | "ALL"
  | "MATCHED"
  | "WAITING_READY"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "ABANDONED"
  | "EXPIRED";
type RoomMode = "ALL" | "TWO_PLAYER" | "THREE_PLAYER" | "FOUR_PLAYER";

export const LiveRooms = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RoomStatus>("ACTIVE");
  const [mode, setMode] = useState<RoomMode>("ALL");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const rooms = useQuery({
    queryKey: ["game-admin", "rooms", { page, search, status, mode }],
    queryFn: ({ signal }) =>
      ludoAdminService.rooms(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status: status === "ALL" ? undefined : status,
          mode: mode === "ALL" ? undefined : mode,
        },
        signal,
      ),
    refetchInterval: 5_000,
  });
  const term = search.trim().toLowerCase();
  const visibleRooms = (rooms.data?.items ?? []).filter(
    (room) =>
      !term ||
      room.id.toLowerCase().includes(term) ||
      room.roomId?.toLowerCase().includes(term) ||
      room.players.some((player) =>
        [userLabel(player), player.email, player.user?.email]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term)),
      ),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Live rooms</h2>
          <p className="text-sm text-muted-foreground">
            Inspect authoritative state and connection health without
            intervening in play.
          </p>
        </div>
        <PollingStatus active={rooms.isFetching} label="5-second polling" />
      </div>

      <FiltersBar
        className="mb-0"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Room ID or player…",
          className: "sm:w-72",
        }}
        selects={[
          {
            key: "status",
            value: status,
            onChange: (value) => {
              setStatus(value as RoomStatus);
              setPage(1);
            },
            options: [
              { value: "ALL", label: "All statuses" },
              { value: "MATCHED", label: "Matched" },
              { value: "WAITING_READY", label: "Waiting for ready" },
              { value: "ACTIVE", label: "Active" },
              { value: "COMPLETED", label: "Completed" },
              { value: "CANCELLED", label: "Cancelled" },
              { value: "ABANDONED", label: "Abandoned" },
              { value: "EXPIRED", label: "Expired" },
            ],
          },
          {
            key: "mode",
            value: mode,
            onChange: (value) => {
              setMode(value as RoomMode);
              setPage(1);
            },
            options: [
              { value: "ALL", label: "All modes" },
              { value: "TWO_PLAYER", label: "2-player" },
              { value: "THREE_PLAYER", label: "3-player" },
              { value: "FOUR_PLAYER", label: "4-player" },
            ],
          },
        ]}
        onClearAll={() => {
          setSearch("");
          setStatus("ACTIVE");
          setMode("ALL");
          setPage(1);
        }}
      />

      <Card>
        {rooms.isLoading ? (
          <TableSkeleton rows={8} />
        ) : rooms.isError && !rooms.data ? (
          <SectionError
            retry={() => void rooms.refetch()}
            title="Could not load rooms"
          />
        ) : visibleRooms.length === 0 ? (
          <EmptyState
            title="No rooms found"
            description="Try another status or search term. Active rooms appear here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Turn</TableHead>
                  <TableHead>Connections</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRooms.map((room) => {
                  const connected =
                    room.connectedPlayers ??
                    room.players.filter(
                      (player) =>
                        player.connected ||
                        player.connectionStatus === "CONNECTED" ||
                        [
                          "MATCHED",
                          "ACCEPTED",
                          "READY",
                          "ACTIVE",
                          "FINISHED",
                        ].includes(player.status ?? ""),
                    ).length;
                  return (
                    <TableRow key={room.id}>
                      <TableCell className="max-w-40">
                        <code
                          className="block truncate text-xs"
                          title={room.roomId ?? room.id}
                        >
                          {room.roomId ?? room.id}
                        </code>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatGameMode(room.mode)}
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p
                          className="truncate text-sm"
                          title={playerNames(room.players)}
                        >
                          {playerNames(room.players)}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm">
                        {room.currentTurn
                          ? userLabel(room.currentTurn)
                          : (room.currentTurnUserId ?? "—")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {connected}/{room.players.length}
                      </TableCell>
                      <TableCell>
                        <GameStatusBadge status={room.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDuration(room.durationSeconds)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatDateTime(
                          room.updatedAt ?? room.startedAt ?? null,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRoom(room.id)}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {rooms.data && (
          <Pagination meta={rooms.data.meta} onPageChange={setPage} />
        )}
      </Card>

      <RoomDetailsDialog
        roomId={selectedRoom}
        onOpenChange={(open) => !open && setSelectedRoom(null)}
      />
    </div>
  );
};
