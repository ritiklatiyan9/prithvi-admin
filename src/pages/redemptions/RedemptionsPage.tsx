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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  redemptionsService,
  type Redemption,
  type RedemptionStatus,
  type VoucherOffer,
  type VoucherOfferInput,
  type VoucherProviderKind,
} from "@/services/redemptions.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime, formatNumber } from "@/utils/format";

const PAGE_SIZE = 10;
type StatusFilter = RedemptionStatus | "ALL";
type View = "requests" | "catalog";

const STATUS_TABS: StatusFilter[] = [
  "PENDING",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
  "FAILED",
  "ALL",
];

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

const RedemptionStatusBadge = ({
  status,
}: {
  status: RedemptionStatus;
}): JSX.Element => <Badge variant={statusVariants[status]}>{status}</Badge>;

// Local calendar day -> ISO datetime bounds the backend's z.string().datetime() accepts.
const dayStartIso = (date: string): string =>
  new Date(`${date}T00:00:00`).toISOString();
const dayEndIso = (date: string): string =>
  new Date(`${date}T23:59:59.999`).toISOString();

export const RedemptionsPage = (): JSX.Element => {
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");
  const [view, setView] = useState<View>("requests");

  return (
    <div>
      <PageHeader
        title="Redemptions"
        description="Review coin redemption requests and manage the voucher catalog users redeem coins for."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["requests", "catalog"] as View[]).map((key) => (
          <Button
            key={key}
            variant={view === key ? "default" : "outline"}
            size="sm"
            onClick={() => setView(key)}
          >
            {key === "requests" ? "Requests" : "Voucher catalog"}
          </Button>
        ))}
      </div>

      {view === "requests" ? (
        <RequestsTab canEdit={canEdit} />
      ) : (
        <CatalogTab canEdit={canEdit} />
      )}
    </div>
  );
};

const RequestsTab = ({ canEdit }: { canEdit: boolean }): JSX.Element => {
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "redemptions",
      { page, status, search: debouncedSearch, from, to },
    ],
    queryFn: ({ signal }) =>
      redemptionsService.list(
        {
          page,
          limit: PAGE_SIZE,
          method: "VOUCHER", // UPI payouts live on the Payment Requests page
          status: status === "ALL" ? undefined : status,
          search: debouncedSearch.trim() || undefined,
          from: from ? dayStartIso(from) : undefined,
          to: to ? dayEndIso(to) : undefined,
        },
        signal,
      ),
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["redemptions"] });
    // Dashboard queue tiles cache for 30s — a review changes their counts.
    void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const review = useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "APPROVE" | "REJECT";
      note?: string;
    }) => redemptionsService.review(id, { action, note }),
    onSuccess: (redemption, { action }) => {
      invalidate();
      if (action === "REJECT") {
        toast.success(
          `Redemption rejected — ${formatNumber(redemption.coins)} coins refunded`,
        );
      } else if (redemption.status === "FULFILLED") {
        toast.success("Approved — voucher issued automatically");
      } else if (redemption.failReason) {
        toast.warning(
          `Approved, but provider failed: ${redemption.failReason}. Fulfill manually.`,
        );
      } else {
        toast.success("Approved — awaiting manual fulfillment");
      }
      setApproving(null);
      setRejecting(null);
      setRejectNote("");
    },
    onError: (error) => {
      invalidate(); // a 409 means another admin won the race — refresh the row
      toast.error(apiErrorMessage(error));
    },
  });

  const fulfill = useMutation({
    mutationFn: ({
      id,
      code,
      url,
    }: {
      id: string;
      code: string;
      url?: string;
    }) =>
      redemptionsService.fulfill(id, { voucherCode: code, voucherUrl: url }),
    onSuccess: () => {
      invalidate();
      toast.success("Redemption fulfilled — voucher saved");
      setFulfilling(null);
      setVoucherCode("");
      setVoucherUrl("");
    },
    onError: (error) => {
      invalidate();
      toast.error(apiErrorMessage(error));
    },
  });

  const resetToFirstPage = (): void => setPage(1);

  return (
    <>
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
        ) : isError ? (
          <EmptyState
            title="Could not load redemptions"
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
            title="No redemptions here"
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
                <TableHead>Voucher offer</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Requested
                </TableHead>
                <TableHead className="hidden md:table-cell">Voucher</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((redemption) => (
                <TableRow key={redemption.id}>
                  <TableCell className="max-w-56">
                    <p className="truncate font-medium">
                      {redemption.user?.email ?? "—"}
                    </p>
                    {redemption.user?.name && (
                      <p className="truncate text-xs text-muted-foreground">
                        {redemption.user.name}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-48">
                    {redemption.offer ? (
                      <>
                        <p className="truncate text-sm">
                          {redemption.offer.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {redemption.offer.brand} · ₹
                          {formatNumber(redemption.offer.denomination)}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Coins only
                      </span>
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
                    {redemption.status === "FULFILLED" &&
                    redemption.voucherCode ? (
                      <code className="truncate text-xs">
                        {redemption.voucherCode}
                      </code>
                    ) : redemption.failReason ? (
                      <p
                        className="truncate text-xs text-red-600 dark:text-red-400"
                        title={redemption.failReason}
                      >
                        {redemption.failReason}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit && redemption.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setApproving(redemption)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejecting(redemption)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {canEdit && redemption.status === "APPROVED" && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFulfilling(redemption)}
                        >
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
          `${approving.user?.email ?? "This user"} redeems ${formatNumber(approving.coins)} coins${
            approving.offer ? ` for ${approving.offer.title}` : ""
          }. A voucher is issued via the provider automatically; if that fails, the request stays Approved for manual fulfillment.`
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
                  {rejecting.user?.email ?? "This user"} ·{" "}
                  {formatNumber(rejecting.coins)} coins. Rejecting automatically
                  refunds the coins to their wallet.
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
                  Enter the voucher issued to{" "}
                  {fulfilling.user?.email ?? "the user"} for{" "}
                  {fulfilling.offer
                    ? `${fulfilling.offer.title} (₹${formatNumber(fulfilling.offer.denomination)})`
                    : `${formatNumber(fulfilling.coins)} coins`}
                  .
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
    </>
  );
};

// ---------------------------------------------------------------------------
// Voucher catalog: the offers users spend coins on in the app's coupon store.
// ---------------------------------------------------------------------------

const PROVIDER_LABELS: Record<string, string> = {
  manual: "Manual",
  plum: "Xoxoday Link",
  xoxo_code: "Xoxoday Code",
};

const EMPTY_FORM: VoucherOfferInput = {
  title: "",
  brand: "",
  description: "",
  imageUrl: "",
  coinCost: 100,
  denomination: 100,
  provider: "manual",
  providerBrandId: "",
  isActive: true,
  sortOrder: 0,
};

const CatalogTab = ({ canEdit }: { canEdit: boolean }): JSX.Element => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VoucherOffer | "new" | null>(null);
  const [form, setForm] = useState<VoucherOfferInput>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<VoucherOffer | null>(null);

  const {
    data: offers,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["voucher-catalog"],
    queryFn: redemptionsService.listCatalog,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["voucher-catalog"] });
  };

  const openCreate = (): void => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (offer: VoucherOffer): void => {
    setForm({
      title: offer.title,
      brand: offer.brand,
      description: offer.description ?? "",
      imageUrl: offer.imageUrl ?? "",
      coinCost: offer.coinCost,
      denomination: offer.denomination,
      provider: (["manual", "plum", "xoxo_code"] as const).includes(
        offer.provider as VoucherProviderKind,
      )
        ? (offer.provider as VoucherProviderKind)
        : "manual",
      providerBrandId: offer.providerBrandId ?? "",
      isActive: offer.isActive,
      sortOrder: offer.sortOrder,
    });
    setEditing(offer);
  };

  const toPayload = (): VoucherOfferInput => ({
    ...form,
    title: form.title.trim(),
    brand: form.brand.trim(),
    description: form.description?.toString().trim() || null,
    imageUrl: form.imageUrl?.toString().trim() || null,
    providerBrandId: form.providerBrandId?.toString().trim() || null,
  });

  const save = useMutation({
    mutationFn: () =>
      editing === "new" || editing === null
        ? redemptionsService.createOffer(toPayload())
        : redemptionsService.updateOffer(editing.id, toPayload()),
    onSuccess: () => {
      invalidate();
      toast.success(
        editing === "new" ? "Voucher offer created" : "Voucher offer updated",
      );
      setEditing(null);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const toggleActive = useMutation({
    mutationFn: (offer: VoucherOffer) =>
      redemptionsService.updateOffer(offer.id, { isActive: !offer.isActive }),
    onSuccess: (updated) => {
      invalidate();
      toast.success(updated.isActive ? "Offer activated" : "Offer deactivated");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (offer: VoucherOffer) =>
      redemptionsService.deleteOffer(offer.id),
    onSuccess: () => {
      invalidate();
      toast.success("Voucher offer deleted");
      setDeleting(null);
    },
    onError: (error) => {
      setDeleting(null);
      toast.error(apiErrorMessage(error));
    },
  });

  // Mirrors the backend zod schema so invalid values fail inline, not as a
  // post-submit 400 toast: coinCost int 1..1e6, denomination 0..1e6,
  // sortOrder int within ±1e6.
  const formValid =
    form.title.trim().length > 0 &&
    form.brand.trim().length > 0 &&
    Number.isInteger(form.coinCost) &&
    form.coinCost > 0 &&
    form.coinCost <= 1_000_000 &&
    form.denomination > 0 &&
    form.denomination <= 1_000_000 &&
    Number.isInteger(form.sortOrder) &&
    Math.abs(form.sortOrder) <= 1_000_000;

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={openCreate}>
            Add voucher offer
          </Button>
        </div>
      )}

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <EmptyState
            title="Could not load the catalog"
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
        ) : !offers || offers.length === 0 ? (
          <EmptyState
            title="No voucher offers yet"
            description="Add offers users can redeem coins for — they appear in the app's coupon store."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Coin cost</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="max-w-64">
                    <p className="truncate font-medium">{offer.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {offer.brand}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ₹{formatNumber(offer.denomination)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Coins value={offer.coinCost} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        offer.provider === "manual" ? "secondary" : "info"
                      }
                    >
                      {PROVIDER_LABELS[offer.provider] ?? offer.provider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={offer.isActive ? "success" : "secondary"}>
                      {offer.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(offer)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={toggleActive.isPending}
                          onClick={() => toggleActive.mutate(offer)}
                        >
                          {offer.isActive ? "Hide" : "Show"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-600 dark:text-red-400"
                          onClick={() => setDeleting(offer)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Add voucher offer" : "Edit voucher offer"}
            </DialogTitle>
            <DialogDescription>
              Shown in the app's coupon store. On approval, a "Xoxoday gift-card
              code" offer auto-issues a voucher code and a "Xoxoday reward link"
              offer generates a claim link (both require Xoxoday configured in
              Settings → Reward Providers); "Manual" offers need a code entered
              by a super admin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="vo-title">Title</Label>
              <Input
                id="vo-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Amazon Gift Card ₹100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vo-brand">Brand</Label>
              <Input
                id="vo-brand"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Amazon"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vo-image">Image URL (optional)</Label>
              <Input
                id="vo-image"
                value={form.imageUrl ?? ""}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vo-denomination">Voucher value (₹)</Label>
              <Input
                id="vo-denomination"
                type="number"
                min={1}
                value={form.denomination}
                onChange={(e) =>
                  setForm({ ...form, denomination: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vo-coincost">Coin cost</Label>
              <Input
                id="vo-coincost"
                type="number"
                min={1}
                value={form.coinCost}
                onChange={(e) =>
                  setForm({ ...form, coinCost: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(value) =>
                  setForm({ ...form, provider: value as VoucherProviderKind })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual fulfillment</SelectItem>
                  <SelectItem value="xoxo_code">
                    Xoxoday gift-card code
                  </SelectItem>
                  <SelectItem value="plum">Xoxoday reward link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vo-brandid">
                {form.provider === "xoxo_code"
                  ? "Plum product / SKU ID"
                  : form.provider === "plum"
                    ? "Plum campaign ID"
                    : "Provider reference"}
              </Label>
              <Input
                id="vo-brandid"
                value={form.providerBrandId ?? ""}
                onChange={(e) =>
                  setForm({ ...form, providerBrandId: e.target.value })
                }
                placeholder={
                  form.provider === "xoxo_code" ? "e.g. 1097" : "e.g. 2461"
                }
                disabled={form.provider === "manual"}
              />
              <p className="text-xs text-muted-foreground">
                {form.provider === "manual"
                  ? "Not used for manual offers."
                  : "Leave blank to use the default set in Settings → Reward Providers."}
              </p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="vo-desc">Description (optional)</Label>
              <Textarea
                id="vo-desc"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Redeemable on amazon.in…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vo-sort">Sort order</Label>
              <Input
                id="vo-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-end justify-between pb-1">
              <Label htmlFor="vo-active" className="pb-1.5">
                Visible in store
              </Label>
              <Switch
                id="vo-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={save.isPending || !formValid}
              onClick={() => save.mutate()}
            >
              {save.isPending
                ? "Saving…"
                : editing === "new"
                  ? "Create offer"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete voucher offer?"
        description={
          deleting &&
          `"${deleting.title}" will be removed. Offers with redemptions attached can't be deleted — hide them instead.`
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
      />
    </>
  );
};
