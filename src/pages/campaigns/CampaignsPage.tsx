import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EllipsisHorizontalIcon,
  PauseIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { FiltersBar } from "@/components/shared/FiltersBar";
import {
  ExportButton,
  type ExportColumn,
} from "@/components/shared/ExportButton";
import { CampaignStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { campaignsService } from "@/services/campaigns.service";
import { apiErrorMessage } from "@/services/api-client";
import { Coins } from "@/components/shared/Coins";
import { formatDate } from "@/utils/format";
import type { Campaign, CampaignStatus } from "@/types/domain";
import { CampaignFormDialog } from "./CampaignFormDialog";

const PAGE_SIZE = 10;
type StatusFilter = CampaignStatus | "ALL";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ENDED", label: "Ended" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "rewardAmount", label: "Reward coins" },
  { key: "budget", label: "Budget coins" },
  {
    key: "startsAt",
    label: "Starts",
    format: (v) => formatDate(v as string | null),
  },
  {
    key: "endsAt",
    label: "Ends",
    format: (v) => formatDate(v as string | null),
  },
  {
    key: "createdAt",
    label: "Created",
    format: (v) => formatDate(v as string | null),
  },
];

export const CampaignsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", { page, status }],
    queryFn: ({ signal }) =>
      campaignsService.list(
        {
          page,
          limit: PAGE_SIZE,
          status: status === "ALL" ? undefined : status,
        },
        signal,
      ),
  });

  // The backend has no campaign text search; filter the current page client-side.
  const visible = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return term
      ? data.items.filter((campaign) =>
          campaign.title.toLowerCase().includes(term),
        )
      : data.items;
  }, [data, search]);

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: CampaignStatus }) =>
      campaignsService.changeStatus(id, next),
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campaign is now ${campaign.status}`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (campaign: Campaign): void => {
    setEditing(campaign);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Create and manage reward campaigns."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New campaign
          </Button>
        }
      />

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search by title…",
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
          fileName="campaigns"
          title="Campaigns"
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
            title="No campaigns found"
            description="Create your first campaign to start rewarding users."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reward</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Budget
                </TableHead>
                <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <p className="max-w-64 truncate font-medium">
                      {campaign.title}
                    </p>
                    <p className="max-w-64 truncate text-xs text-muted-foreground">
                      {campaign.description}
                    </p>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Coins value={campaign.rewardAmount} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                    {campaign.budget !== null ? (
                      <Coins value={campaign.budget} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDate(campaign.startsAt)} →{" "}
                    {formatDate(campaign.endsAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <EllipsisHorizontalIcon className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(campaign)}>
                          <PencilSquareIcon /> Edit
                        </DropdownMenuItem>
                        {(campaign.status === "DRAFT" ||
                          campaign.status === "PAUSED") && (
                          <DropdownMenuItem
                            onSelect={() =>
                              statusMutation.mutate({
                                id: campaign.id,
                                next: "ACTIVE",
                              })
                            }
                          >
                            <PlayIcon /> Activate
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "ACTIVE" && (
                          <DropdownMenuItem
                            onSelect={() =>
                              statusMutation.mutate({
                                id: campaign.id,
                                next: "PAUSED",
                              })
                            }
                          >
                            <PauseIcon /> Pause
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "ACTIVE" ||
                          campaign.status === "PAUSED") && (
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onSelect={() =>
                              statusMutation.mutate({
                                id: campaign.id,
                                next: "ENDED",
                              })
                            }
                          >
                            <StopIcon /> End campaign
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>

      <CampaignFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={editing}
      />
    </div>
  );
};
