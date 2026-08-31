import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import {
  rouletteService,
  type ProbabilityMode,
  type ProbabilityScheduleStatus,
  type RouletteProbabilitySchedule,
  type RouletteProfile,
  type RtpEstimate,
} from "@/services/roulette.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";

const pct = (n: number): string => `${(n * 100).toFixed(2)}%`;
const uniformWeights = (): number[] => new Array(37).fill(1);
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const LOCAL_TIME_ZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "browser local time";

type WeightPresetKey = "uniform" | "red" | "black" | "odd" | "even" | "zero";

const WEIGHT_PRESETS: {
  key: WeightPresetKey;
  label: string;
  description: string;
  weights: () => number[];
}[] = [
  {
    key: "uniform",
    label: "Uniform",
    description: "Equal weight for every pocket",
    weights: uniformWeights,
  },
  {
    key: "red",
    label: "Red lean",
    description: "2× global weight on red pockets",
    weights: () => Array.from({ length: 37 }, (_, n) => (RED_NUMBERS.has(n) ? 2 : 1)),
  },
  {
    key: "black",
    label: "Black lean",
    description: "2× global weight on black pockets",
    weights: () =>
      Array.from({ length: 37 }, (_, n) => (n !== 0 && !RED_NUMBERS.has(n) ? 2 : 1)),
  },
  {
    key: "odd",
    label: "Odd lean",
    description: "2× global weight on odd pockets",
    weights: () => Array.from({ length: 37 }, (_, n) => (n > 0 && n % 2 === 1 ? 2 : 1)),
  },
  {
    key: "even",
    label: "Even lean",
    description: "2× global weight on even pockets",
    weights: () => Array.from({ length: 37 }, (_, n) => (n > 0 && n % 2 === 0 ? 2 : 1)),
  },
  {
    key: "zero",
    label: "Zero boost",
    description: "5× global weight on pocket zero",
    weights: () => Array.from({ length: 37 }, (_, n) => (n === 0 ? 5 : 1)),
  },
];

const localDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const formatLocalDateTime = (iso: string | null): string =>
  iso ? localDateTimeFormatter.format(new Date(iso)) : "—";

const toLocalInputValue = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const defaultScheduleWindow = (): { startsAt: string; endsAt: string } => {
  const fifteenMinutes = 15 * 60_000;
  const startMs = Math.ceil((Date.now() + 5 * 60_000) / fifteenMinutes) * fifteenMinutes;
  const start = new Date(startMs);
  return {
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(new Date(startMs + 4 * 60 * 60_000)),
  };
};

const durationLabel = (startsAt: string, endsAt: string): string => {
  const minutes = Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000),
  );
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
  }
  const days = minutes / (24 * 60);
  return `${Number.isInteger(days) ? days : days.toFixed(1)} day`;
};

const statusBadgeVariant = (
  status: ProbabilityScheduleStatus,
): "info" | "success" | "secondary" | "destructive" => {
  if (status === "UPCOMING") return "info";
  if (status === "ACTIVE") return "success";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
};

const statusDotClass = (status: ProbabilityScheduleStatus): string => {
  if (status === "UPCOMING") return "border-primary bg-primary/20";
  if (status === "ACTIVE") return "border-teal-500 bg-teal-500";
  if (status === "CANCELLED") return "border-destructive bg-destructive/20";
  return "border-muted-foreground/40 bg-muted";
};

const RtpPreview = ({
  value,
  compact = false,
}: {
  value: RtpEstimate;
  compact?: boolean;
}): JSX.Element => (
  <div className="rounded-lg border bg-background/40 p-4">
    <div className="flex flex-wrap items-center gap-4">
      <div>
        <p className="text-xs text-muted-foreground">Estimated overall RTP</p>
        <p className={`${compact ? "text-xl" : "text-2xl"} font-semibold tabular-nums`}>
          {pct(value.overall)}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        vs standard fair <span className="font-medium text-foreground">97.30%</span>
        <span className="ml-2">
          ({value.overall >= 0.973 ? "+" : ""}
          {((value.overall - 0.973) * 100).toFixed(2)} pts)
        </span>
      </div>
    </div>
    {!compact && (
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {(["number", "odd", "even", "red", "black"] as const).map((key) => (
          <div key={key} className="flex justify-between rounded border px-2 py-1">
            <span className="capitalize text-muted-foreground">{key}</span>
            <span className="tabular-nums">{pct(value.byCategory[key])}</span>
          </div>
        ))}
        <div className="flex justify-between rounded border px-2 py-1">
          <span className="text-muted-foreground">max single #</span>
          <span className="tabular-nums">{pct(value.byCategory.maxNumberRtp)}</span>
        </div>
      </div>
    )}
    {value.warnings.length > 0 ? (
      <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          Review before scheduling
        </div>
        <ul className="mt-2 space-y-1">
          {value.warnings.map((warning) => (
            <li key={warning} className="text-xs text-destructive">
              • {warning}
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheckIcon className="h-4 w-4 text-teal-500" />
        No RTP risk warning was returned for the current payout configuration.
      </div>
    )}
  </div>
);

export const RouletteProbability = (): JSX.Element => {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");

  const profiles = useQuery({
    queryKey: ["roulette", "profiles"],
    queryFn: rouletteService.listProfiles,
  });
  const schedules = useQuery({
    queryKey: ["roulette", "probability-schedules"],
    queryFn: rouletteService.listProbabilitySchedules,
    refetchInterval: 30_000,
  });
  const currentPolicy = useQuery({
    queryKey: ["roulette", "probability-policy", "current"],
    queryFn: rouletteService.currentProbabilityPolicy,
    refetchInterval: 30_000,
  });

  const [name, setName] = useState("");
  const [mode, setMode] = useState<ProbabilityMode>("WEIGHTED");
  const [weights, setWeights] = useState<number[]>(uniformWeights());
  const [selectedPreset, setSelectedPreset] = useState<WeightPresetKey | null>("uniform");
  const [preview, setPreview] = useState<RtpEstimate | null>(null);

  const [scheduling, setScheduling] = useState<RouletteProfile | null>(null);
  const [scheduleStartsAt, setScheduleStartsAt] = useState("");
  const [scheduleEndsAt, setScheduleEndsAt] = useState("");
  const [scheduleReason, setScheduleReason] = useState("");
  const [scheduleReviewed, setScheduleReviewed] = useState(false);

  const [cancelling, setCancelling] = useState<RouletteProbabilitySchedule | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const invalidatePolicyData = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["roulette", "profiles"] });
    void queryClient.invalidateQueries({ queryKey: ["roulette", "probability-schedules"] });
    void queryClient.invalidateQueries({ queryKey: ["roulette", "probability-policy", "current"] });
  };

  const setWeight = (index: number, value: string): void => {
    const parsed = Math.max(0, Math.min(1_000_000, Math.floor(Number(value) || 0)));
    setWeights((current) =>
      current.map((weight, currentIndex) => (currentIndex === index ? parsed : weight)),
    );
    setSelectedPreset(null);
    setPreview(null);
  };

  const applyPreset = (key: WeightPresetKey): void => {
    const preset = WEIGHT_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setWeights(preset.weights());
    setSelectedPreset(key);
    setPreview(null);
  };

  const estimate = useMutation({
    mutationFn: () =>
      rouletteService.estimateRtp({
        mode,
        numberWeights: mode === "WEIGHTED" ? weights : undefined,
      }),
    onSuccess: setPreview,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const create = useMutation({
    mutationFn: () =>
      rouletteService.createProfile({
        name: name.trim(),
        mode,
        numberWeights: mode === "WEIGHTED" ? weights : undefined,
      }),
    onSuccess: () => {
      invalidatePolicyData();
      toast.success("Immutable probability profile created. Schedule a window when it is ready.");
      setName("");
      setMode("WEIGHTED");
      setWeights(uniformWeights());
      setSelectedPreset("uniform");
      setPreview(null);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const scheduleEstimate = useMutation({
    mutationFn: (profile: RouletteProfile) =>
      rouletteService.estimateRtp({
        mode: profile.mode,
        numberWeights: profile.mode === "WEIGHTED" ? profile.numberWeights : undefined,
      }),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const createSchedule = useMutation({
    mutationFn: () => {
      if (!scheduling) throw new Error("Choose a probability profile");
      return rouletteService.createProbabilitySchedule({
        profileId: scheduling.id,
        startsAt: new Date(scheduleStartsAt).toISOString(),
        endsAt: new Date(scheduleEndsAt).toISOString(),
        reason: scheduleReason.trim(),
      });
    },
    onSuccess: (created) => {
      invalidatePolicyData();
      toast.success(
        created.status === "ACTIVE"
          ? "Probability window scheduled and active."
          : "Probability window scheduled.",
      );
      setScheduling(null);
      setScheduleReason("");
      setScheduleReviewed(false);
      scheduleEstimate.reset();
    },
    onError: (error) => {
      const message = apiErrorMessage(error);
      if (/overlap|conflict|window/i.test(message)) {
        toast.error("Schedule window overlaps an existing policy", {
          description: message,
        });
        return;
      }
      toast.error(message);
    },
  });

  const cancelSchedule = useMutation({
    mutationFn: () => {
      if (!cancelling) throw new Error("Choose a probability schedule");
      return rouletteService.cancelProbabilitySchedule(cancelling.id, cancelReason.trim());
    },
    onSuccess: () => {
      invalidatePolicyData();
      toast.success("Probability schedule cancelled. The reason is retained in the audit trail.");
      setCancelling(null);
      setCancelReason("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const totalWeight = useMemo(() => weights.reduce((total, weight) => total + weight, 0), [weights]);
  const scheduleValidation = useMemo(() => {
    if (!scheduleStartsAt || !scheduleEndsAt) return "Choose both From and To.";
    const start = new Date(scheduleStartsAt).getTime();
    const end = new Date(scheduleEndsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "Enter valid dates and times.";
    if (end <= start) return "To must be later than From.";
    if (end <= Date.now()) return "To must be in the future.";
    return null;
  }, [scheduleStartsAt, scheduleEndsAt]);

  const openScheduleDialog = (profile: RouletteProfile): void => {
    const defaults = defaultScheduleWindow();
    setScheduling(profile);
    setScheduleStartsAt(defaults.startsAt);
    setScheduleEndsAt(defaults.endsAt);
    setScheduleReason("");
    setScheduleReviewed(false);
    scheduleEstimate.reset();
    scheduleEstimate.mutate(profile);
  };

  const closeScheduleDialog = (): void => {
    if (createSchedule.isPending) return;
    setScheduling(null);
    setScheduleReason("");
    setScheduleReviewed(false);
    scheduleEstimate.reset();
  };

  const openCancelDialog = (schedule: RouletteProbabilitySchedule): void => {
    setCancelling(schedule);
    setCancelReason("");
  };

  const policy = currentPolicy.data;
  const schedulePreview = scheduleEstimate.data;
  const canSubmitSchedule =
    canWrite &&
    scheduling !== null &&
    schedulePreview !== undefined &&
    scheduleReviewed &&
    scheduleReason.trim().length > 0 &&
    scheduleValidation === null;

  return (
    <div className="space-y-4">
      {/* Current policy */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Current probability policy</p>
                <Badge variant="success">live</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The policy the server will apply to the next accepted spin.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              Times shown in {LOCAL_TIME_ZONE}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Refresh current probability policy"
                onClick={() => {
                  void currentPolicy.refetch();
                  void schedules.refetch();
                }}
                disabled={currentPolicy.isFetching}
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${currentPolicy.isFetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>

        {currentPolicy.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={2} />
          </div>
        ) : currentPolicy.isError || !policy ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-destructive">
              {currentPolicy.error
                ? apiErrorMessage(currentPolicy.error)
                : "Current probability policy is unavailable."}
            </p>
            <Button variant="outline" size="sm" onClick={() => void currentPolicy.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid gap-px bg-border lg:grid-cols-[1.1fr_0.8fr_1.3fr]">
            <div className="bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Effective mode
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-semibold">{policy.mode}</p>
                <Badge variant={policy.source === "SCHEDULE" ? "info" : "secondary"}>
                  {policy.source === "SCHEDULE" ? "scheduled" : "fair fallback"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {policy.profileName ?? "Equal probability across all 37 pockets"}
              </p>
            </div>
            <div className="bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estimated RTP
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {pct(policy.estimatedRtp)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recalculated against current payouts
              </p>
            </div>
            <div className="bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Policy window
              </p>
              {policy.startsAt && policy.endsAt ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">From </span>
                    {formatLocalDateTime(policy.startsAt)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Until </span>
                    {formatLocalDateTime(policy.endsAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm">Continuous FAIR fallback</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {policy.nextTransitionAt
                  ? `Next transition: ${formatLocalDateTime(policy.nextTransitionAt)}`
                  : "No next transition is currently scheduled."}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Safety / semantics */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
        <b>Scheduled, global policy only.</b> Profiles are immutable definitions and windows affect
        future rounds during their From/To interval. They cannot target a user, a selected bet, or
        any settled round. Every schedule and cancellation requires a reason and is audited.
      </div>

      {/* Schedule timeline */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Probability policy timeline</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Non-overlapping windows, displayed in {LOCAL_TIME_ZONE}. At each end boundary the
              server returns to FAIR unless another later window begins.
            </p>
          </div>
          <Badge variant="outline">
            {(schedules.data ?? []).filter((item) => item.status === "UPCOMING").length} upcoming
          </Badge>
        </div>

        {schedules.isLoading ? (
          <TableSkeleton rows={4} />
        ) : schedules.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-destructive">{apiErrorMessage(schedules.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void schedules.refetch()}>
              Retry
            </Button>
          </div>
        ) : !schedules.data || schedules.data.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <CalendarDaysIcon className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No scheduled probability windows</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a profile below, then schedule its From/To window.
            </p>
          </div>
        ) : (
          <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border">
            {schedules.data.map((schedule) => (
              <div key={schedule.id} className="relative pl-8">
                <span
                  className={`absolute left-0 top-5 h-4 w-4 rounded-full border-2 ${statusDotClass(
                    schedule.status,
                  )}`}
                />
                <div
                  className={`rounded-lg border p-4 ${
                    schedule.status === "ACTIVE" ? "border-teal-500/40 bg-teal-500/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{schedule.profile.name}</p>
                        <Badge variant={statusBadgeVariant(schedule.status)}>
                          {schedule.status.toLowerCase()}
                        </Badge>
                        <Badge variant="outline">{schedule.profile.mode}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Estimated RTP {pct(schedule.profile.estimatedRtp)} ·{" "}
                        {durationLabel(schedule.startsAt, schedule.endsAt)}
                      </p>
                    </div>
                    {canWrite &&
                      (schedule.status === "UPCOMING" || schedule.status === "ACTIVE") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openCancelDialog(schedule)}
                        >
                          Cancel window
                        </Button>
                      )}
                  </div>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="mt-0.5">{formatLocalDateTime(schedule.startsAt)}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Until</p>
                      <p className="mt-0.5">{formatLocalDateTime(schedule.endsAt)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Reason:</span> {schedule.reason}
                  </p>
                  {schedule.status === "CANCELLED" && (
                    <p className="mt-2 text-xs text-destructive">
                      <span className="font-medium">Cancellation:</span>{" "}
                      {schedule.cancelReason ?? "No reason returned"}
                      {schedule.cancelledAt
                        ? ` · ${formatLocalDateTime(schedule.cancelledAt)}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create immutable profile */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Create an immutable probability profile</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A profile is a reusable global definition. Create a new one if weights need to change.
            </p>
          </div>
          {!canWrite && <Badge variant="outline">Read-only · super-admin required</Badge>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="p-name">Profile name</Label>
            <Input
              id="p-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Weekend red lean"
              disabled={!canWrite}
            />
          </div>
          <div>
            <Label>Mode</Label>
            <Select
              value={mode}
              onValueChange={(value) => {
                setMode(value as ProbabilityMode);
                setPreview(null);
              }}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FAIR">FAIR (equal odds)</SelectItem>
                <SelectItem value="WEIGHTED">WEIGHTED (custom global weights)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "WEIGHTED" && (
          <div className="mt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label>Global weight presets</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Presets only populate the 0–36 weights below. Review RTP before scheduling.
                </p>
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">Total weight {totalWeight}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {WEIGHT_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant={selectedPreset === preset.key ? "secondary" : "outline"}
                  size="sm"
                  title={preset.description}
                  disabled={!canWrite}
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
              {weights.map((weight, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {index}
                  </span>
                  <Input
                    aria-label={`Weight for roulette pocket ${index}`}
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={weight}
                    disabled={!canWrite}
                    onChange={(event) => setWeight(index, event.target.value)}
                    className="h-8 px-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => estimate.mutate()}
            disabled={estimate.isPending || (mode === "WEIGHTED" && totalWeight === 0)}
          >
            {estimate.isPending ? "Estimating…" : "Preview RTP"}
          </Button>
          {canWrite && (
            <Button
              type="button"
              onClick={() => create.mutate()}
              disabled={
                create.isPending ||
                name.trim().length === 0 ||
                (mode === "WEIGHTED" && totalWeight === 0)
              }
            >
              {create.isPending ? "Creating…" : "Create profile"}
            </Button>
          )}
        </div>

        {preview && (
          <div className="mt-4">
            <RtpPreview value={preview} />
          </div>
        )}
      </Card>

      {/* Immutable profiles */}
      <Card className="p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold">Probability profiles</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Definitions cannot be activated immediately or edited in place. Schedule a finite window
            to use one.
          </p>
        </div>
        {profiles.isLoading ? (
          <TableSkeleton rows={4} />
        ) : profiles.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-destructive">{apiErrorMessage(profiles.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void profiles.refetch()}>
              Retry
            </Button>
          </div>
        ) : !profiles.data || profiles.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No profiles yet. The server uses FAIR probability until a profile window is scheduled.
          </p>
        ) : (
          <div className="space-y-2">
            {profiles.data.map((profile) => {
              const scheduledCount = (schedules.data ?? []).filter(
                (schedule) => schedule.profileId === profile.id,
              ).length;
              const profileTotal = profile.numberWeights.reduce(
                (total, weight) => total + weight,
                0,
              );
              return (
                <div
                  key={profile.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{profile.name}</p>
                      <Badge variant="outline">{profile.mode}</Badge>
                      <Badge variant="secondary">immutable</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      est. RTP {pct(profile.estimatedRtp)}
                      {profile.mode === "WEIGHTED"
                        ? ` · 37 global weights · total ${profileTotal}`
                        : " · equal pocket probability"}
                      {scheduledCount > 0
                        ? ` · ${scheduledCount} scheduled window${scheduledCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => openScheduleDialog(profile)}>
                      Schedule window
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Schedule profile dialog */}
      <Dialog
        open={scheduling !== null}
        onOpenChange={(open) => {
          if (!open) closeScheduleDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule “{scheduling?.name}”</DialogTitle>
            <DialogDescription>
              Choose one finite policy window. Times are entered in {LOCAL_TIME_ZONE} and sent to
              the server as UTC instants. Overlapping live windows are rejected.
            </DialogDescription>
          </DialogHeader>

          {scheduling && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{scheduling.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Immutable {scheduling.mode} definition
                  </p>
                </div>
                <Badge variant="outline">stored RTP {pct(scheduling.estimatedRtp)}</Badge>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="schedule-from">From · {LOCAL_TIME_ZONE}</Label>
              <Input
                id="schedule-from"
                type="datetime-local"
                value={scheduleStartsAt}
                onChange={(event) => setScheduleStartsAt(event.target.value)}
                disabled={createSchedule.isPending}
              />
            </div>
            <div>
              <Label htmlFor="schedule-to">To · {LOCAL_TIME_ZONE}</Label>
              <Input
                id="schedule-to"
                type="datetime-local"
                min={scheduleStartsAt || undefined}
                value={scheduleEndsAt}
                onChange={(event) => setScheduleEndsAt(event.target.value)}
                disabled={createSchedule.isPending}
              />
            </div>
          </div>
          {scheduleValidation ? (
            <p className="text-xs text-destructive">{scheduleValidation}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Window length:{" "}
              {durationLabel(
                new Date(scheduleStartsAt).toISOString(),
                new Date(scheduleEndsAt).toISOString(),
              )}
              . Boundaries apply to future accepted spins only.
            </p>
          )}

          <div>
            <Label htmlFor="schedule-reason">Required reason</Label>
            <Textarea
              id="schedule-reason"
              rows={3}
              maxLength={500}
              value={scheduleReason}
              onChange={(event) => setScheduleReason(event.target.value)}
              placeholder="Why should this global probability policy run during this window?"
              disabled={createSchedule.isPending}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {scheduleReason.length}/500
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>RTP review under current payouts</Label>
              {scheduling && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => scheduleEstimate.mutate(scheduling)}
                  disabled={scheduleEstimate.isPending}
                >
                  Recalculate
                </Button>
              )}
            </div>
            {scheduleEstimate.isPending ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Recalculating RTP and safety warnings…
              </div>
            ) : schedulePreview ? (
              <RtpPreview value={schedulePreview} compact />
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                RTP review is unavailable. Recalculate before scheduling.
              </div>
            )}
          </div>

          <label
            htmlFor="schedule-reviewed"
            className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
              schedulePreview ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            }`}
          >
            <input
              id="schedule-reviewed"
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={scheduleReviewed}
              onChange={(event) => setScheduleReviewed(event.target.checked)}
              disabled={!schedulePreview || createSchedule.isPending}
            />
            <span>
              I reviewed the recalculated RTP and every warning above. This policy is global,
              time-limited, and applies only to future spins.
            </span>
          </label>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeScheduleDialog}
              disabled={createSchedule.isPending}
            >
              Close
            </Button>
            <Button
              onClick={() => createSchedule.mutate()}
              disabled={!canSubmitSchedule || createSchedule.isPending}
            >
              {createSchedule.isPending ? "Scheduling…" : "Schedule policy window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel schedule dialog */}
      <Dialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open && !cancelSchedule.isPending) {
            setCancelling(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancel probability window?</DialogTitle>
            <DialogDescription>
              {cancelling?.status === "ACTIVE"
                ? "This window is active. Cancellation returns new spins to FAIR immediately, until the next scheduled window begins."
                : "This upcoming window will never take effect."}{" "}
              The original schedule remains visible and auditable.
            </DialogDescription>
          </DialogHeader>

          {cancelling && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{cancelling.profile.name}</p>
                <Badge variant={statusBadgeVariant(cancelling.status)}>
                  {cancelling.status.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatLocalDateTime(cancelling.startsAt)} →{" "}
                {formatLocalDateTime(cancelling.endsAt)}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="cancel-reason">Required cancellation reason</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Why is this scheduled policy being cancelled?"
              disabled={cancelSchedule.isPending}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {cancelReason.length}/500
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelling(null);
                setCancelReason("");
              }}
              disabled={cancelSchedule.isPending}
            >
              Keep window
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelSchedule.mutate()}
              disabled={cancelSchedule.isPending || cancelReason.trim().length === 0}
            >
              {cancelSchedule.isPending ? "Cancelling…" : "Cancel policy window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
