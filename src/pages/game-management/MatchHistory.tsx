import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FiltersBar,
  type DateRangeValue,
} from "@/components/shared/FiltersBar";
import {
  ExportButton,
  type ExportColumn,
} from "@/components/shared/ExportButton";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ludoAdminService } from "@/services/ludo-admin.service";
import type { GameMatchSummary } from "@/types/ludo-admin";
import { formatDateTime } from "@/utils/format";
import { GameStatusBadge, SectionError } from "./shared";
import {
  formatDuration,
  formatGameMode,
  playerNames,
  userLabel,
} from "./utils";
import { MatchDetailsDialog } from "./MatchDetailsDialog";

const PAGE_SIZE = 20;
type ModeFilter = "ALL" | "TWO_PLAYER" | "THREE_PLAYER" | "FOUR_PLAYER";
type MatchStatus = "ALL" | "COMPLETED" | "ABANDONED" | "CANCELLED" | "EXPIRED";

const localDayBoundary = (
  date: string,
  boundary: "start" | "end",
): string | undefined => {
  if (!date) return undefined;
  const value = new Date(
    `${date}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`,
  );
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "id", label: "Match ID" },
  { key: "roomId", label: "Room ID" },
  {
    key: "mode",
    label: "Mode",
    format: (value) => formatGameMode(value as string),
  },
  {
    key: "players",
    label: "Players",
    format: (value) => playerNames(value as GameMatchSummary["players"]),
  },
  { key: "status", label: "Status" },
  { key: "result", label: "Result" },
  {
    key: "durationSeconds",
    label: "Duration",
    format: (value) => formatDuration(value as number),
  },
  { key: "disconnects", label: "Disconnects" },
  { key: "forfeits", label: "Forfeits" },
  {
    key: "completedAt",
    label: "Completed",
    format: (value) => formatDateTime(value as string | null),
  },
];

export const MatchHistory = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<ModeFilter>("ALL");
  const [status, setStatus] = useState<MatchStatus>("ALL");
  const [dates, setDates] = useState<DateRangeValue>({ from: "", to: "" });
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const matches = useQuery({
    queryKey: ["game-admin", "matches", { page, search, mode, status, dates }],
    queryFn: ({ signal }) =>
      ludoAdminService.matches(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          mode: mode === "ALL" ? undefined : mode,
          status: status === "ALL" ? undefined : status,
          from: localDayBoundary(dates.from, "start"),
          to: localDayBoundary(dates.to, "end"),
        },
        signal,
      ),
    refetchInterval: 30_000,
  });

  const rows = matches.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Match history</h2>
        <p className="text-sm text-muted-foreground">
          Search server-owned results by player or room and inspect every
          recorded action.
        </p>
      </div>

      <FiltersBar
        className="mb-0"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "User, email, room or match…",
          className: "sm:w-72",
        }}
        selects={[
          {
            key: "mode",
            value: mode,
            onChange: (value) => {
              setMode(value as ModeFilter);
              setPage(1);
            },
            options: [
              { value: "ALL", label: "All modes" },
              { value: "TWO_PLAYER", label: "2-player" },
              { value: "THREE_PLAYER", label: "3-player" },
              { value: "FOUR_PLAYER", label: "4-player" },
            ],
          },
          {
            key: "status",
            value: status,
            onChange: (value) => {
              setStatus(value as MatchStatus);
              setPage(1);
            },
            options: [
              { value: "ALL", label: "All results" },
              { value: "COMPLETED", label: "Completed" },
              { value: "ABANDONED", label: "Abandoned" },
              { value: "CANCELLED", label: "Cancelled" },
              { value: "EXPIRED", label: "Expired" },
            ],
          },
        ]}
        dateRange={{
          value: dates,
          onChange: (value) => {
            setDates(value);
            setPage(1);
          },
        }}
        onClearAll={() => {
          setSearch("");
          setMode("ALL");
          setStatus("ALL");
          setDates({ from: "", to: "" });
          setPage(1);
        }}
      >
        <ExportButton
          className="ml-auto"
          rows={rows as unknown as Record<string, unknown>[]}
          columns={EXPORT_COLUMNS}
          fileName="ludo-match-history"
          title="Ludo Match History"
          page={page}
          filterSummary={`Mode: ${mode} · Status: ${status}${dates.from || dates.to ? ` · Dates: ${dates.from || "…"}–${dates.to || "…"}` : ""}${search ? ` · Search: ${search}` : ""}`}
        />
      </FiltersBar>

      <Card>
        {matches.isLoading ? (
          <TableSkeleton rows={8} />
        ) : matches.isError && !matches.data ? (
          <SectionError
            retry={() => void matches.refetch()}
            title="Could not load matches"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No matches found"
            description="Completed and abandoned game records matching the filters appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match / room</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Winner / result</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>DC / forfeits</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="max-w-44">
                      <code className="block truncate text-xs" title={match.id}>
                        {match.id}
                      </code>
                      <code
                        className="block truncate text-[11px] text-muted-foreground"
                        title={match.roomId}
                      >
                        {match.roomId}
                      </code>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatGameMode(match.mode)}
                    </TableCell>
                    <TableCell
                      className="max-w-56 truncate"
                      title={playerNames(match.players)}
                    >
                      {playerNames(match.players)}
                    </TableCell>
                    <TableCell className="max-w-44 truncate">
                      {match.winner
                        ? userLabel(match.winner)
                        : (match.result ?? match.winnerId ?? "—")}
                    </TableCell>
                    <TableCell>
                      <GameStatusBadge status={match.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDuration(match.durationSeconds)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {match.disconnects ?? 0} / {match.forfeits ?? 0}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {formatDateTime(
                        match.completedAt ?? match.createdAt ?? null,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMatch(match.id)}
                      >
                        Timeline
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {matches.data && (
          <Pagination meta={matches.data.meta} onPageChange={setPage} />
        )}
      </Card>

      <MatchDetailsDialog
        matchId={selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
      />
    </div>
  );
};
