import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  settingsService,
  type RewardSetting,
} from "@/services/settings.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";

// Grouped presentation of the game.roulette.* keys (keys resolved from the
// settings list; anything registered but not listed here still shows under "More").
const GROUPS: { title: string; description: string; keys: string[] }[] = [
  {
    title: "General",
    description: "Master switches, titles, bet limits and timing.",
    keys: [
      "game.roulette.title",
      "game.roulette.subtitle",
      "game.roulette.instructions",
      "game.roulette.enabled",
      "game.roulette.maintenanceMode",
      "game.roulette.minBet",
      "game.roulette.maxBet",
      "game.roulette.defaultBet",
      "game.roulette.betStep",
      "game.roulette.animationDurationMs",
      "game.roulette.resultModalMs",
      "game.roulette.cooldownSeconds",
      "game.roulette.maxGamesPerDay",
      "game.roulette.maxPaidGamesPerDay",
      "game.roulette.resetTimezone",
      "game.roulette.soundEnabled",
      "game.roulette.hapticsEnabled",
    ],
  },
  {
    title: "Free games",
    description: "Daily free spins that never touch the wallet.",
    keys: [
      "game.roulette.freeGamesEnabled",
      "game.roulette.dailyFreeGames",
      "game.roulette.freeGameStake",
    ],
  },
  {
    title: "Payouts",
    description: 'Profit "X to 1" multipliers and payout caps.',
    keys: [
      "game.roulette.payout.number",
      "game.roulette.payout.odd",
      "game.roulette.payout.even",
      "game.roulette.payout.red",
      "game.roulette.payout.black",
      "game.roulette.maxPayoutPerGame",
      "game.roulette.maxPayoutPerUserPerDay",
    ],
  },
  {
    title: "Bet types",
    description: "Enable or disable each betting option.",
    keys: [
      "game.roulette.bet.numberEnabled",
      "game.roulette.bet.oddEnabled",
      "game.roulette.bet.evenEnabled",
      "game.roulette.bet.redEnabled",
      "game.roulette.bet.blackEnabled",
    ],
  },
];

const LEGACY_PROBABILITY_KEY = "game.roulette.probabilityMode";

/** Roulette config — edits game.roulette.* keys through the shared settings PATCH flow. */
export const RouletteConfig = ({
  onOpenProbability,
}: {
  onOpenProbability: () => void;
}): JSX.Element => {
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.list,
  });

  const rouletteSettings = useMemo(
    () =>
      (data ?? []).filter(
        (setting) =>
          setting.key.startsWith("game.roulette.") &&
          setting.key !== LEGACY_PROBABILITY_KEY,
      ),
    [data],
  );
  const byKey = useMemo(
    () => Object.fromEntries(rouletteSettings.map((s) => [s.key, s])),
    [rouletteSettings],
  );

  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((s) => [s.key, s.value])));
  }, [data]);

  const dirty = useMemo(
    () =>
      Object.fromEntries(
        rouletteSettings
          .filter((s) => draft[s.key] !== s.value)
          .map((s) => [s.key, draft[s.key]]),
      ),
    [rouletteSettings, draft],
  );
  const dirtyCount = Object.keys(dirty).length;

  const save = useMutation({
    mutationFn: () => settingsService.update(dirty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Roulette settings saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const set = (key: string, value: string): void =>
    setDraft((d) => ({ ...d, [key]: value }));

  if (isLoading) return <TableSkeleton />;
  if (rouletteSettings.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-sm text-muted-foreground">
          Roulette settings are not registered on the backend yet.
        </p>
      </Card>
    );
  }

  const renderControl = (setting: RewardSetting): JSX.Element => {
    if (setting.type === "BOOLEAN") {
      return (
        <Switch
          checked={draft[setting.key] === "true"}
          disabled={!canEdit}
          onCheckedChange={(checked) =>
            set(setting.key, checked ? "true" : "false")
          }
        />
      );
    }
    if (setting.key === "game.roulette.instructions") {
      return (
        <Textarea
          className="w-72"
          rows={3}
          value={draft[setting.key] ?? ""}
          disabled={!canEdit}
          onChange={(event) => set(setting.key, event.target.value)}
        />
      );
    }
    if (setting.type === "STRING") {
      return (
        <Input
          className="w-72"
          value={draft[setting.key] ?? ""}
          disabled={!canEdit}
          onChange={(event) => set(setting.key, event.target.value)}
        />
      );
    }
    return (
      <Input
        type="number"
        className="w-40"
        value={draft[setting.key] ?? ""}
        disabled={!canEdit}
        onChange={(event) => set(setting.key, event.target.value)}
      />
    );
  };

  const row = (setting: RewardSetting): JSX.Element => (
    <div
      key={setting.key}
      className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Label className="font-medium">{setting.label}</Label>
          {setting.isDefault && <Badge variant="outline">default</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {setting.description}
        </p>
      </div>
      <div className="shrink-0">{renderControl(setting)}</div>
    </div>
  );

  const listedKeys = new Set(GROUPS.flatMap((g) => g.keys));
  const extras = rouletteSettings.filter((s) => !listedKeys.has(s.key));

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border bg-background/80 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {dirtyCount > 0
            ? `${dirtyCount} unsaved change(s)`
            : "All changes saved"}
        </p>
        {canEdit ? (
          <Button
            onClick={() => save.mutate()}
            disabled={dirtyCount === 0 || save.isPending}
          >
            {save.isPending
              ? "Saving…"
              : dirtyCount > 0
                ? `Save ${dirtyCount} change(s)`
                : "Saved"}
          </Button>
        ) : (
          <Badge variant="outline">
            Read-only (super-admin required to edit)
          </Badge>
        )}
      </div>

      {GROUPS.map((group) => {
        const rows = group.keys.map((k) => byKey[k]).filter(Boolean);
        if (rows.length === 0) return null;
        return (
          <Card key={group.title} className="p-5">
            <p className="text-sm font-semibold">{group.title}</p>
            <p className="mb-4 text-sm text-muted-foreground">
              {group.description}
            </p>
            <div className="space-y-4">{rows.map(row)}</div>
          </Card>
        );
      })}

      <Card className="p-5">
        <p className="text-sm font-semibold">
          Probability policy is schedule-controlled
        </p>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Define immutable profiles and schedule finite From/To windows under
          Probability / RTP. Outside a scheduled window the server uses FAIR
          probability. The legacy probability-mode setting is intentionally not
          editable here.
        </p>
        <Button type="button" variant="outline" onClick={onOpenProbability}>
          Open Probability / RTP
        </Button>
      </Card>

      {extras.length > 0 && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold">More</p>
          <div className="space-y-4">{extras.map(row)}</div>
        </Card>
      )}
    </div>
  );
};
