import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BanknotesIcon,
  ChartBarIcon,
  GiftIcon,
  PlayIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/StatCard";
import { EventsBarChart } from "@/components/shared/EventsBarChart";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { rouletteService } from "@/services/roulette.service";
import { formatDateTime } from "@/utils/format";

const RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
] as const;

const coins = (n: number): string => n.toLocaleString();

export const RouletteAnalytics = (): JSX.Element => {
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  const params = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["roulette", "analytics", params],
    queryFn: () => rouletteService.analytics(params),
  });

  const t = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as "7" | "30" | "90")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.key} value={r.key}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spins" value={coins(t?.games ?? 0)} icon={PlayIcon} loading={isLoading} />
        <StatCard label="Players" value={coins(t?.players ?? 0)} icon={UsersIcon} loading={isLoading} />
        <StatCard
          label="Coins wagered"
          value={coins(t?.coinsWagered ?? 0)}
          icon={BanknotesIcon}
          loading={isLoading}
        />
        <StatCard
          label="Coins paid out"
          value={coins(t?.coinsWon ?? 0)}
          icon={TrophyIcon}
          loading={isLoading}
        />
        <StatCard
          label="Net coin movement"
          value={coins(t?.netCoinMovement ?? 0)}
          hint="payouts − wagers (negative = system retains)"
          icon={ChartBarIcon}
          loading={isLoading}
        />
        <StatCard
          label="Actual RTP"
          value={t ? `${(t.rtp * 100).toFixed(2)}%` : "—"}
          hint="paid out ÷ wagered"
          icon={ChartBarIcon}
          loading={isLoading}
        />
        <StatCard
          label="Win rate"
          value={t ? `${(t.winRate * 100).toFixed(1)}%` : "—"}
          icon={TrophyIcon}
          loading={isLoading}
        />
        <StatCard
          label="Free / paid spins"
          value={`${coins(t?.freeGames ?? 0)} / ${coins(t?.paidGames ?? 0)}`}
          hint={`avg bet ${coins(t?.averageBet ?? 0)}`}
          icon={GiftIcon}
          loading={isLoading}
        />
      </div>

      {isLoading || !data ? (
        <TableSkeleton />
      ) : (
        <>
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold">Winning-number distribution (0–36)</p>
            <EventsBarChart
              data={data.numberDistribution.map((d) => ({ name: String(d.number), count: d.count }))}
              height={280}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold">Daily spins</p>
              <EventsBarChart
                data={data.daily.map((d) => ({ name: d.date.slice(5), count: d.games }))}
                height={240}
              />
            </Card>
            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold">Colour & parity</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Red", data.colourDistribution.red, "destructive"],
                  ["Black", data.colourDistribution.black, "secondary"],
                  ["Green", data.colourDistribution.green, "success"],
                ].map(([label, value, variant]) => (
                  <div key={label as string} className="rounded-lg border p-3">
                    <Badge variant={variant as "destructive" | "secondary" | "success"}>
                      {label as string}
                    </Badge>
                    <p className="mt-2 text-xl font-semibold tabular-nums">{value as number}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Odd", data.parityDistribution.odd],
                  ["Even", data.parityDistribution.even],
                  ["Zero", data.parityDistribution.zero],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{value as number}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold">Highest wins</p>
              {data.topWins.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No wins yet.</p>
              ) : (
                <div className="space-y-1">
                  {data.topWins.map((w) => (
                    <div key={w.roundId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {w.userId}
                      </span>
                      <span className="whitespace-nowrap">
                        <Badge variant="outline" className="mr-2">
                          #{w.winningNumber}
                        </Badge>
                        <span className="font-medium tabular-nums">{coins(w.payoutAmount)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold">Most active players</p>
              {data.mostActive.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-1">
                  {data.mostActive.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {m.userId}
                      </span>
                      <span className="font-medium tabular-nums">{m.games} spins</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold">Recent rounds</p>
            <div className="space-y-1">
              {data.recentRounds.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                  <span>
                    <Badge variant="outline" className="mr-2">
                      #{r.winningNumber} {r.winningColour}
                    </Badge>
                    <Badge variant={r.won ? "success" : "secondary"}>
                      {r.won ? `+${r.payoutAmount}` : "loss"}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
