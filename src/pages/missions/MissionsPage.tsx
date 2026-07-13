import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveBoxIcon, PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Coins } from "@/components/shared/Coins";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
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
import { missionsService, type Mission } from "@/services/missions.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/utils/format";
import type { ContentStatus } from "@/types/domain";
import { MissionFormDialog } from "./MissionFormDialog";
import { CompletionsReview } from "./CompletionsReview";
import { GameSettings } from "./GameSettings";

const statusVariant: Record<ContentStatus, "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  ARCHIVED: "outline",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "rewardCoins", label: "Coins" },
  { key: "status", label: "Status" },
  { key: "sortOrder", label: "Sort order" },
  { key: "updatedAt", label: "Updated", format: (v) => formatDateTime(v as string | null) },
  { key: "createdAt", label: "Created", format: (v) => formatDateTime(v as string | null) },
];

const TABS = [
  { key: "missions", label: "Missions" },
  { key: "completions", label: "Completions" },
  { key: "game", label: "Game (Tic-Tac-Toe)" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export const MissionsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const [tab, setTab] = useState<Tab>("missions");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [archiving, setArchiving] = useState<Mission | null>(null);

  const missions = useQuery({
    queryKey: ["missions", "admin"],
    queryFn: missionsService.list,
    enabled: tab === "missions",
  });

  const archive = useMutation({
    mutationFn: (id: string) => missionsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["missions"] });
      setArchiving(null);
      toast.success("Mission archived");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Mission Board"
        description="Missions users complete for coins, their review queue, and the tic-tac-toe game."
        actions={
          canWrite && tab === "missions" ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" /> New mission
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label }) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
        {tab === "missions" && (
          <div className="ml-auto">
            <ExportButton
              rows={(missions.data ?? []) as unknown as Record<string, unknown>[]}
              columns={EXPORT_COLUMNS}
              fileName="missions"
              title="Missions"
            />
          </div>
        )}
      </div>

      {tab === "missions" && (
        <Card>
          {missions.isLoading ? (
            <TableSkeleton />
          ) : !missions.data || missions.data.length === 0 ? (
            <EmptyState
              title="No missions"
              description="Create the first mission — publish it to show it in the app."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Coins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sort order</TableHead>
                    <TableHead>Updated</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missions.data.map((mission) => (
                    <TableRow key={mission.id}>
                      <TableCell className="max-w-64">
                        <p className="truncate font-medium">{mission.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {mission.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <Coins value={mission.rewardCoins} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[mission.status]}>{mission.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{mission.sortOrder}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(mission.updatedAt)}
                      </TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(mission);
                              setFormOpen(true);
                            }}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setArchiving(mission)}>
                            <ArchiveBoxIcon className="h-4 w-4 text-red-500" />
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

      {tab === "completions" && <CompletionsReview />}

      {tab === "game" && <GameSettings />}

      <MissionFormDialog open={formOpen} onOpenChange={setFormOpen} mission={editing} />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive "${archiving?.title}"?`}
        description="Soft delete — the mission disappears from the app and this list. Existing completions keep their history."
        confirmLabel="Archive"
        destructive
        loading={archive.isPending}
        onConfirm={() => archiving && archive.mutate(archiving.id)}
      />
    </div>
  );
};
