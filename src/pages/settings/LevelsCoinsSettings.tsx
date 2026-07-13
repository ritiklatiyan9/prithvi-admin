import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { settingsService } from "@/services/settings.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatNumber } from "@/utils/format";

/** Settings-registry keys for coin-based levels (edited via the settings PATCH flow). */
export const LEVEL_SETTING_KEYS = {
  curve: "levels.curve",
  ranks: "levels.ranks",
} as const;

const LEVEL_KEYS: string[] = Object.values(LEVEL_SETTING_KEYS);

export type LevelCurve =
  | { type: "quadratic"; base: number }
  | { type: "table"; thresholds: number[] };

const DEFAULT_CURVE: LevelCurve = { type: "quadratic", base: 100 };

const parseCurve = (raw: string | undefined): LevelCurve => {
  try {
    const parsed: unknown = JSON.parse(raw ?? "");
    if (typeof parsed === "object" && parsed !== null) {
      const p = parsed as { type?: string; base?: unknown; thresholds?: unknown };
      if (p.type === "table" && Array.isArray(p.thresholds)) {
        return { type: "table", thresholds: p.thresholds.map(Number) };
      }
      if (p.type === "quadratic") return { type: "quadratic", base: Number(p.base) || 0 };
    }
  } catch {
    // fall through to default — backend does the same
  }
  return DEFAULT_CURVE;
};

const parseRanks = (raw: string | undefined): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw ?? "");
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through
  }
  return [];
};

const curveError = (curve: LevelCurve): string | null => {
  if (curve.type === "quadratic") {
    return curve.base > 0 ? null : "Base coins must be greater than 0.";
  }
  if (curve.thresholds.length === 0) return "Add at least one level threshold.";
  const increasing = curve.thresholds.every(
    (t, i) => Number.isFinite(t) && t > 0 && (i === 0 || t > curve.thresholds[i - 1]),
  );
  return increasing ? null : "Thresholds must be positive and strictly increasing.";
};

/** Levels & Coins settings — edits levels.* keys via the existing settings PATCH flow. */
export const LevelsCoinsSettings = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.list,
  });

  const settings = useMemo(() => (data ?? []).filter((s) => LEVEL_KEYS.includes(s.key)), [data]);
  const byKey = useMemo(() => Object.fromEntries(settings.map((s) => [s.key, s])), [settings]);

  // Local draft keyed by setting key; seeded from the server, diffed on save.
  // Curve and ranks are kept as JSON strings and edited through parsed views.
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((s) => [s.key, s.value])));
  }, [data]);

  const dirty = useMemo(
    () =>
      Object.fromEntries(
        settings.filter((s) => draft[s.key] !== s.value).map((s) => [s.key, draft[s.key]]),
      ),
    [settings, draft],
  );
  const dirtyCount = Object.keys(dirty).length;

  const save = useMutation({
    mutationFn: () => settingsService.update(dirty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Levels & Coins settings saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const set = (key: string, value: string): void => setDraft((d) => ({ ...d, [key]: value }));

  const curve = parseCurve(draft[LEVEL_SETTING_KEYS.curve]);
  const setCurve = (next: LevelCurve): void =>
    set(LEVEL_SETTING_KEYS.curve, JSON.stringify(next));

  const ranks = parseRanks(draft[LEVEL_SETTING_KEYS.ranks]);
  const setRanks = (next: string[]): void => set(LEVEL_SETTING_KEYS.ranks, JSON.stringify(next));

  const curveErr = curveError(curve);
  const ranksErr =
    ranks.length === 0
      ? "Add at least one rank."
      : ranks.some((r) => r.trim() === "")
        ? "Rank names cannot be empty."
        : null;
  const invalid = curveErr !== null || ranksErr !== null;

  if (isLoading) return <TableSkeleton />;

  if (settings.length === 0) {
    return (
      <Card className="p-5">
        <p className="py-6 text-center text-sm text-muted-foreground">
          Level settings are not registered on the backend yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Levels are computed from lifetime coins earned (every wallet credit).
        </p>
        {canEdit && (
          <Button
            onClick={() => save.mutate()}
            disabled={dirtyCount === 0 || invalid || save.isPending}
          >
            {save.isPending ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change(s)` : "Saved"}
          </Button>
        )}
      </div>

      {byKey[LEVEL_SETTING_KEYS.curve] && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Level curve</p>
                {byKey[LEVEL_SETTING_KEYS.curve].isDefault && (
                  <Badge variant="outline">default</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                How many lifetime coins each level requires.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={curve.type === "quadratic" ? "default" : "outline"}
                disabled={!canEdit}
                onClick={() => curve.type !== "quadratic" && setCurve(DEFAULT_CURVE)}
              >
                Quadratic
              </Button>
              <Button
                size="sm"
                variant={curve.type === "table" ? "default" : "outline"}
                disabled={!canEdit}
                onClick={() => {
                  if (curve.type === "table") return;
                  const base = curve.base > 0 ? curve.base : 100;
                  // Seed the table from the quadratic curve: coins to reach level n+2 = base*(n+1)^2.
                  setCurve({
                    type: "table",
                    thresholds: Array.from({ length: 5 }, (_, i) => base * (i + 1) * (i + 1)),
                  });
                }}
              >
                Table
              </Button>
            </div>
          </div>

          {curve.type === "quadratic" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label htmlFor="curve-base" className="font-medium">
                    Base coins
                  </Label>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Reaching level n takes base × (n−1)² total coins.
                  </p>
                </div>
                <Input
                  id="curve-base"
                  type="number"
                  className="w-40 shrink-0"
                  value={curve.base || ""}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setCurve({ type: "quadratic", base: Number(event.target.value) })
                  }
                />
              </div>
              {curveErr === null && (
                <p className="text-xs text-muted-foreground">
                  Level 2 at {formatNumber(curve.base)} coins · Level 5 at{" "}
                  {formatNumber(curve.base * 16)} coins · Level 10 at{" "}
                  {formatNumber(curve.base * 81)} coins
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {curve.thresholds.map((threshold, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm text-muted-foreground">
                    Level {index + 2}
                  </span>
                  <Input
                    type="number"
                    className="w-40"
                    value={Number.isFinite(threshold) && threshold !== 0 ? threshold : ""}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...curve.thresholds];
                      next[index] = Number(event.target.value);
                      setCurve({ type: "table", thresholds: next });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">total coins</span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurve({
                          type: "table",
                          thresholds: curve.thresholds.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const t = curve.thresholds;
                    const last = t[t.length - 1] ?? 0;
                    const prev = t[t.length - 2] ?? 0;
                    // Extend by the last gap so the curve keeps its shape.
                    setCurve({
                      type: "table",
                      thresholds: [...t, last + Math.max(last - prev, 100)],
                    });
                  }}
                >
                  <PlusIcon className="mr-1.5 h-4 w-4" /> Add level
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Users past the last threshold are max level.
              </p>
            </div>
          )}
          {curveErr && (
            <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
              {curveErr}
            </p>
          )}
        </Card>
      )}

      {byKey[LEVEL_SETTING_KEYS.ranks] && (
        <Card className="p-5">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Ranks</p>
              {byKey[LEVEL_SETTING_KEYS.ranks].isDefault && <Badge variant="outline">default</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              One rank per 5 levels, in order. The last rank covers every level beyond it.
            </p>
          </div>
          <div className="space-y-2">
            {ranks.map((rank, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-muted-foreground">
                  Levels {index * 5 + 1}–{index * 5 + 5}
                </span>
                <Input
                  className="w-64"
                  value={rank}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setRanks(ranks.map((r, i) => (i === index ? event.target.value : r)))
                  }
                />
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRanks(ranks.filter((_, i) => i !== index))}
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setRanks([...ranks, ""])}>
                <PlusIcon className="mr-1.5 h-4 w-4" /> Add rank
              </Button>
            )}
          </div>
          {ranksErr && (
            <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
              {ranksErr}
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
