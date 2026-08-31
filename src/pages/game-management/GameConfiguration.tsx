import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/services/api-client";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { useAuthStore } from "@/store/auth.store";
import type { GameConfigValues } from "@/types/ludo-admin";
import { formatDateTime } from "@/utils/format";
import { SectionError } from "./shared";
import { userLabel } from "./utils";

interface ConfigGroup {
  title: string;
  description: string;
  match: (key: string) => boolean;
}

const GROUPS: ConfigGroup[] = [
  {
    title: "Match rules",
    description: "Server-authoritative modes, turn timing, and dice rules.",
    match: (key) =>
      /turn|enabled.?modes|twoPlayerEnabled|threePlayerEnabled|fourPlayerEnabled|three.?six|dice|match/i.test(
        key,
      ),
  },
  {
    title: "Connection and release safety",
    description:
      "Reconnect windows, maintenance state, and minimum client version.",
    match: (key) => /reconnect|maintenance|version|grace/i.test(key),
  },
  {
    title: "Communication",
    description: "Quick messages, free reactions, and abuse-prevention limits.",
    match: (key) => /chat|message|reaction|voice|rate/i.test(key),
  },
];

const DESCRIPTIONS: Record<string, string> = {
  turnDurationSeconds:
    "Seconds a player has to complete a server-authorized turn.",
  reconnectionGracePeriodSeconds:
    "How long a disconnected player may resume the same room.",
  reconnectionGraceSeconds:
    "How long a disconnected player may resume the same room.",
  enabledModes: "Game modes exposed to matchmaking clients.",
  threeSixRuleEnabled: "Apply the configured consecutive-six safety rule.",
  threeSixesRule: "Apply the configured consecutive-six safety rule.",
  quickMessages: "Backend-approved messages available to eligible players.",
  freeReactionCount: "Number of non-text reactions available to free players.",
  maintenanceMode: "Stop new matchmaking while preserving safe room recovery.",
  minimumSupportedAppVersion:
    "Clients older than this version must upgrade before playing.",
  chatRateLimitPerMinute: "Maximum accepted text messages per user per minute.",
  chatRateLimitPer10Seconds:
    "Maximum accepted text messages per user in ten seconds.",
};

const titleFor = (key: string): string =>
  key
    .replace(/^game[._-]?ludo[._-]?/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w|\s\w/g, (letter) => letter.toUpperCase());

const normalizeValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const stringArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const isBoolean = (value: string): boolean =>
  value === "true" || value === "false";
const isNumber = (value: string): boolean =>
  value.trim() !== "" && Number.isFinite(Number(value));

export const GameConfiguration = (): JSX.Element => {
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");
  const queryClient = useQueryClient();
  const config = useQuery({
    queryKey: ["game-admin", "config"],
    queryFn: ({ signal }) => ludoAdminService.configuration(signal),
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const persisted = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(config.data?.values ?? {}).map(([key, value]) => [
          key,
          normalizeValue(value),
        ]),
      ),
    [config.data],
  );

  useEffect(() => setDraft(persisted), [persisted]);

  const dirty = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(draft).filter(
          ([key, value]) => persisted[key] !== value,
        ),
      ),
    [draft, persisted],
  );
  const dirtyCount = Object.keys(dirty).length;
  const invalidNumericKeys = Object.entries(draft)
    .filter(
      ([key, value]) =>
        isNumber(persisted[key] ?? "") &&
        (!isNumber(value) || Number(value) < 0),
    )
    .map(([key]) => key);

  const save = useMutation({
    mutationFn: () =>
      ludoAdminService.updateConfiguration(dirty as GameConfigValues),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["game-admin", "config"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["game-admin", "overview"],
      });
      void queryClient.invalidateQueries({ queryKey: ["game-admin", "audit"] });
      toast.success("Game configuration saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const keys = Object.keys(persisted);
  const used = new Set<string>();
  const sections = GROUPS.map((group) => {
    const groupKeys = keys.filter((key) => !used.has(key) && group.match(key));
    groupKeys.forEach((key) => used.add(key));
    return { ...group, keys: groupKeys };
  });
  const extraKeys = keys.filter((key) => !used.has(key));

  const setValue = (key: string, value: string): void =>
    setDraft((current) => ({ ...current, [key]: value }));

  const renderControl = (key: string): JSX.Element => {
    const value = draft[key] ?? "";
    if (isBoolean(persisted[key] ?? "")) {
      return (
        <Switch
          checked={value === "true"}
          disabled={!canWrite}
          onCheckedChange={(checked) =>
            setValue(key, checked ? "true" : "false")
          }
        />
      );
    }

    if (/enabledModes$/i.test(key)) {
      const selected = new Set(stringArray(value));
      return (
        <div className="flex flex-wrap gap-3">
          {[
            ["TWO_PLAYER", "2-player"],
            ["THREE_PLAYER", "3-player"],
            ["FOUR_PLAYER", "4-player"],
          ].map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(mode)}
                disabled={!canWrite}
                className="h-4 w-4 accent-primary"
                onChange={(event) => {
                  if (event.target.checked) selected.add(mode);
                  else selected.delete(mode);
                  setValue(key, JSON.stringify(Array.from(selected)));
                }}
              />
              {label}
            </label>
          ))}
        </div>
      );
    }

    if (/quickMessages$/i.test(key)) {
      const messages = stringArray(value);
      return (
        <Textarea
          className="w-full sm:w-80"
          rows={5}
          value={messages.join("\n")}
          disabled={!canWrite}
          onChange={(event) =>
            setValue(
              key,
              JSON.stringify(
                event.target.value
                  .split("\n")
                  .map((message) => message.trim())
                  .filter(Boolean),
              ),
            )
          }
        />
      );
    }

    return (
      <Input
        type={isNumber(persisted[key] ?? "") ? "number" : "text"}
        min={isNumber(persisted[key] ?? "") ? 0 : undefined}
        className="w-full sm:w-64"
        value={value}
        disabled={!canWrite}
        onChange={(event) => setValue(key, event.target.value)}
      />
    );
  };

  const renderGroup = (
    title: string,
    description: string,
    groupKeys: string[],
  ): JSX.Element | null => {
    if (groupKeys.length === 0) return null;
    return (
      <Card key={title} className="p-5">
        <h3 className="font-semibold">{title}</h3>
        <p className="mb-5 text-sm text-muted-foreground">{description}</p>
        <div className="space-y-5">
          {groupKeys.map((key) => (
            <div
              key={key}
              className="flex flex-col justify-between gap-3 border-b pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <Label className="font-medium">{titleFor(key)}</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {DESCRIPTIONS[key] ??
                    DESCRIPTIONS[key.split(/[._-]/).slice(-1)[0] ?? ""] ??
                    `Server setting: ${key}`}
                </p>
                {invalidNumericKeys.includes(key) && (
                  <p className="mt-1 text-xs text-red-500">
                    Enter zero or a positive number.
                  </p>
                )}
              </div>
              <div className="shrink-0">{renderControl(key)}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  if (config.isLoading) return <TableSkeleton rows={8} />;
  if (config.isError && !config.data) {
    return (
      <Card>
        <SectionError
          retry={() => void config.refetch()}
          title="Could not load configuration"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/90 p-4 shadow-sm backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Game configuration</h2>
            {!canWrite && <Badge variant="outline">Read-only</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {dirtyCount > 0
              ? `${dirtyCount} unsaved change(s)`
              : "Server values are current"}
            {config.data?.updatedAt
              ? ` · Last updated ${formatDateTime(config.data.updatedAt)}`
              : ""}
            {config.data?.updatedBy
              ? ` by ${userLabel(config.data.updatedBy)}`
              : ""}
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={dirtyCount === 0 || save.isPending}
              onClick={() => setDraft(persisted)}
            >
              Discard
            </Button>
            <Button
              disabled={
                dirtyCount === 0 ||
                invalidNumericKeys.length > 0 ||
                save.isPending
              }
              onClick={() => save.mutate()}
            >
              {save.isPending
                ? "Saving…"
                : dirtyCount > 0
                  ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`
                  : "Saved"}
            </Button>
          </div>
        )}
      </div>

      {keys.length === 0 ? (
        <Card>
          <EmptyState
            title="No game configuration registered"
            description="The backend must expose validated Ludo settings before they can be managed here."
          />
        </Card>
      ) : (
        <>
          {sections.map((section) =>
            renderGroup(section.title, section.description, section.keys),
          )}
          {renderGroup(
            "Additional server settings",
            "Validated Ludo values registered by the backend.",
            extraKeys,
          )}
        </>
      )}
    </div>
  );
};
