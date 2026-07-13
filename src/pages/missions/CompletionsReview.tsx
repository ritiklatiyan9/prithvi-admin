import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pagination } from "@/components/shared/Pagination";
import { FiltersBar, type DateRangeValue } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { ClaimStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Coins } from "@/components/shared/Coins";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { missionsService, type MissionCompletion } from "@/services/missions.service";
import { apiErrorMessage } from "@/services/api-client";
import { formatDateTime, formatNumber } from "@/utils/format";
import type { ClaimStatus } from "@/types/domain";

const PAGE_SIZE = 10;
type StatusFilter = ClaimStatus | "ALL";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "userEmail", label: "User" },
  { key: "missionTitle", label: "Mission" },
  { key: "rewardCoins", label: "Coins" },
  { key: "status", label: "Status" },
  { key: "note", label: "Review note" },
  { key: "reviewedAt", label: "Reviewed", format: (v) => formatDateTime(v as string | null) },
  { key: "createdAt", label: "Submitted", format: (v) => formatDateTime(v as string | null) },
];

/** Review queue for mission completions — approving credits the user's wallet. */
export const CompletionsReview = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [reviewing, setReviewing] = useState<MissionCompletion | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["missions", "completions", { page, status }],
    queryFn: () =>
      missionsService.listCompletions({
        page,
        limit: PAGE_SIZE,
        status: status === "ALL" ? undefined : status,
      }),
  });

  // ponytail: backend has no search/date params — filter the current page client-side, like Claims.
  const visible = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.items.filter((completion) => {
      if (
        term &&
        !completion.userEmail.toLowerCase().includes(term) &&
        !completion.missionTitle.toLowerCase().includes(term)
      ) {
        return false;
      }
      const day = completion.createdAt.slice(0, 10);
      if (dateRange.from && day < dateRange.from) return false;
      if (dateRange.to && day > dateRange.to) return false;
      return true;
    });
  }, [data, search, dateRange]);

  const closeDialog = (): void => {
    setReviewing(null);
    setNote("");
  };

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "APPROVE" | "REJECT" }) =>
      missionsService.reviewCompletion(id, { action, note: note.trim() || undefined }),
    onSuccess: (completion) => {
      void queryClient.invalidateQueries({ queryKey: ["missions", "completions"] });
      toast.success(
        completion.status === "APPROVED"
          ? `Completion approved — ${formatNumber(completion.rewardCoins)} coins credited`
          : "Completion rejected",
      );
      closeDialog();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <div>
      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search user or mission…",
        }}
        selects={[
          {
            key: "status",
            value: status,
            onChange: (value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            },
            options: STATUS_OPTIONS,
            placeholder: "Status",
          },
        ]}
        dateRange={{ value: dateRange, onChange: setDateRange }}
        onClearAll={() => {
          setSearch("");
          setStatus("ALL");
          setDateRange({ from: "", to: "" });
          setPage(1);
        }}
      >
        <div className="ml-auto">
          <ExportButton
            rows={visible as unknown as Record<string, unknown>[]}
            columns={EXPORT_COLUMNS}
            fileName="mission-completions"
            title="Mission completions"
            page={page}
            filterSummary={
              [
                status !== "ALL" ? `Status: ${status}` : "",
                search.trim() ? `Search: ${search.trim()}` : "",
                dateRange.from || dateRange.to
                  ? `Dates: ${dateRange.from || "…"} – ${dateRange.to || "…"}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          />
        </div>
      </FiltersBar>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No completions here"
            description={
              status === "PENDING" && !search.trim() && !dateRange.from && !dateRange.to
                ? "You're all caught up."
                : "Nothing matches this filter."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Mission</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((completion) => (
                <TableRow key={completion.id}>
                  <TableCell className="max-w-48 truncate font-medium">
                    {completion.userEmail}
                  </TableCell>
                  <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                    {completion.missionTitle}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Coins value={completion.rewardCoins} />
                  </TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={completion.status} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(completion.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={completion.status === "PENDING" ? "outline" : "ghost"}
                      onClick={() => setReviewing(completion)}
                    >
                      {completion.status === "PENDING" ? "Review" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>

      <Dialog open={reviewing !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewing.status === "PENDING" ? "Review completion" : "Completion details"}
                </DialogTitle>
                <DialogDescription>
                  {reviewing.userEmail} · {reviewing.missionTitle}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-muted-foreground">Reward</span>
                  <span className="font-semibold">
                    {formatNumber(reviewing.rewardCoins)} coins
                  </span>
                </div>
                {reviewing.status !== "PENDING" && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Outcome
                    </p>
                    <div className="flex items-center gap-2">
                      <ClaimStatusBadge status={reviewing.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(reviewing.reviewedAt)}
                      </span>
                    </div>
                    {reviewing.note && <p className="mt-2">{reviewing.note}</p>}
                  </div>
                )}
                {reviewing.status === "PENDING" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Approving credits {formatNumber(reviewing.rewardCoins)} coins to the user's
                      wallet and notifies them. Rejecting only notifies them.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="completionNote">Note (optional)</Label>
                      <Textarea
                        id="completionNote"
                        rows={2}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Kept on the review record…"
                      />
                    </div>
                  </>
                )}
              </div>

              {reviewing.status === "PENDING" && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: reviewing.id, action: "REJECT" })}
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: reviewing.id, action: "APPROVE" })}
                  >
                    {review.isPending
                      ? "Working…"
                      : `Approve & credit ${formatNumber(reviewing.rewardCoins)} coins`}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
