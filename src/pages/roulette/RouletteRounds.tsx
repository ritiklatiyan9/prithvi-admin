import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiltersBar } from "@/components/shared/FiltersBar";
import {
  ExportButton,
  type ExportColumn,
} from "@/components/shared/ExportButton";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Coins } from "@/components/shared/Coins";
import {
  rouletteService,
  type RoundFilters,
  type RouletteRound,
} from "@/services/roulette.service";
import { formatDateTime } from "@/utils/format";

const PAGE_SIZE = 20;

const dayStart = (d: string): string | undefined =>
  d ? `${d}T00:00:00.000Z` : undefined;
const dayEnd = (d: string): string | undefined =>
  d ? `${d}T23:59:59.999Z` : undefined;

const colourBadge = (c: string): "destructive" | "secondary" | "success" =>
  c === "RED" ? "destructive" : c === "GREEN" ? "success" : "secondary";

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "id", label: "Round ID" },
  { key: "userId", label: "User ID" },
  { key: "betType", label: "Bet" },
  { key: "selectedNumber", label: "Picked #" },
  { key: "betAmount", label: "Stake" },
  { key: "usedFreeGame", label: "Free", format: (v) => (v ? "yes" : "no") },
  { key: "winningNumber", label: "Result #" },
  { key: "winningColour", label: "Colour" },
  { key: "won", label: "Won", format: (v) => (v ? "yes" : "no") },
  { key: "payoutAmount", label: "Payout" },
  { key: "netResult", label: "Net" },
  {
    key: "createdAt",
    label: "Played",
    format: (v) => formatDateTime(v as string),
  },
];

export const RouletteRounds = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [betType, setBetType] = useState("all");
  const [result, setResult] = useState("all");
  const [game, setGame] = useState("all");
  const [num, setNum] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [detail, setDetail] = useState<RouletteRound | null>(null);

  const filters: RoundFilters = {
    page,
    limit: PAGE_SIZE,
    userId: userId.trim() || undefined,
    betType:
      betType === "all" ? undefined : (betType as RoundFilters["betType"]),
    won: result === "all" ? undefined : result === "won",
    usedFreeGame: game === "all" ? undefined : game === "free",
    winningNumber: num.trim() === "" ? undefined : Number(num),
    from: dayStart(range.from),
    to: dayEnd(range.to),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["roulette", "rounds", filters],
    queryFn: ({ signal }) => rouletteService.listRounds(filters, signal),
  });

  const clearAll = (): void => {
    setUserId("");
    setBetType("all");
    setResult("all");
    setGame("all");
    setNum("");
    setRange({ from: "", to: "" });
    setPage(1);
  };

  return (
    <div>
      <FiltersBar
        search={{
          value: userId,
          onChange: (v) => {
            setUserId(v);
            setPage(1);
          },
          placeholder: "User ID",
        }}
        selects={[
          {
            key: "betType",
            value: betType,
            onChange: (v) => {
              setBetType(v);
              setPage(1);
            },
            options: [
              { value: "all", label: "All bets" },
              { value: "NUMBER", label: "Number" },
              { value: "ODD", label: "Odd" },
              { value: "EVEN", label: "Even" },
              { value: "RED", label: "Red" },
              { value: "BLACK", label: "Black" },
            ],
          },
          {
            key: "result",
            value: result,
            onChange: (v) => {
              setResult(v);
              setPage(1);
            },
            options: [
              { value: "all", label: "Win/loss" },
              { value: "won", label: "Wins" },
              { value: "lost", label: "Losses" },
            ],
          },
          {
            key: "game",
            value: game,
            onChange: (v) => {
              setGame(v);
              setPage(1);
            },
            options: [
              { value: "all", label: "Free/paid" },
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ],
          },
        ]}
        dateRange={{
          value: range,
          onChange: (v) => {
            setRange(v);
            setPage(1);
          },
        }}
        onClearAll={clearAll}
      >
        <Input
          type="number"
          min={0}
          max={36}
          value={num}
          placeholder="Result #"
          onChange={(e) => {
            setNum(e.target.value);
            setPage(1);
          }}
          className="w-28"
        />
        <ExportButton
          rows={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          columns={EXPORT_COLUMNS}
          fileName="roulette-rounds"
          title="Roulette rounds"
        />
      </FiltersBar>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No rounds"
            description="No rounds match these filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Played</TableHead>
                  <TableHead>Bet</TableHead>
                  <TableHead className="text-right">Stake</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="hidden md:table-cell">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setDetail(r)}
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.betType === "NUMBER"
                        ? `# ${r.selectedNumber}`
                        : r.betType}
                      {r.usedFreeGame && (
                        <Badge variant="outline" className="ml-1">
                          free
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Coins value={r.betAmount} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={colourBadge(r.winningColour)}>
                        {r.winningNumber} · {r.winningColour}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.won ? "success" : "secondary"}>
                        {r.won ? "WON" : "LOST"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.won ? <Coins value={r.payoutAmount} /> : "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-40 truncate font-mono text-xs md:table-cell">
                      {r.userId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>

      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Round detail</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-1 text-sm">
              {(
                [
                  ["Round ID", detail.id],
                  ["User", detail.userId],
                  [
                    "Bet",
                    detail.betType === "NUMBER"
                      ? `Number ${detail.selectedNumber}`
                      : detail.betType,
                  ],
                  [
                    "Stake",
                    `${detail.betAmount} coins${detail.usedFreeGame ? " (free)" : ""}`,
                  ],
                  [
                    "Result",
                    `${detail.winningNumber} · ${detail.winningColour} · ${detail.parity}`,
                  ],
                  [
                    "Outcome",
                    detail.won ? `WON — payout ${detail.payoutAmount}` : "LOST",
                  ],
                  ["Net", `${detail.netResult}`],
                  ["Resolved mode", detail.probabilityMode],
                  [
                    "Policy source",
                    detail.probabilityScheduleId
                      ? `Schedule ${detail.probabilityScheduleId}`
                      : "FAIR fallback",
                  ],
                  [
                    "Policy resolved",
                    new Date(detail.policyResolvedAt).toLocaleString(),
                  ],
                  ["Server seed hash", detail.serverSeedHash],
                  ["Server seed", detail.serverSeed ?? "(fetch detail)"],
                  ["Client seed", detail.clientSeed],
                  ["Nonce", String(detail.nonce)],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b py-1 last:border-0"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {label}
                  </span>
                  <span className="break-all text-right font-mono text-xs">
                    {value}
                  </span>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Provably fair: HMAC-SHA256(serverSeed, clientSeed:nonce)
                reproduces the winning number. The player can verify via GET
                /game/roulette/verify-round/:id.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
