import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
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
import { claimsService } from "@/services/claims.service";
import { apiErrorMessage } from "@/services/api-client";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Claim, ClaimStatus } from "@/types/domain";

const PAGE_SIZE = 10;
type StatusFilter = ClaimStatus | "ALL";

export const ClaimsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
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

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "APPROVE" | "REJECT" }) =>
      claimsService.review(id, { action, reviewNote: reviewNote.trim() || undefined }),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: ["claims"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(
        claim.status === "APPROVED"
          ? `Claim approved — ${formatCurrency(claim.rewardAmount)} credited`
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

      <div className="mb-4">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No claims here"
            description={status === "PENDING" ? "You're all caught up." : "Nothing matches this filter."}
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
              {data.items.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="max-w-48 truncate font-medium">{claim.userEmail}</TableCell>
                  <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                    {claim.campaignTitle}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(claim.rewardAmount)}
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
                  <span className="font-semibold">{formatCurrency(reviewing.rewardAmount)}</span>
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
