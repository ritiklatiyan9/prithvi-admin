import type { GameRoomPlayer, GameUserSummary } from "@/types/ludo-admin";

export type GameBadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "info";

const GOOD = new Set([
  "ACTIVE",
  "CONNECTED",
  "COMPLETED",
  "HEALTHY",
  "ONLINE",
  "PROCESSED",
  "RESOLVED",
  "SUCCESS",
  "PAID",
]);
const WARNING = new Set([
  "MATCHED",
  "WAITING",
  "WAITING_READY",
  "MATCHMAKING",
  "RECONNECTING",
  "PENDING",
  "PROCESSING",
  "DEGRADED",
  "EXPIRING",
]);
const BAD = new Set([
  "ABANDONED",
  "DISCONNECTED",
  "FAILED",
  "ERROR",
  "SUSPENDED",
  "MUTED",
  "UNHEALTHY",
  "CANCELLED",
  "EXPIRED",
]);

export const statusVariant = (status?: string | null): GameBadgeVariant => {
  const normalized = status?.toUpperCase() ?? "";
  if (GOOD.has(normalized)) return "success";
  if (WARNING.has(normalized)) return "warning";
  if (BAD.has(normalized)) return "destructive";
  return normalized ? "info" : "secondary";
};

export const formatGameMode = (mode?: string | null): string => {
  if (!mode) return "—";
  if (mode === "TWO_PLAYER" || mode === "2_PLAYER" || mode === "2P") {
    return "2-player";
  }
  if (mode === "THREE_PLAYER" || mode === "3_PLAYER" || mode === "3P") {
    return "3-player";
  }
  if (mode === "FOUR_PLAYER" || mode === "4_PLAYER" || mode === "4P") {
    return "4-player";
  }
  return mode.toLowerCase().replace(/_/g, " ");
};

export const formatDuration = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return "—";
  }
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours > 0
    ? `${hours}h ${minutes}m`
    : minutes > 0
      ? `${minutes}m ${remainder}s`
      : `${remainder}s`;
};

export const formatRate = (value?: number | null): string => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
};

export const userLabel = (user?: GameUserSummary | null): string =>
  (
    user as
      (GameUserSummary & { user?: GameUserSummary | null }) | null | undefined
  )?.user?.name ||
  (
    user as
      (GameUserSummary & { user?: GameUserSummary | null }) | null | undefined
  )?.user?.email ||
  user?.name ||
  user?.email ||
  user?.id ||
  "Unknown player";

export const playerNames = (players?: GameRoomPlayer[]): string =>
  players?.length ? players.map(userLabel).join(", ") : "Waiting for players";
