import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownTrayIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  FireIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { StatCard } from "@/components/shared/StatCard";
import { Coins } from "@/components/shared/Coins";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { hotOffersService } from "@/services/hot-offers.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/utils/format";
import type {
  AnalyticsRange,
  ContentStatus,
  HotOffer,
  OfferCategory,
} from "@/types/domain";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { FeedbackPageDialog } from "./FeedbackPageDialog";
import { OfferFormDialog } from "./OfferFormDialog";
import { SubmissionsReview } from "./SubmissionsReview";
import { RewardSettings } from "./RewardSettings";
import { FraudDetection } from "./FraudDetection";

const PAGE_SIZE = 10;

const statusBadge: Record<ContentStatus, "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  ARCHIVED: "outline",
};

const StatusPill = ({ status }: { status: ContentStatus }): JSX.Element => (
  <Badge variant={statusBadge[status]}>{status}</Badge>
);

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: "Last 14 days",
  weekly: "Last 12 weeks",
  monthly: "Last 12 months",
};

const CATEGORY_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "subtitle", label: "Subtitle" },
  { key: "priority", label: "Priority" },
  { key: "offerCount", label: "Offers" },
  { key: "featured", label: "Featured", format: (v) => (v ? "Yes" : "No") },
  { key: "hasFeedbackPage", label: "Feedback page", format: (v) => (v ? "Yes" : "No") },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created", format: (v) => formatDateTime(v as string | null) },
];

const OFFER_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "appName", label: "App" },
  { key: "category", label: "Category", format: (v) => (v as { title: string }).title },
  { key: "rewardAmount", label: "Reward coins" },
  { key: "rewardCoins", label: "Coins" },
  { key: "difficulty", label: "Difficulty" },
  { key: "priority", label: "Priority" },
  { key: "featured", label: "Featured", format: (v) => (v ? "Yes" : "No") },
  { key: "trending", label: "Trending", format: (v) => (v ? "Yes" : "No") },
  { key: "status", label: "Status" },
  { key: "expiresAt", label: "Expires", format: (v) => formatDateTime(v as string | null) },
  { key: "createdAt", label: "Created", format: (v) => formatDateTime(v as string | null) },
];

const SERIES_COLUMNS: ExportColumn[] = [
  { key: "bucket", label: "Bucket" },
  { key: "views", label: "Views" },
  { key: "clicks", label: "Clicks" },
  { key: "downloads", label: "Downloads" },
];

export const HotOffersPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canWrite = user?.role === "SUPER_ADMIN";

  const [view, setView] = useState<
    "categories" | "offers" | "submissions" | "fraud" | "analytics" | "settings"
  >("categories");

  // categories state
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OfferCategory | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<OfferCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<OfferCategory | null>(null);

  // offers state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [offerDialog, setOfferDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<HotOffer | null>(null);
  const [deleteOffer, setDeleteOffer] = useState<HotOffer | null>(null);

  // analytics state
  const [range, setRange] = useState<AnalyticsRange>("daily");

  const categories = useQuery({
    queryKey: ["hot-offers", "categories"],
    queryFn: hotOffersService.listCategories,
  });

  const offers = useQuery({
    queryKey: ["hot-offers", "offers", { page, search, statusFilter, categoryFilter, product: false }],
    queryFn: () =>
      hotOffersService.listOffers({
        page,
        limit: PAGE_SIZE,
        // FiltersBar already debounces the search input.
        search: search.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        category: categoryFilter === "ALL" ? undefined : categoryFilter,
        // App/brand (product) offers live on the App Offers page.
        product: false,
      }),
    enabled: view === "offers",
  });

  const analytics = useQuery({
    queryKey: ["hot-offers", "analytics", range],
    queryFn: () => hotOffersService.analytics(range),
    enabled: view === "analytics",
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["hot-offers"] });
  };

  const removeCategory = useMutation({
    mutationFn: (id: string) => hotOffersService.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setDeleteCategory(null);
      toast.success("Category deleted");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const removeOffer = useMutation({
    mutationFn: (id: string) => hotOffersService.deleteOffer(id),
    onSuccess: () => {
      invalidate();
      setDeleteOffer(null);
      toast.success("Offer deleted");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

  return (
    <div>
      <PageHeader
        title="Hot Offers"
        description="CMS for the app's Hot Offers funnel: categories, feedback pages, website offers and analytics."
        actions={
          canWrite ? (
            view === "categories" ? (
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryDialog(true);
                }}
              >
                <PlusIcon className="mr-1.5 h-4 w-4" /> New category
              </Button>
            ) : view === "offers" ? (
              <Button
                onClick={() => {
                  setEditingOffer(null);
                  setOfferDialog(true);
                }}
              >
                <PlusIcon className="mr-1.5 h-4 w-4" /> New offer
              </Button>
            ) : undefined
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          ["categories", "offers", "submissions", "fraud", "analytics", "settings"] as const
        ).map((tab) => (
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
        {view === "categories" && (
          <div className="ml-auto">
            <ExportButton
              rows={(categories.data ?? []) as unknown as Record<string, unknown>[]}
              columns={CATEGORY_COLUMNS}
              fileName="hot-offer-categories"
              title="Hot Offer categories"
            />
          </div>
        )}
        {view === "analytics" && (
          <div className="ml-auto flex items-center gap-2">
            <Select value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Last 14 days</SelectItem>
                <SelectItem value="weekly">Last 12 weeks</SelectItem>
                <SelectItem value="monthly">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton
              rows={(analytics.data?.series ?? []) as unknown as Record<string, unknown>[]}
              columns={SERIES_COLUMNS}
              fileName="hot-offers-analytics"
              title="Hot Offers analytics timeline"
              filterSummary={`Range: ${RANGE_LABELS[range]}`}
            />
          </div>
        )}
      </div>

      {view === "offers" && (
        <FiltersBar
          search={{
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPage(1);
            },
            placeholder: "Search offers…",
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
            {
              key: "category",
              value: categoryFilter,
              onChange: (value) => {
                setCategoryFilter(value);
                setPage(1);
              },
              options: [
                { value: "ALL", label: "All categories" },
                ...(categories.data ?? []).map((c) => ({ value: c.slug, label: c.title })),
              ],
              placeholder: "Category",
            },
          ]}
          onClearAll={() => {
            setSearch("");
            setStatusFilter("ALL");
            setCategoryFilter("ALL");
            setPage(1);
          }}
        >
          <div className="ml-auto">
            <ExportButton
              rows={(offers.data?.items ?? []) as unknown as Record<string, unknown>[]}
              columns={OFFER_COLUMNS}
              fileName="hot-offers"
              title="Hot Offers"
              page={page}
              filterSummary={
                [
                  statusFilter !== "ALL" ? `Status: ${statusFilter}` : "",
                  categoryFilter !== "ALL"
                    ? `Category: ${
                        categories.data?.find((c) => c.slug === categoryFilter)?.title ??
                        categoryFilter
                      }`
                    : "",
                  search.trim() ? `Search: ${search.trim()}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
          </div>
        </FiltersBar>
      )}

      {view === "categories" && (
        <Card>
          {categories.isLoading ? (
            <TableSkeleton />
          ) : !categories.data || categories.data.length === 0 ? (
            <EmptyState
              title="No categories"
              description="Create the first category to light up the app's Hot Offers screen."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                    <TableHead className="text-right">Offers</TableHead>
                    <TableHead>Feedback page</TableHead>
                    <TableHead>Status</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.data.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {category.imageUrl && (
                            <img
                              src={category.imageUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-md border object-cover"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          )}
                          <div>
                            <p className="font-medium">
                              {category.title}
                              {category.featured && (
                                <Badge className="ml-2" variant="info">
                                  Featured
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{category.subtitle}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {category.slug}
                      </TableCell>
                      <TableCell className="text-right text-sm">{category.priority}</TableCell>
                      <TableCell className="text-right text-sm">{category.offerCount}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canWrite && !category.hasFeedbackPage}
                          onClick={() => setFeedbackFor(category)}
                        >
                          {category.hasFeedbackPage ? "Edit page" : canWrite ? "Create page" : "—"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={category.status} />
                      </TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryDialog(true);
                            }}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteCategory(category)}
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
          )}
        </Card>
      )}

      {view === "offers" && (
        <p className="mb-3 text-sm text-muted-foreground">
          Feedback offers only — app/brand (product) offers moved to the App Offers page.
        </p>
      )}

      {view === "offers" && (
        <Card>
          {offers.isLoading ? (
            <TableSkeleton />
          ) : !offers.data || offers.data.items.length === 0 ? (
            <EmptyState
              title="No offers"
              description="Offers appear as cards on the public website."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Offer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Reward</TableHead>
                      <TableHead className="text-right">Priority</TableHead>
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
                                {offer.isProduct && <Badge className="ml-2">Product</Badge>}
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
                        <TableCell className="text-sm">{offer.category.title}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {offer.rewardLabel ?? <Coins value={offer.rewardAmount} />}
                        </TableCell>
                        <TableCell className="text-right text-sm">{offer.priority}</TableCell>
                        <TableCell>
                          <StatusPill status={offer.status} />
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
      )}

      {view === "submissions" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Feedback-offer submissions only — app/brand offer submissions are reviewed on the App
            Offers page.
          </p>
          <SubmissionsReview product={false} />
        </>
      )}

      {view === "fraud" && <FraudDetection />}

      {view === "settings" && <RewardSettings />}

      {view === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Views"
              value={analytics.data?.totals.views ?? 0}
              icon={EyeIcon}
              loading={analytics.isLoading}
            />
            <StatCard
              label="Clicks"
              value={analytics.data?.totals.clicks ?? 0}
              icon={CursorArrowRaysIcon}
              hint={analytics.data ? `CTR ${percent(analytics.data.totals.ctr)}` : undefined}
              loading={analytics.isLoading}
            />
            <StatCard
              label="Downloads"
              value={analytics.data?.totals.downloads ?? 0}
              icon={ArrowDownTrayIcon}
              hint={
                analytics.data
                  ? `Conversion ${percent(analytics.data.totals.conversionRate)}`
                  : undefined
              }
              loading={analytics.isLoading}
            />
            <StatCard
              label="Unique users"
              value={analytics.data?.totals.uniqueUsers ?? 0}
              icon={UsersIcon}
              loading={analytics.isLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(["topOffers", "topCategories"] as const).map((key) => (
              <Card key={key} className="p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FireIcon className="h-4 w-4 text-orange-500" />
                  {key === "topOffers" ? "Top offers" : "Top categories"}
                </p>
                {analytics.isLoading ? (
                  <TableSkeleton />
                ) : !analytics.data || analytics.data[key].length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No events in this range yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Downloads</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.data[key].map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-48 truncate text-sm">{row.title}</TableCell>
                          <TableCell className="text-right text-sm">{row.views}</TableCell>
                          <TableCell className="text-right text-sm">{row.clicks}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {row.downloads}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            ))}
          </div>

          {analytics.data && analytics.data.series.length > 0 && (
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold">Timeline</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Downloads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.data.series.map((row) => (
                    <TableRow key={row.bucket}>
                      <TableCell className="text-sm">{row.bucket}</TableCell>
                      <TableCell className="text-right text-sm">{row.views}</TableCell>
                      <TableCell className="text-right text-sm">{row.clicks}</TableCell>
                      <TableCell className="text-right text-sm">{row.downloads}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      <CategoryFormDialog
        open={categoryDialog}
        onOpenChange={setCategoryDialog}
        category={editingCategory}
      />
      <FeedbackPageDialog
        open={feedbackFor !== null}
        onOpenChange={(open) => !open && setFeedbackFor(null)}
        category={feedbackFor}
      />
      <OfferFormDialog
        open={offerDialog}
        onOpenChange={setOfferDialog}
        categories={categories.data ?? []}
        offer={editingOffer}
      />
      <ConfirmDialog
        open={deleteCategory !== null}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
        title={`Delete "${deleteCategory?.title}"?`}
        description="Soft delete — the category and its offers disappear from the app and website."
        confirmLabel="Delete"
        destructive
        loading={removeCategory.isPending}
        onConfirm={() => deleteCategory && removeCategory.mutate(deleteCategory.id)}
      />
      <ConfirmDialog
        open={deleteOffer !== null}
        onOpenChange={(open) => !open && setDeleteOffer(null)}
        title={`Delete "${deleteOffer?.title}"?`}
        description="Soft delete — the offer disappears from the website."
        confirmLabel="Delete"
        destructive
        loading={removeOffer.isPending}
        onConfirm={() => deleteOffer && removeOffer.mutate(deleteOffer.id)}
      />
    </div>
  );
};
