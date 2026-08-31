import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { settingsService } from "@/services/settings.service";
import { redemptionsService } from "@/services/redemptions.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";

const XOXODAY_PREFIX = "xoxoday.";
const ENABLED_KEY = "xoxoday.enabled";

/**
 * Reward provider (Xoxoday Plum) settings — edits xoxoday.* keys via the same
 * settings PATCH flow as the other tabs, plus a live status card and a
 * "Test connection" action backed by /redemptions/admin/provider/*.
 */
export const RewardProvidersSettings = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: settingsService.list });
  const settings = useMemo(
    () => (data ?? []).filter((s) => s.key.startsWith(XOXODAY_PREFIX)),
    [data],
  );

  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) {
      setDraft(
        Object.fromEntries(
          data.filter((s) => s.key.startsWith(XOXODAY_PREFIX)).map((s) => [s.key, s.value]),
        ),
      );
    }
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
      void queryClient.invalidateQueries({ queryKey: ["provider-status"] });
      toast.success("Reward provider settings saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const { data: status } = useQuery({
    queryKey: ["provider-status"],
    queryFn: redemptionsService.providerStatus,
  });

  const test = useMutation({
    mutationFn: redemptionsService.testProvider,
    onSuccess: (result) => (result.ok ? toast.success(result.message) : toast.error(result.message)),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const set = (key: string, value: string): void => setDraft((d) => ({ ...d, [key]: value }));

  if (isLoading) return <TableSkeleton />;

  if (settings.length === 0) {
    return (
      <Card className="p-5">
        <p className="py-6 text-center text-sm text-muted-foreground">
          Reward provider settings are not registered on the backend yet.
        </p>
      </Card>
    );
  }

  const enabled = draft[ENABLED_KEY] === "true";
  const enabledDef = settings.find((s) => s.key === ENABLED_KEY);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Xoxoday connection
            <Badge variant={status?.configured ? "success" : "secondary"}>
              {status?.configured ? "Live — auto-issue on" : "Manual fulfilment"}
            </Badge>
          </CardTitle>
          <CardDescription>
            When live, approving a Xoxoday redemption issues the voucher automatically. Otherwise
            approved requests wait for a super admin to fulfil them by hand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Enabled</span>
            <span>{status?.enabled ? "Yes" : "No"}</span>
            <span className="text-muted-foreground">Refresh credentials</span>
            <span>{status?.hasRefreshCredentials ? "Configured" : "Not set"}</span>
            <span className="text-muted-foreground">Base URL</span>
            <span className="truncate">{status?.baseUrl || "—"}</span>
            <span className="text-muted-foreground">Auto-issue providers</span>
            <span>{status?.activeProviders?.length ? status.activeProviders.join(", ") : "none"}</span>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => test.mutate()}
              disabled={test.isPending}
            >
              {test.isPending ? "Testing…" : "Test connection"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Xoxoday credentials</CardTitle>
            <CardDescription>
              OAuth details from your Xoxoday Plum dashboard. These override the server environment;
              leave a field blank to fall back to it.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={() => save.mutate()} disabled={dirtyCount === 0 || save.isPending}>
              {save.isPending
                ? "Saving…"
                : dirtyCount > 0
                  ? `Save ${dirtyCount} change(s)`
                  : "Saved"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{enabledDef?.label ?? "Xoxoday enabled"}</p>
              <p className="text-sm text-muted-foreground">
                {enabledDef?.description ?? "Master switch for auto-issuing vouchers."}
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={!canEdit}
              onCheckedChange={(checked) => set(ENABLED_KEY, checked ? "true" : "false")}
            />
          </div>

          {settings
            .filter((s) => s.key !== ENABLED_KEY)
            .map((s) => (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor={s.key}>{s.label}</Label>
                  {s.secret ? (
                    s.hasValue && <Badge variant="success">configured</Badge>
                  ) : (
                    !s.isDefault && <Badge variant="outline">set</Badge>
                  )}
                </div>
                <Input
                  id={s.key}
                  type={s.secret ? "password" : s.type === "NUMBER" ? "number" : "text"}
                  autoComplete={s.secret ? "new-password" : "off"}
                  value={draft[s.key] ?? ""}
                  disabled={!canEdit}
                  onChange={(event) => set(s.key, event.target.value)}
                  placeholder={s.secret && s.hasValue ? "•••••••• saved — leave blank to keep" : ""}
                />
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
};
