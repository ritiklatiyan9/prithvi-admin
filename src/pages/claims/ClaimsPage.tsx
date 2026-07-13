import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { ClaimStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
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
import { claimsService } from "@/services/claims.service";
import { apiErrorMessage } from "@/services/api-client";
import { Coins } from "@/components/shared/Coins";
import { formatCoins, formatDateTime } from "@/utils/format";
import type { Claim, ClaimStatus } from "@/types/domain";

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
  { key: "campaignTitle", label: "Campaign" },
  { key: "status", label: "Status" },
  { key: "rewardAmount", label: "Coins" },
  { key: "note", label: "User note" },
  { key: "reviewNote", label: "Review note" },
  { key: "reviewedAt", label: "Reviewed", format: (v) => formatDateTime(v as string | null) },
  { key: "createdAt", label: "Submitted", format: (v) => formatDateTime(v as string | null) },
];

export const ClaimsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<Claim | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["claims", { page, status }],
    queryFn: () =>
      claimsService.list({
        page,
        limit: PAGE_SIZE,
        status: status === "ALL" ? undefined : status,
      }),
  });

  // The backend has no claim text search; filter the current page client-side.
  const visible = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return term
      ? data.items.filter(
          (claim) =>
            claim.userEmail.toLowerCase().includes(term) ||
            claim.campaignTitle.toLowerCase().includes(term),
        )
      : data.items;
  }, [data, search]);

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "APPROVE" | "REJECT" }) =>
      claimsService.review(id, { action, reviewNote: reviewNote.trim() || undefined }),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: ["claims"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(
        claim.status === "APPROVED"
          ? `Claim approved — ${formatCoins(claim.rewardAmount)} coins credited`
          : "Claim rejected",
      );
      setReviewing(null);
      setReviewNote("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Claims"
        description="Verify reward claims — approving credits the user's wallet."
      />

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search user or campaign…",
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
        onClearAll={() => {
          setSearch("");
          setStatus("ALL");
          setPage(1);
        }}
      >
        <ExportButton
          rows={visible as unknown as Record<string, unknown>[]}
          columns={EXPORT_COLUMNS}
          fileName="claims"
          title="Claims"
          page={page}
          filterSummary={
            [
              status !== "ALL" ? `Status: ${status}` : "",
              search.trim() ? `Search: ${search.trim()}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      </FiltersBar>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No claims here"
            description={
              status === "PENDING" && !search.trim()
                ? "You're all caught up."
                : "Nothing matches this filter."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Campaign</TableHead>
                <TableHead className="text-right">Reward</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="max-w-48 truncate font-medium">{claim.userEmail}</TableCell>
                  <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                    {claim.campaignTitle}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Coins value={claim.rewardAmount} />
                  </TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(claim.createdAt)}
                  </TableCell>
                  <TableCell>
                    {claim.status === "PENDING" ? (
                      <Button size="sm" variant="outline" onClick={() => setReviewing(claim)}>
                        Review
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setReviewing(claim)}>
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>

      <Dialog
        open={reviewing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewing(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewing.status === "PENDING" ? "Review claim" : "Claim details"}
                </DialogTitle>
                <DialogDescription>
                  {reviewing.userEmail} · {reviewing.campaignTitle}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-muted-foreground">Reward</span>
                  <span className="font-semibold">
                    <Coins value={reviewing.rewardAmount} />
                  </span>
                </div>
                {reviewing.note && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      User note
                    </p>
                    <p>{reviewing.note}</p>
                  </div>
                )}
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
                    {reviewing.reviewNote && <p className="mt-2">{reviewing.reviewNote}</p>}
                  </div>
                )}
                {reviewing.status === "PENDING" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="reviewNote">Review note (optional)</Label>
                    <Textarea
                      id="reviewNote"
                      rows={2}
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Visible to the user in their notification…"
                    />
                  </div>
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
                    {review.isPending ? "Working…" : "Approve & credit wallet"}
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
