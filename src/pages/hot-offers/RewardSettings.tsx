import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  settingsService,
  type RewardSetting,
} from "@/services/settings.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";

const LEGACY_ROULETTE_PROBABILITY_KEY = "game.roulette.probabilityMode";

/** Reward-system configuration, grouped by category. SUPER_ADMIN edits. */
export const RewardSettings = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.list,
  });

  // Local draft keyed by setting key; seeded from the server, diffed on save.
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((s) => [s.key, s.value])));
  }, [data]);

  const editableSettings = useMemo(
    () =>
      (data ?? []).filter(
        (setting) => setting.key !== LEGACY_ROULETTE_PROBABILITY_KEY,
      ),
    [data],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, RewardSetting[]>();
    for (const setting of editableSettings) {
      const list = map.get(setting.category) ?? [];
      list.push(setting);
      map.set(setting.category, list);
    }
    return [...map.entries()];
  }, [editableSettings]);

  const dirty = useMemo(() => {
    return Object.fromEntries(
      editableSettings
        .filter((setting) => draft[setting.key] !== setting.value)
        .map((setting) => [setting.key, draft[setting.key]]),
    );
  }, [editableSettings, draft]);
  const dirtyCount = Object.keys(dirty).length;

  const save = useMutation({
    mutationFn: () => settingsService.update(dirty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Settings"
        description="Configure withdrawals, fraud thresholds and submission rules."
        actions={
          canEdit ? (
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
          ) : undefined
        }
      />

      {grouped.map(([category, settings]) => (
        <Card key={category} className="p-5">
          <p className="mb-4 text-sm font-semibold">{category}</p>
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
                    {setting.isDefault && (
                      <Badge variant="outline">default</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
                <div className="shrink-0">
                  {setting.type === "BOOLEAN" ? (
                    <Switch
                      id={setting.key}
                      checked={draft[setting.key] === "true"}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        setDraft((d) => ({
                          ...d,
                          [setting.key]: checked ? "true" : "false",
                        }))
                      }
                    />
                  ) : (
                    <Input
                      id={setting.key}
                      type={setting.type === "NUMBER" ? "number" : "text"}
                      className="w-40"
                      value={draft[setting.key] ?? ""}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDraft((d) => ({
                          ...d,
                          [setting.key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};
