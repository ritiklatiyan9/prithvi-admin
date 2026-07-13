import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { Coins } from "@/components/shared/Coins";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hotOffersService } from "@/services/hot-offers.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/utils/format";
import type { ContentStatus, HotOffer } from "@/types/domain";
import { OfferFormDialog } from "../hot-offers/OfferFormDialog";
import { SubmissionsReview } from "../hot-offers/SubmissionsReview";

const PAGE_SIZE = 10;

const statusBadge: Record<ContentStatus, "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  ARCHIVED: "outline",
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const OFFER_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "appName", label: "App" },
  { key: "category", label: "Category", format: (v) => (v as { title: string }).title },
  { key: "rewardAmount", label: "Reward coins" },
  { key: "rewardCoins", label: "Coins" },
  { key: "featured", label: "Featured", format: (v) => (v ? "Yes" : "No") },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created", format: (v) => formatDateTime(v as string | null) },
];

export const AppOffersPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const [view, setView] = useState<"offers" | "submissions">("offers");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "ALL">("ALL");
  const [offerDialog, setOfferDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<HotOffer | null>(null);
  const [deleteOffer, setDeleteOffer] = useState<HotOffer | null>(null);

  // Needed by OfferFormDialog's category picker.
  const categories = useQuery({
    queryKey: ["hot-offers", "categories"],
    queryFn: hotOffersService.listCategories,
  });

  const offers = useQuery({
    queryKey: ["hot-offers", "offers", { page, search, statusFilter, product: true }],
    queryFn: () =>
      hotOffersService.listOffers({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        product: true,
      }),
    enabled: view === "offers",
  });

  const removeOffer = useMutation({
    mutationFn: (id: string) => hotOffersService.deleteOffer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hot-offers"] });
      setDeleteOffer(null);
      toast.success("Offer deleted");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="App Offers"
        description="App/brand (product) offers featured on the app home and carousel, plus their proof submissions."
        actions={
          canWrite && view === "offers" ? (
            <Button
              onClick={() => {
                setEditingOffer(null);
                setOfferDialog(true);
              }}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" /> New app offer
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["offers", "submissions"] as const).map((tab) => (
          <Button
            key={tab}
            variant={view === tab ? "default" : "outline"}
            size="sm"
            className="capitalize"
            onClick={() => setView(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {view === "offers" && (
        <>
          <FiltersBar
            search={{
              value: search,
              onChange: (value) => {
                setSearch(value);
                setPage(1);
              },
              placeholder: "Search app offers…",
            }}
            selects={[
              {
                key: "status",
                value: statusFilter,
                onChange: (value) => {
                  setStatusFilter(value as ContentStatus | "ALL");
                  setPage(1);
                },
                options: STATUS_OPTIONS,
                placeholder: "Status",
                className: "sm:w-40",
              },
            ]}
            onClearAll={() => {
              setSearch("");
              setStatusFilter("ALL");
              setPage(1);
            }}
          >
            <div className="ml-auto">
              <ExportButton
                rows={(offers.data?.items ?? []) as unknown as Record<string, unknown>[]}
                columns={OFFER_COLUMNS}
                fileName="app-offers"
                title="App Offers"
                page={page}
                filterSummary={
                  [
                    statusFilter !== "ALL" ? `Status: ${statusFilter}` : "",
                    search.trim() ? `Search: ${search.trim()}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              />
            </div>
          </FiltersBar>

          <Card>
            {offers.isLoading ? (
              <TableSkeleton />
            ) : !offers.data || offers.data.items.length === 0 ? (
              <EmptyState
                title="No app offers"
                description="Product offers with a brand logo appear on the app home carousel."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offer</TableHead>
                        <TableHead className="text-right">Coins</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        {canWrite && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.data.items.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="max-w-64">
                            <div className="flex items-center gap-2.5">
                              {(offer.brandLogoUrl ?? offer.logoUrl) && (
                                <img
                                  src={offer.brandLogoUrl ?? offer.logoUrl ?? undefined}
                                  alt=""
                                  className="h-9 w-9 shrink-0 rounded-md border object-cover"
                                  onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {offer.title}
                                  <Badge className="ml-2">Product</Badge>
                                  {offer.featured && (
                                    <Badge className="ml-2" variant="info">
                                      Featured
                                    </Badge>
                                  )}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {offer.shortDescription}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            <Coins value={offer.rewardCoins} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge[offer.status]}>{offer.status}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDateTime(offer.createdAt)}
                          </TableCell>
                          {canWrite && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingOffer(offer);
                                  setOfferDialog(true);
                                }}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteOffer(offer)}
                              >
                                <TrashIcon className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Pagination meta={offers.data.meta} onPageChange={setPage} />
              </>
            )}
          </Card>
        </>
      )}

      {view === "submissions" && <SubmissionsReview product />}

      <OfferFormDialog
        open={offerDialog}
        onOpenChange={setOfferDialog}
        categories={categories.data ?? []}
        offer={editingOffer}
        lockProduct
      />
      <ConfirmDialog
        open={deleteOffer !== null}
        onOpenChange={(open) => !open && setDeleteOffer(null)}
        title={`Delete "${deleteOffer?.title}"?`}
        description="Soft delete — the offer disappears from the app home."
        confirmLabel="Delete"
        destructive
        loading={removeOffer.isPending}
        onConfirm={() => deleteOffer && removeOffer.mutate(deleteOffer.id)}
      />
    </div>
  );
};
