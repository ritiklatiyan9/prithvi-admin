import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsService } from "@/services/settings.service";
import { gameService, TTT_DIFFICULTIES, TTT_SETTING_KEYS } from "@/services/game.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";

const TTT_KEYS: string[] = Object.values(TTT_SETTING_KEYS);

/** Tic-tac-toe game settings — edits game.ttt.* keys via the existing settings PATCH flow. */
export const GameSettings = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.list,
  });
  const config = useQuery({ queryKey: ["game", "ttt-config"], queryFn: gameService.tttConfig });

  const settings = useMemo(
    () => (data ?? []).filter((s) => TTT_KEYS.includes(s.key)),
    [data],
  );

  // Local draft keyed by setting key; seeded from the server, diffed on save.
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
      void queryClient.invalidateQueries({ queryKey: ["game"] });
      toast.success("Game settings saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const set = (key: string, value: string): void => setDraft((d) => ({ ...d, [key]: value }));

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Tic-Tac-Toe</p>
            <p className="text-sm text-muted-foreground">
              Server-side AI — every match is validated and scored on the backend.
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => save.mutate()} disabled={dirtyCount === 0 || save.isPending}>
              {save.isPending ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change(s)` : "Saved"}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={setting.key} className="font-medium">
                    {setting.label}
                  </Label>
                  {setting.isDefault && <Badge variant="outline">default</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{setting.description}</p>
                {setting.key === TTT_SETTING_KEYS.difficulty &&
                  draft[setting.key] === "IMPOSSIBLE" && (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                      Nearly impossible to beat — users will almost never earn win coins.
                    </p>
                  )}
              </div>
              <div className="shrink-0">
                {setting.key === TTT_SETTING_KEYS.difficulty ? (
                  <Select
                    value={draft[setting.key] ?? setting.value}
                    onValueChange={(value) => set(setting.key, value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger id={setting.key} className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTT_DIFFICULTIES.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : setting.type === "BOOLEAN" ? (
                  <Switch
                    id={setting.key}
                    checked={draft[setting.key] === "true"}
                    disabled={!canEdit}
                    onCheckedChange={(checked) => set(setting.key, checked ? "true" : "false")}
                  />
                ) : (
                  <Input
                    id={setting.key}
                    type="number"
                    className="w-40"
                    value={draft[setting.key] ?? ""}
                    disabled={!canEdit}
                    onChange={(event) => set(setting.key, event.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
          {settings.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Game settings are not registered on the backend yet.
            </p>
          )}
        </div>

        {config.data && (
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            Live config: {config.data.enabled ? "enabled" : "disabled"} · {config.data.difficulty}{" "}
            · {config.data.winCoins} coins per win · {config.data.hintWinCoins} coins per hinted
            win · {config.data.dailyLimit} matches/day
          </p>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-semibold">How the 3-piece rule works</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Standard 3×3 board. The user plays X and always moves first; the AI plays O. Each side
            may have at most <span className="font-medium text-foreground">3 marks</span> on the
            board — placing a 4th mark removes that player's oldest mark in the same move.
          </p>
          <p>
            A win is 3 in a row of your marks after your placement (checked after any removal).
            Because marks recycle, games can't gridlock; matches are capped at 60 moves and hitting
            the cap counts as a draw. Winning credits the user the configured coins to their
            wallet, once per match.
          </p>
        </div>
      </Card>
    </div>
  );
};
