import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { formatDateTime } from "@/utils/format";
import {
  ActionTimeline,
  ConnectionBadge,
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  SectionError,
} from "./shared";
import { formatDuration, formatGameMode, userLabel } from "./utils";

interface RoomDetailsDialogProps {
  roomId: string | null;
  onOpenChange: (open: boolean) => void;
}

export const RoomDetailsDialog = ({
  roomId,
  onOpenChange,
}: RoomDetailsDialogProps): JSX.Element => {
  const room = useQuery({
    queryKey: ["game-admin", "room", roomId],
    queryFn: ({ signal }) => ludoAdminService.room(roomId!, signal),
    enabled: roomId !== null,
    refetchInterval: roomId ? 3_000 : false,
  });

  const data = room.data;

  return (
    <Dialog open={roomId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Live room inspection</DialogTitle>
          <DialogDescription>
            Read-only server state. This console cannot roll dice, move pawns,
            or alter a turn.
          </DialogDescription>
        </DialogHeader>

        {room.isLoading ? (
          <TableSkeleton rows={6} />
        ) : room.isError || !data ? (
          <SectionError
            retry={() => void room.refetch()}
            title="Could not inspect this room"
          />
        ) : (
          <div className="space-y-5">
            <DetailGrid>
              <DetailItem label="Room ID">
                <code className="text-xs">{data.roomId ?? data.id}</code>
              </DetailItem>
              <DetailItem label="Status">
                <GameStatusBadge status={data.status} />
              </DetailItem>
              <DetailItem label="Mode">{formatGameMode(data.mode)}</DetailItem>
              <DetailItem label="Duration">
                {formatDuration(data.durationSeconds)}
              </DetailItem>
              <DetailItem label="Current turn">
                {data.currentTurn
                  ? userLabel(data.currentTurn)
                  : (data.currentTurnUserId ?? "—")}
              </DetailItem>
              <DetailItem label="State version">
                {data.stateVersion ?? "—"}
              </DetailItem>
              <DetailItem label="Started">
                {formatDateTime(data.startedAt ?? null)}
              </DetailItem>
              <DetailItem label="Last server action">
                {formatDateTime(data.lastActionAt ?? data.updatedAt ?? null)}
              </DetailItem>
            </DetailGrid>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Players</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.players.map((player) => (
                  <Card key={player.id} className="flex items-center gap-3 p-3">
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                        {userLabel(player).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {userLabel(player)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {player.colour ?? player.color ?? "Seat"}{" "}
                        {player.position ?? player.seat ?? "—"} ·{" "}
                        {player.pawnsHome ?? player.pawnsCompleted ?? 0} home
                      </p>
                    </div>
                    <ConnectionBadge
                      connected={player.connected}
                      status={player.connectionStatus ?? player.status}
                    />
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Action timeline</h3>
              <ActionTimeline actions={data.actions} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
