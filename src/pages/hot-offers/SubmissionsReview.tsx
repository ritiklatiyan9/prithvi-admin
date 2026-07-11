import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hotOffersService } from "@/services/hot-offers.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/utils/format";
import type { OfferSubmission, SubmissionStatus } from "@/types/domain";

const PAGE_SIZE = 10;

const statusBadge: Record<
  SubmissionStatus,
  "secondary" | "success" | "destructive" | "warning" | "outline"
> = {
  PENDING: "secondary",
  APPROVED: "success",
  REJECTED: "destructive",
  NEED_MORE_PROOF: "warning",
  CANCELLED: "outline",
};

export const SubmissionsReview = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canReview = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  type NoteAction = "REJECT" | "NEED_MORE_PROOF";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SubmissionStatus | "ALL">("PENDING");
  const [preview, setPreview] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ submission: OfferSubmission; action: NoteAction } | null>(
    null,
  );
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hot-offers", "submissions", { page, status }],
    queryFn: () =>
      hotOffersService.listSubmissions({
        page,
        limit: PAGE_SIZE,
        status: status === "ALL" ? undefined : status,
      }),
  });

  const review = useMutation({
    mutationFn: (input: {
      id: string;
      action: "APPROVE" | "REJECT" | "NEED_MORE_PROOF";
      reviewNote?: string;
    }) =>
      hotOffersService.reviewSubmission(input.id, {
        action: input.action,
        reviewNote: input.reviewNote,
      }),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ["hot-offers", "submissions"] });
      toast.success(
        input.action === "APPROVE"
          ? "Approved — reward credited to the user"
          : input.action === "NEED_MORE_PROOF"
            ? "Asked the user for more proof"
            : "Submission rejected",
      );
      setNoteFor(null);
      setNote("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as SubmissionStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="NEED_MORE_PROOF">Need more proof</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No submissions"
            description="Proof screenshots submitted from the app appear here for review."
          />
        ) : (
          <>
            <ul className="divide-y">
              {data.items.map((submission) => (
                <li key={submission.id} className="flex flex-wrap items-center gap-4 p-4">
                  <button
                    type="button"
                    onClick={() => setPreview(submission.screenshotUrl)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted"
                    title="View full screenshot"
                  >
                    <img
                      src={submission.screenshotUrl}
                      alt="Proof"
                      className="h-full w-full object-cover"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{submission.offerTitle}</p>
                      <Badge variant={statusBadge[submission.status]}>{submission.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {submission.user
                        ? `${submission.user.name} · ${submission.user.email}`
                        : "Unknown user"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Reward {submission.rewardAmount} · submitted {formatDateTime(submission.createdAt)}
                    </p>
                    {submission.note && (
                      <p className="mt-1 text-sm">“{submission.note}”</p>
                    )}
                    {submission.reviewNote && (
                      <p className="mt-1 text-sm text-red-500">Review: {submission.reviewNote}</p>
                    )}
                  </div>

                  {canReview && submission.status === "PENDING" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ id: submission.id, action: "APPROVE" })}
                        disabled={review.isPending}
                      >
                        <CheckIcon className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNoteFor({ submission, action: "NEED_MORE_PROOF" })}
                        disabled={review.isPending}
                      >
                        <QuestionMarkCircleIcon className="mr-1 h-4 w-4" /> Need proof
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNoteFor({ submission, action: "REJECT" })}
                        disabled={review.isPending}
                      >
                        <XMarkIcon className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Screenshot lightbox */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proof screenshot</DialogTitle>
          </DialogHeader>
          {preview && (
            <img src={preview} alt="Proof" className="max-h-[70vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject / need-more-proof with an optional note shown to the user */}
      <Dialog open={noteFor !== null} onOpenChange={(open) => !open && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteFor?.action === "NEED_MORE_PROOF" ? "Ask for more proof" : "Reject submission"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="review-note">
              {noteFor?.action === "NEED_MORE_PROOF"
                ? "What should the user add? (shown to them)"
                : "Reason (optional — shown to the user)"}
            </Label>
            <Textarea
              id="review-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                noteFor?.action === "NEED_MORE_PROOF"
                  ? "e.g. Include the level screen showing your progress"
                  : "e.g. Screenshot is blurry / wrong app"
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>
              Cancel
            </Button>
            <Button
              variant={noteFor?.action === "NEED_MORE_PROOF" ? "default" : "destructive"}
              disabled={review.isPending}
              onClick={() =>
                noteFor &&
                review.mutate({
                  id: noteFor.submission.id,
                  action: noteFor.action,
                  reviewNote: note.trim() || undefined,
                })
              }
            >
              {noteFor?.action === "NEED_MORE_PROOF" ? "Request more proof" : "Reject submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
