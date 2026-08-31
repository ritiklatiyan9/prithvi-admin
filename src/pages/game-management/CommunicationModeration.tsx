import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/services/api-client";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { useAuthStore } from "@/store/auth.store";
import type { GameReport } from "@/types/ludo-admin";
import { formatDateTime } from "@/utils/format";
import {
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  JsonBlock,
  PollingStatus,
  SectionError,
} from "./shared";
import { userLabel } from "./utils";

const PAGE_SIZE = 20;
type ReportStatus = "ALL" | "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
type Resolution = "RESOLVED" | "DISMISSED";

export const CommunicationModeration = (): JSX.Element => {
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [selected, setSelected] = useState<GameReport | null>(null);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("RESOLVED");
  const [note, setNote] = useState("");

  const reports = useQuery({
    queryKey: ["game-admin", "reports", { page, status }],
    queryFn: ({ signal }) =>
      ludoAdminService.reports(
        {
          page,
          limit: PAGE_SIZE,
          status: status === "ALL" ? undefined : status,
        },
        signal,
      ),
    refetchInterval: 15_000,
  });

  const resolve = useMutation({
    mutationFn: () =>
      ludoAdminService.resolveReport(selected!.id, {
        resolution,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["game-admin", "reports"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["game-admin", "players"],
      });
      void queryClient.invalidateQueries({ queryKey: ["game-admin", "audit"] });
      setResolutionOpen(false);
      setSelected(null);
      setNote("");
      toast.success(
        resolution === "DISMISSED" ? "Report dismissed" : "Report resolved",
      );
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const openResolution = (report: GameReport): void => {
    setSelected(report);
    setResolution("RESOLVED");
    setNote("");
    setResolutionOpen(true);
  };

  const rows = reports.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Communication moderation</h2>
          <p className="text-sm text-muted-foreground">
            Review reported players, messages, and voice-session metadata.
            Restrictions are managed from Players.
          </p>
        </div>
        <PollingStatus active={reports.isFetching} label="Moderation queue" />
      </div>

      <FiltersBar
        className="mb-0"
        selects={[
          {
            key: "status",
            value: status,
            onChange: (value) => {
              setStatus(value as ReportStatus);
              setPage(1);
            },
            options: [
              { value: "ALL", label: "All reports" },
              { value: "OPEN", label: "Open" },
              { value: "IN_REVIEW", label: "In review" },
              { value: "RESOLVED", label: "Resolved" },
              { value: "DISMISSED", label: "Dismissed" },
            ],
          },
        ]}
        onClearAll={() => {
          setStatus("OPEN");
          setPage(1);
        }}
      />

      <Card>
        {reports.isLoading ? (
          <TableSkeleton rows={8} />
        ) : reports.isError && !reports.data ? (
          <SectionError
            retry={() => void reports.refetch()}
            title="Could not load reports"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No reports in this queue"
            description={
              status === "OPEN"
                ? "The moderation queue is clear."
                : "Try another status."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported player</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Type / reason</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reported</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="max-w-48">
                      <p className="truncate font-medium">
                        {userLabel(report.reportedUser ?? report.targetUser)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {report.reportedUser?.email ??
                          report.targetUser?.email ??
                          report.reportedUser?.id ??
                          report.targetUser?.id ??
                          "—"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {userLabel(report.reporter)}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <Badge variant="outline">
                        {report.type ?? report.category ?? "PLAYER"}
                      </Badge>
                      <p
                        className="mt-1 truncate text-xs text-muted-foreground"
                        title={
                          report.reason ??
                          report.message ??
                          report.details ??
                          undefined
                        }
                      >
                        {report.reason ??
                          report.message ??
                          report.details ??
                          "No reason supplied"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-36 truncate font-mono text-xs">
                      {report.roomId ?? "—"}
                    </TableCell>
                    <TableCell>
                      <GameStatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {formatDateTime(report.createdAt ?? null)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(report)}
                        >
                          Review
                        </Button>
                        {canWrite &&
                          ["OPEN", "IN_REVIEW"].includes(report.status) && (
                            <Button
                              size="sm"
                              onClick={() => openResolution(report)}
                            >
                              Resolve
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {reports.data && (
          <Pagination meta={reports.data.meta} onPageChange={setPage} />
        )}
      </Card>

      <Dialog
        open={selected !== null && !resolutionOpen}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report details</DialogTitle>
            <DialogDescription>
              Evidence and session metadata are read-only and supplied by the
              backend.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <DetailGrid>
                <DetailItem label="Report ID">
                  <code className="text-xs">{selected.id}</code>
                </DetailItem>
                <DetailItem label="Status">
                  <GameStatusBadge status={selected.status} />
                </DetailItem>
                <DetailItem label="Reported player">
                  {userLabel(selected.reportedUser ?? selected.targetUser)}
                </DetailItem>
                <DetailItem label="Reporter">
                  {userLabel(selected.reporter)}
                </DetailItem>
                <DetailItem label="Room">
                  <code className="text-xs">{selected.roomId ?? "—"}</code>
                </DetailItem>
                <DetailItem label="Type">
                  {selected.type ?? selected.category ?? "—"}
                </DetailItem>
                <DetailItem label="Reason / message" wide>
                  {selected.reason ??
                    selected.message ??
                    selected.details ??
                    "—"}
                </DetailItem>
                <DetailItem label="Resolution" wide>
                  {selected.resolutionNote ?? selected.resolution ?? "—"}
                </DetailItem>
              </DetailGrid>
              {selected.metadata !== undefined && (
                <div>
                  <p className="mb-2 text-sm font-semibold">
                    Evidence metadata
                  </p>
                  <JsonBlock value={selected.metadata} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={resolutionOpen}
        onOpenChange={(open) => {
          setResolutionOpen(open);
          if (!open) {
            setSelected(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve report</DialogTitle>
            <DialogDescription>
              This decision is final for the queue and will be recorded in the
              game audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select
                value={resolution}
                onValueChange={(value) => setResolution(value as Resolution)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESOLVED">
                    Resolved / action taken
                  </SelectItem>
                  <SelectItem value="DISMISSED">
                    Dismissed / no action
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resolution-note">Moderator note</Label>
              <Textarea
                id="resolution-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Explain the decision for the audit trail…"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={resolve.isPending}
              onClick={() => {
                setResolutionOpen(false);
                setSelected(null);
                setNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={resolve.isPending || note.trim().length < 3}
              onClick={() => resolve.mutate()}
            >
              {resolve.isPending ? "Saving…" : "Confirm decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
