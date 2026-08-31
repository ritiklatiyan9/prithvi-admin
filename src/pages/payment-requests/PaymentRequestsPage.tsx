import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { FiltersBar } from "@/components/shared/FiltersBar";
import {
  ExportButton,
  type ExportColumn,
} from "@/components/shared/ExportButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
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
import {
  redemptionsService,
  type Redemption,
  type RedemptionStatus,
} from "@/services/redemptions.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime, formatNumber } from "@/utils/format";

const PAGE_SIZE = 10;
type StatusFilter = RedemptionStatus | "ALL";

// UPI rows: PENDING (awaiting payment), APPROVED (claimed — an admin is paying
// right now, shown as "Processing"), FULFILLED (paid) or REJECTED (refunded).
const STATUS_TABS: StatusFilter[] = [
  "PENDING",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
  "ALL",
];

const statusLabel = (status: StatusFilter): string =>
  status === "ALL"
    ? "All"
    : status === "APPROVED"
      ? "Processing"
      : status.charAt(0) + status.slice(1).toLowerCase();

const statusVariants: Record<
  RedemptionStatus,
  "warning" | "info" | "success" | "destructive" | "secondary"
> = {
  PENDING: "warning",
  APPROVED: "info",
  FULFILLED: "success",
  REJECTED: "destructive",
  FAILED: "destructive",
};

const inr = (value: number | null): string =>
  value === null ? "—" : `₹${value.toFixed(2)}`;

const copy = (text: string, label: string): void => {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Could not copy — copy it manually"),
  );
};

const CopyButton = ({
  text,
  label,
}: {
  text: string;
  label: string;
}): JSX.Element => (
  <button
    type="button"
    title={`Copy ${label.toLowerCase()}`}
    onClick={() => copy(text, label)}
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
  >
    <ClipboardDocumentIcon className="h-4 w-4" />
  </button>
);

/** upi://pay deep link — every param URL-encoded (spaces as %20, not "+").
 *  Callers must pass real values: a malformed row must never become a ₹0 QR. */
const upiPayUri = (
  upiId: string,
  amountInr: number,
  userName?: string | null,
): string => {
  const params: Record<string, string> = {
    pa: upiId,
    pn: userName || "Prithvi user",
    am: amountInr.toFixed(2),
    cu: "INR",
    tn: "Prithvi payout",
  };
  return `upi://pay?${Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&")}`;
};

/** A row the pay dialog can act on (legacy/edited rows may miss either field). */
const isPayable = (redemption: Redemption): boolean =>
  redemption.upiId !== null && redemption.amountInr !== null;

const EXPORT_COLUMNS: ExportColumn[] = [
  {
    key: "user",
    label: "Email",
    format: (user) => (user as Redemption["user"])?.email ?? "",
  },
  {
    key: "user",
    label: "Name",
    format: (user) => (user as Redemption["user"])?.name ?? "",
  },
  { key: "coins", label: "Coins" },
  {
    key: "amountInr",
    label: "Amount (INR)",
    format: (value) => inr(value as number | null),
  },
  { key: "upiId", label: "UPI ID" },
  { key: "status", label: "Status" },
  { key: "providerRef", label: "UTR" },
  {
    key: "createdAt",
    label: "Requested",
    format: (value) => formatDateTime(value as string),
  },
];

export const PaymentRequestsPage = (): JSX.Element => {
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [search, setSearch] = useState("");

  const [paying, setPaying] = useState<Redemption | null>(null);
  /** True when THIS dialog claimed the row — cancelling then releases it. */
  const [claimedHere, setClaimedHere] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [confirmedSent, setConfirmedSent] = useState(false);
  const [rejecting, setRejecting] = useState<Redemption | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["redemptions", "upi", { page, status, search }],
    queryFn: ({ signal }) =>
      redemptionsService.list(
        {
          page,
          limit: PAGE_SIZE,
          method: "UPI",
          status: status === "ALL" ? undefined : status,
          search: search.trim() || undefined,
        },
        signal,
      ),
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["redemptions"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const closePayDialog = (): void => {
    setPaying(null);
    setClaimedHere(false);
    setPaymentRef("");
    setPayNote("");
    setConfirmedSent(false);
  };

  const release = useMutation({
    mutationFn: (id: string) => redemptionsService.release(id),
    onSuccess: invalidate,
    onError: (error) => {
      // Losing a release race (row already settled elsewhere) is fine — just resync.
      invalidate();
      toast.error(apiErrorMessage(error));
    },
  });

  /** Cancel path: a claim made by this dialog goes back to the pending queue. */
  const cancelPayDialog = (): void => {
    if (paying && claimedHere) release.mutate(paying.id);
    closePayDialog();
  };

  /** Claim first (blocks reject/refund while the money is in flight), then open. */
  const claim = useMutation({
    mutationFn: (redemption: Redemption) =>
      redemptionsService.claim(redemption.id),
    onSuccess: (redemption) => {
      invalidate();
      setPaying(redemption);
      setClaimedHere(true);
    },
    onError: (error) => {
      invalidate(); // 409 = another admin claimed/settled it first
      toast.error(apiErrorMessage(error));
    },
  });

  const openPayDialog = (redemption: Redemption): void => {
    if (redemption.status === "PENDING") {
      claim.mutate(redemption);
    } else {
      // Already claimed (Processing) — resume without re-claiming; cancelling
      // will NOT auto-release, the explicit Release button does that.
      setPaying(redemption);
      setClaimedHere(false);
    }
  };

  const markPaid = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      redemptionsService.markPaid(id, {
        paymentRef: paymentRef.trim() || undefined,
        note: payNote.trim() || undefined,
      }),
    onSuccess: (redemption) => {
      invalidate();
      toast.success(`Payout of ${inr(redemption.amountInr)} marked as paid`);
      closePayDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        // Another admin already settled/rejected it — resync and close.
        invalidate();
        closePayDialog();
      }
      // Any other failure (network, 5xx): keep the dialog open so the typed
      // UTR survives — the admin has already sent real money.
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      redemptionsService.review(id, { action: "REJECT", note }),
    onSuccess: (redemption) => {
      invalidate();
      toast.success(
        `Request rejected — ${formatNumber(redemption.coins)} coins refunded`,
      );
      setRejecting(null);
      setRejectNote("");
    },
    onError: (error) => {
      invalidate();
      toast.error(apiErrorMessage(error));
      setRejecting(null);
      setRejectNote("");
    },
  });

  return (
    <div>
      <PageHeader
        title="Payment Requests"
        description="UPI coin payouts. Pay the user via the QR code (or manually), then mark the request as paid."
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={status === tab ? "default" : "ghost"}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
          >
            {statusLabel(tab)}
          </Button>
        ))}
      </div>

      <FiltersBar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Search by user email…",
          className: "sm:w-72",
        }}
      >
        <ExportButton
          rows={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          columns={EXPORT_COLUMNS}
          fileName="upi-payment-requests"
          title="UPI Payment Requests"
          filterSummary={`Status: ${status}${search.trim() ? ` · Search: ${search.trim()}` : ""}`}
          page={page}
          className="ml-auto"
        />
      </FiltersBar>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <EmptyState
            title="Could not load payment requests"
            description="Check your connection and try again."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            }
          />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No payment requests here"
            description={
              status === "PENDING"
                ? "You're all caught up."
                : "Nothing matches these filters."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>UPI ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Requested
                </TableHead>
                <TableHead className="hidden md:table-cell">UTR</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((redemption) => (
                <TableRow key={redemption.id}>
                  <TableCell className="max-w-56">
                    <p className="truncate font-medium">
                      {redemption.user?.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {redemption.user?.email ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Coins value={redemption.coins} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {inr(redemption.amountInr)}
                  </TableCell>
                  <TableCell className="max-w-52">
                    {redemption.upiId ? (
                      <span className="flex items-center gap-1">
                        <code className="truncate text-xs">
                          {redemption.upiId}
                        </code>
                        <CopyButton text={redemption.upiId} label="UPI ID" />
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[redemption.status]}>
                      {redemption.status === "APPROVED"
                        ? "PROCESSING"
                        : redemption.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(redemption.createdAt)}
                  </TableCell>
                  <TableCell className="hidden max-w-40 md:table-cell">
                    {redemption.providerRef ? (
                      <code className="truncate text-xs">
                        {redemption.providerRef}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite && redemption.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        {isPayable(redemption) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={claim.isPending}
                            onClick={() => openPayDialog(redemption)}
                          >
                            Pay via QR
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejecting(redemption)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {canWrite && redemption.status === "APPROVED" && (
                      <div className="flex justify-end gap-2">
                        {isPayable(redemption) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPayDialog(redemption)}
                          >
                            Resume payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={release.isPending}
                          onClick={() => release.mutate(redemption.id)}
                          title="Put it back in the pending queue (only if NO money was sent)"
                        >
                          Release
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

      {/* Pay via QR + mark as paid */}
      <Dialog
        open={paying !== null}
        onOpenChange={(open) => {
          if (!open) cancelPayDialog();
        }}
      >
        <DialogContent className="max-w-md">
          {paying && (
            <>
              <DialogHeader>
                <DialogTitle>Pay {inr(paying.amountInr)} via UPI</DialogTitle>
                <DialogDescription>
                  Scan with any UPI app to pay {paying.user?.name ?? "the user"}{" "}
                  ({paying.user?.email ?? "—"}), or pay manually using the
                  details below. Then mark the request as paid. While this
                  request is claimed it cannot be rejected by another admin.
                </DialogDescription>
              </DialogHeader>

              {paying.upiId && paying.amountInr !== null && (
                <div className="flex justify-center">
                  {/* white box so the QR scans on the dark theme */}
                  <div className="rounded-lg bg-white p-3">
                    <QRCodeSVG
                      value={upiPayUri(
                        paying.upiId,
                        paying.amountInr,
                        paying.user?.name,
                      )}
                      size={200}
                      marginSize={1}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">UPI ID</span>
                  <span className="flex min-w-0 items-center gap-1">
                    <code className="truncate text-xs">
                      {paying.upiId ?? "—"}
                    </code>
                    {paying.upiId && (
                      <CopyButton text={paying.upiId} label="UPI ID" />
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="flex items-center gap-1 font-medium tabular-nums">
                    {inr(paying.amountInr)}
                    {paying.amountInr !== null && (
                      <CopyButton
                        text={paying.amountInr.toFixed(2)}
                        label="Amount"
                      />
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentRef">
                    UTR / payment reference (optional)
                  </Label>
                  <Input
                    id="paymentRef"
                    value={paymentRef}
                    onChange={(event) => setPaymentRef(event.target.value)}
                    placeholder="e.g. 415012345678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payNote">Note (optional)</Label>
                  <Textarea
                    id="payNote"
                    rows={2}
                    value={payNote}
                    onChange={(event) => setPayNote(event.target.value)}
                    placeholder="Anything worth remembering…"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={confirmedSent}
                    onChange={(event) => setConfirmedSent(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  I have sent {inr(paying.amountInr)} to{" "}
                  {paying.upiId ?? "this UPI ID"}
                </label>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={markPaid.isPending}
                  onClick={cancelPayDialog}
                >
                  Cancel
                </Button>
                <Button
                  disabled={markPaid.isPending || !confirmedSent}
                  onClick={() => markPaid.mutate({ id: paying.id })}
                >
                  {markPaid.isPending ? "Working…" : "Mark as paid"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject + refund */}
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
                <DialogTitle>Reject payment request</DialogTitle>
                <DialogDescription>
                  {rejecting.user?.email ?? "This user"} ·{" "}
                  {formatNumber(rejecting.coins)} coins (
                  {inr(rejecting.amountInr)}). Rejecting automatically refunds
                  the coins to their wallet — only do this if you have NOT sent
                  the money.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="upiRejectNote">Note (optional)</Label>
                <Textarea
                  id="upiRejectNote"
                  rows={2}
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                  placeholder="Reason for rejection…"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={reject.isPending}
                  onClick={() => {
                    setRejecting(null);
                    setRejectNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={reject.isPending}
                  onClick={() =>
                    reject.mutate({
                      id: rejecting.id,
                      note: rejectNote.trim() || undefined,
                    })
                  }
                >
                  {reject.isPending ? "Working…" : "Reject & refund"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
