import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Coins } from "@/components/shared/Coins";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { redemptionsService, type Redemption, type RedemptionStatus } from "@/services/redemptions.service";
import { apiErrorMessage } from "@/services/api-client";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime, formatNumber } from "@/utils/format";

const PAGE_SIZE = 10;
type StatusFilter = RedemptionStatus | "ALL";

const STATUS_TABS: StatusFilter[] = ["PENDING", "APPROVED", "FULFILLED", "REJECTED", "FAILED", "ALL"];

const statusVariants: Record<RedemptionStatus, "warning" | "info" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "info",
  FULFILLED: "success",
  REJECTED: "destructive",
  FAILED: "destructive",
};

const RedemptionStatusBadge = ({ status }: { status: RedemptionStatus }): JSX.Element => (
  <Badge variant={statusVariants[status]}>{status}</Badge>
);

// Local calendar day -> ISO datetime bounds the backend's z.string().datetime() accepts.
const dayStartIso = (date: string): string => new Date(`${date}T00:00:00`).toISOString();
const dayEndIso = (date: string): string => new Date(`${date}T23:59:59.999`).toISOString();

export const RedemptionsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [approving, setApproving] = useState<Redemption | null>(null);
  const [rejecting, setRejecting] = useState<Redemption | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [fulfilling, setFulfilling] = useState<Redemption | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");

  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ["redemptions", { page, status, search: debouncedSearch, from, to }],
    queryFn: () =>
      redemptionsService.list({
        page,
        limit: PAGE_SIZE,
        status: status === "ALL" ? undefined : status,
        search: debouncedSearch.trim() || undefined,
        from: from ? dayStartIso(from) : undefined,
        to: to ? dayEndIso(to) : undefined,
      }),
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["redemptions"] });
  };

  const review = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: "APPROVE" | "REJECT"; note?: string }) =>
      redemptionsService.review(id, { action, note }),
    onSuccess: (redemption, { action }) => {
      invalidate();
      if (action === "REJECT") {
        toast.success(`Redemption rejected — ${formatNumber(redemption.coins)} coins refunded`);
      } else if (redemption.status === "FULFILLED") {
        toast.success("Approved — voucher issued automatically");
      } else if (redemption.failReason) {
        toast.warning(`Approved, but provider failed: ${redemption.failReason}. Fulfill manually.`);
      } else {
        toast.success("Approved — awaiting manual fulfillment");
      }
      setApproving(null);
      setRejecting(null);
      setRejectNote("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const fulfill = useMutation({
    mutationFn: ({ id, code, url }: { id: string; code: string; url?: string }) =>
      redemptionsService.fulfill(id, { voucherCode: code, voucherUrl: url }),
    onSuccess: () => {
      invalidate();
      toast.success("Redemption fulfilled — voucher saved");
      setFulfilling(null);
      setVoucherCode("");
      setVoucherUrl("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const resetToFirstPage = (): void => setPage(1);

  return (
    <div>
      <PageHeader
        title="Redemptions"
        description="Review coin redemption requests — rejecting refunds the user's wallet."
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={status === tab ? "default" : "ghost"}
            onClick={() => {
              setStatus(tab);
              resetToFirstPage();
            }}
          >
            {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            resetToFirstPage();
          }}
          placeholder="Search by user email…"
          className="sm:w-72"
        />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              resetToFirstPage();
            }}
            className="sm:w-40"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              resetToFirstPage();
            }}
            className="sm:w-40"
          />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No redemptions here"
            description={
              status === "PENDING" ? "You're all caught up." : "Nothing matches these filters."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Requested</TableHead>
                <TableHead className="hidden md:table-cell">Voucher</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((redemption) => (
                <TableRow key={redemption.id}>
                  <TableCell className="max-w-56">
                    <p className="truncate font-medium">{redemption.user?.email ?? "—"}</p>
                    {redemption.user?.name && (
                      <p className="truncate text-xs text-muted-foreground">
                        {redemption.user.name}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Coins value={redemption.coins} />
                  </TableCell>
                  <TableCell>
                    <RedemptionStatusBadge status={redemption.status} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(redemption.createdAt)}
                  </TableCell>
                  <TableCell className="hidden max-w-48 md:table-cell">
                    {redemption.status === "FULFILLED" && redemption.voucherCode ? (
                      <code className="truncate text-xs">{redemption.voucherCode}</code>
                    ) : redemption.failReason ? (
                      <p className="truncate text-xs text-red-600 dark:text-red-400" title={redemption.failReason}>
                        {redemption.failReason}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {redemption.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setApproving(redemption)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(redemption)}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {redemption.status === "APPROVED" && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => setFulfilling(redemption)}>
                          Fulfill
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(open) => {
          if (!open) setApproving(null);
        }}
        title="Approve redemption?"
        description={
          approving &&
          `${approving.user?.email ?? "This user"} redeems ${formatNumber(approving.coins)} coins. A voucher is issued via the provider automatically; if that fails, the request stays Approved for manual fulfillment.`
        }
        confirmLabel="Approve"
        loading={review.isPending}
        onConfirm={() => {
          if (approving) review.mutate({ id: approving.id, action: "APPROVE" });
        }}
      />

      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          {rejecting && (
            <>
              <DialogHeader>
                <DialogTitle>Reject redemption</DialogTitle>
                <DialogDescription>
                  {rejecting.user?.email ?? "This user"} · {formatNumber(rejecting.coins)} coins.
                  Rejecting automatically refunds the coins to their wallet.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="rejectNote">Note (optional)</Label>
                <Textarea
                  id="rejectNote"
                  rows={2}
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                  placeholder="Reason for rejection…"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={review.isPending}
                  onClick={() => {
                    setRejecting(null);
                    setRejectNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({
                      id: rejecting.id,
                      action: "REJECT",
                      note: rejectNote.trim() || undefined,
                    })
                  }
                >
                  {review.isPending ? "Working…" : "Reject & refund"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={fulfilling !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFulfilling(null);
            setVoucherCode("");
            setVoucherUrl("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          {fulfilling && (
            <>
              <DialogHeader>
                <DialogTitle>Fulfill manually</DialogTitle>
                <DialogDescription>
                  Enter the voucher issued to {fulfilling.user?.email ?? "the user"} for{" "}
                  {formatNumber(fulfilling.coins)} coins.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="voucherCode">Voucher code</Label>
                  <Input
                    id="voucherCode"
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value)}
                    placeholder="e.g. AMZ-XXXX-XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="voucherUrl">Voucher URL (optional)</Label>
                  <Input
                    id="voucherUrl"
                    type="url"
                    value={voucherUrl}
                    onChange={(event) => setVoucherUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={fulfill.isPending}
                  onClick={() => {
                    setFulfilling(null);
                    setVoucherCode("");
                    setVoucherUrl("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={fulfill.isPending || !voucherCode.trim()}
                  onClick={() =>
                    fulfill.mutate({
                      id: fulfilling.id,
                      code: voucherCode.trim(),
                      url: voucherUrl.trim() || undefined,
                    })
                  }
                >
                  {fulfill.isPending ? "Working…" : "Mark fulfilled"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
