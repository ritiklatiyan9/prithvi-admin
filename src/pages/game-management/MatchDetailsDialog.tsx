import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { formatDateTime } from "@/utils/format";
import {
  ActionTimeline,
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  JsonBlock,
  SectionError,
} from "./shared";
import { formatDuration, formatGameMode, userLabel } from "./utils";

interface MatchDetailsDialogProps {
  matchId: string | null;
  onOpenChange: (open: boolean) => void;
}

export const MatchDetailsDialog = ({
  matchId,
  onOpenChange,
}: MatchDetailsDialogProps): JSX.Element => {
  const match = useQuery({
    queryKey: ["game-admin", "match", matchId],
    queryFn: ({ signal }) => ludoAdminService.match(matchId!, signal),
    enabled: matchId !== null,
  });

  const data = match.data;

  return (
    <Dialog open={matchId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Match record</DialogTitle>
          <DialogDescription>
            Server-calculated result, connection summary, and ordered action
            timeline.
          </DialogDescription>
        </DialogHeader>

        {match.isLoading ? (
          <TableSkeleton rows={7} />
        ) : match.isError || !data ? (
          <SectionError
            retry={() => void match.refetch()}
            title="Could not load this match"
          />
        ) : (
          <div className="space-y-5">
            <DetailGrid>
              <DetailItem label="Match ID">
                <code className="text-xs">{data.id}</code>
              </DetailItem>
              <DetailItem label="Room ID">
                <code className="text-xs">{data.roomId}</code>
              </DetailItem>
              <DetailItem label="Mode">{formatGameMode(data.mode)}</DetailItem>
              <DetailItem label="Status">
                <GameStatusBadge status={data.status} />
              </DetailItem>
              <DetailItem label="Winner">
                {data.winner ? userLabel(data.winner) : (data.winnerId ?? "—")}
              </DetailItem>
              <DetailItem label="Result">{data.result ?? "—"}</DetailItem>
              <DetailItem label="Duration">
                {formatDuration(data.durationSeconds)}
              </DetailItem>
              <DetailItem label="Disconnects / forfeits">
                {data.disconnects ?? 0} / {data.forfeits ?? 0}
              </DetailItem>
              <DetailItem label="Started">
                {formatDateTime(data.startedAt ?? data.createdAt ?? null)}
              </DetailItem>
              <DetailItem label="Completed">
                {formatDateTime(data.completedAt ?? null)}
              </DetailItem>
              <DetailItem label="Players" wide>
                {data.players.map(userLabel).join(", ") || "—"}
              </DetailItem>
            </DetailGrid>

            {data.connectionSummary !== undefined && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Connection summary
                </h3>
                <JsonBlock value={data.connectionSummary} />
              </div>
            )}

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
