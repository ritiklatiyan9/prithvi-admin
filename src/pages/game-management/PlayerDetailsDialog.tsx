import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { apiErrorMessage } from "@/services/api-client";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime, formatNumber } from "@/utils/format";
import {
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  SectionError,
} from "./shared";
import { formatRate, userLabel } from "./utils";

interface PlayerDetailsDialogProps {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
}

const toLocalDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number): string => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoOrNull = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;

export const PlayerDetailsDialog = ({
  userId,
  onOpenChange,
}: PlayerDetailsDialogProps): JSX.Element => {
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");
  const queryClient = useQueryClient();
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [gameSuspendedUntil, setGameSuspendedUntil] = useState("");
  const [chatMutedUntil, setChatMutedUntil] = useState("");
  const [reason, setReason] = useState("");

  const player = useQuery({
    queryKey: ["game-admin", "player", userId],
    queryFn: ({ signal }) => ludoAdminService.player(userId!, signal),
    enabled: userId !== null,
  });

  useEffect(() => {
    if (!restrictionOpen) return;
    setGameSuspendedUntil(
      toLocalDateTime(
        player.data?.restrictions?.gameSuspendedUntil ??
          player.data?.gameSuspendedUntil,
      ),
    );
    setChatMutedUntil(
      toLocalDateTime(
        player.data?.restrictions?.chatMutedUntil ??
          player.data?.chatMutedUntil,
      ),
    );
    setReason("");
  }, [restrictionOpen, player.data]);

  const restrictions = useMutation({
    mutationFn: () =>
      ludoAdminService.updatePlayerRestrictions(userId!, {
        gameSuspendedUntil: toIsoOrNull(gameSuspendedUntil),
        chatMutedUntil: toIsoOrNull(chatMutedUntil),
        reason: reason.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["game-admin", "player", userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["game-admin", "players"],
      });
      void queryClient.invalidateQueries({ queryKey: ["game-admin", "audit"] });
      setRestrictionOpen(false);
      toast.success("Player restrictions updated");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const data = player.data;
  const stats = data?.statistics ?? data?.stats;

  const close = (open: boolean): void => {
    if (!open) setRestrictionOpen(false);
    onOpenChange(open);
  };

  return (
    <>
      <Dialog open={userId !== null} onOpenChange={close}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Game player profile</DialogTitle>
            <DialogDescription>
              Server-calculated performance, membership, reports, and
              communication restrictions.
            </DialogDescription>
          </DialogHeader>

          {player.isLoading ? (
            <TableSkeleton rows={7} />
          ) : player.isError || !data ? (
            <SectionError
              retry={() => void player.refetch()}
              title="Could not load this player"
            />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                {(data.avatarUrl ?? data.user?.avatarUrl) ? (
                  <img
                    src={data.avatarUrl ?? data.user?.avatarUrl ?? ""}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold">
                    {userLabel(data).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">
                    {userLabel(data)}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {data.email ??
                      data.user?.email ??
                      data.userId ??
                      data.user?.id ??
                      data.id}
                  </p>
                </div>
                <GameStatusBadge
                  status={data.online || data.isOnline ? "ONLINE" : "OFFLINE"}
                />
                <Badge variant="outline">
                  {data.subscriptionPlan ??
                    data.plan ??
                    data.entitlement?.plan ??
                    "FREE"}
                </Badge>
                {canWrite && (
                  <Button
                    variant="outline"
                    onClick={() => setRestrictionOpen(true)}
                  >
                    Manage restrictions
                  </Button>
                )}
              </div>

              <DetailGrid>
                <DetailItem label="Total matches">
                  {formatNumber(stats?.totalMatches ?? 0)}
                </DetailItem>
                <DetailItem label="Wins / losses">
                  {formatNumber(stats?.wins ?? 0)} /{" "}
                  {formatNumber(stats?.losses ?? 0)}
                </DetailItem>
                <DetailItem label="Win rate">
                  {formatRate(stats?.winPercentage)}
                </DetailItem>
                <DetailItem label="2-player / 3-player / 4-player">
                  {stats?.twoPlayerMatches ?? 0} /{" "}
                  {stats?.threePlayerMatches ?? 0} /{" "}
                  {stats?.fourPlayerMatches ?? 0}
                </DetailItem>
                <DetailItem label="Disconnects / forfeits">
                  {stats?.disconnects ?? 0} / {stats?.forfeits ?? 0}
                </DetailItem>
                <DetailItem label="Reports">
                  {data.reportCount ?? data.reports?.length ?? 0}
                </DetailItem>
                <DetailItem label="Game suspension">
                  {formatDateTime(
                    data.restrictions?.gameSuspendedUntil ??
                      data.gameSuspendedUntil ??
                      null,
                  )}
                </DetailItem>
                <DetailItem label="Chat mute">
                  {formatDateTime(
                    data.restrictions?.chatMutedUntil ??
                      data.chatMutedUntil ??
                      null,
                  )}
                </DetailItem>
                <DetailItem label="Restriction reason" wide>
                  {data.restrictions?.reason ?? "—"}
                </DetailItem>
              </DetailGrid>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Recent matches</h3>
                  {!data.recentMatches?.length ? (
                    <EmptyState title="No recent matches" />
                  ) : (
                    <div className="space-y-2">
                      {data.recentMatches.slice(0, 6).map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <code className="block truncate text-xs">
                              {match.roomId}
                            </code>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(
                                match.completedAt ?? match.createdAt ?? null,
                              )}
                            </span>
                          </div>
                          <GameStatusBadge
                            status={match.result ?? match.status}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Admin notes</h3>
                  {!data.adminNotes?.length ? (
                    <EmptyState
                      title="No admin notes"
                      description="Notes supplied by the backend appear here."
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.adminNotes.map((note, index) => (
                        <div
                          key={note.id ?? index}
                          className="rounded-lg border p-3"
                        >
                          <p className="text-sm">{note.note}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {note.adminEmail ?? "Admin"} ·{" "}
                            {formatDateTime(note.createdAt ?? null)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={restrictionOpen} onOpenChange={setRestrictionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage game restrictions</DialogTitle>
            <DialogDescription>
              Leave a date empty to clear that restriction. Every change
              requires a reason and is audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="game-suspended-until">
                Suspend game access until
              </Label>
              <Input
                id="game-suspended-until"
                type="datetime-local"
                value={gameSuspendedUntil}
                onChange={(event) => setGameSuspendedUntil(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chat-muted-until">Mute communication until</Label>
              <Input
                id="chat-muted-until"
                type="datetime-local"
                value={chatMutedUntil}
                onChange={(event) => setChatMutedUntil(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restriction-reason">Reason</Label>
              <Textarea
                id="restriction-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Required for the audit trail…"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={restrictions.isPending}
              onClick={() => setRestrictionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={restrictions.isPending || reason.trim().length < 3}
              onClick={() => restrictions.mutate()}
            >
              {restrictions.isPending ? "Saving…" : "Save restrictions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
