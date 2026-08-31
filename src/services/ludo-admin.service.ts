import { apiClient } from "./api-client";
import type { ApiSuccess, PageMeta, Paginated } from "@/types/api";
import type {
  GameAuditEntry,
  GameConfiguration,
  GameConfigValues,
  GameMatchDetails,
  GameMatchSummary,
  GameMonitoring,
  GameOverview,
  GamePaymentEvent,
  GamePlayerDetails,
  GamePlayerSummary,
  GameReport,
  GameRoomDetails,
  GameRoomSummary,
  PlayerRestrictionInput,
  PlayerRestrictionUpdateResult,
  SubscriptionAnalytics,
} from "@/types/ludo-admin";

const BASE = "/admin/game";

interface PageParams {
  page: number;
  limit: number;
}

const pageMeta = <T>(
  meta: PageMeta | undefined,
  params: PageParams,
  items: T[],
): PageMeta =>
  meta ?? {
    page: params.page,
    limit: params.limit,
    total: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  };

const paginated = <T>(
  response: ApiSuccess<T[]>,
  params: PageParams,
): Paginated<T> => ({
  items: response.data,
  meta: pageMeta(response.meta, params, response.data),
});

const normalizeConfiguration = (
  config: GameConfiguration | GameConfigValues,
): GameConfiguration => {
  const values = (config as GameConfiguration).values;
  return values && typeof values === "object"
    ? (config as GameConfiguration)
    : { values: config as GameConfigValues };
};

export const ludoAdminService = {
  overview: async (signal?: AbortSignal): Promise<GameOverview> => {
    const { data } = await apiClient.get<ApiSuccess<GameOverview>>(
      `${BASE}/overview`,
      { signal },
    );
    return data.data;
  },

  rooms: async (
    params: PageParams & { status?: string; mode?: string; search?: string },
    signal?: AbortSignal,
  ): Promise<Paginated<GameRoomSummary>> => {
    const { data } = await apiClient.get<ApiSuccess<GameRoomSummary[]>>(
      `${BASE}/rooms`,
      { params, signal },
    );
    const result = paginated(data, params);
    return {
      ...result,
      items: result.items.map((room) => ({
        ...room,
        players: room.players ?? [],
      })),
    };
  },

  room: async (id: string, signal?: AbortSignal): Promise<GameRoomDetails> => {
    const { data } = await apiClient.get<ApiSuccess<GameRoomDetails>>(
      `${BASE}/rooms/${encodeURIComponent(id)}`,
      { signal },
    );
    return { ...data.data, players: data.data.players ?? [] };
  },

  matches: async (
    params: PageParams & {
      search?: string;
      mode?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    signal?: AbortSignal,
  ): Promise<Paginated<GameMatchSummary>> => {
    const { data } = await apiClient.get<ApiSuccess<GameMatchSummary[]>>(
      `${BASE}/matches`,
      { params, signal },
    );
    const result = paginated(data, params);
    return {
      ...result,
      items: result.items.map((match) => ({
        ...match,
        players: match.players ?? [],
      })),
    };
  },

  match: async (
    id: string,
    signal?: AbortSignal,
  ): Promise<GameMatchDetails> => {
    const { data } = await apiClient.get<ApiSuccess<GameMatchDetails>>(
      `${BASE}/matches/${encodeURIComponent(id)}`,
      { signal },
    );
    return { ...data.data, players: data.data.players ?? [] };
  },

  players: async (
    params: PageParams & { search?: string },
    signal?: AbortSignal,
  ): Promise<Paginated<GamePlayerSummary>> => {
    const { data } = await apiClient.get<ApiSuccess<GamePlayerSummary[]>>(
      `${BASE}/players`,
      { params, signal },
    );
    return paginated(data, params);
  },

  player: async (
    userId: string,
    signal?: AbortSignal,
  ): Promise<GamePlayerDetails> => {
    const { data } = await apiClient.get<ApiSuccess<GamePlayerDetails>>(
      `${BASE}/players/${encodeURIComponent(userId)}`,
      { signal },
    );
    return data.data;
  },

  updatePlayerRestrictions: async (
    userId: string,
    input: PlayerRestrictionInput,
  ): Promise<PlayerRestrictionUpdateResult> => {
    const { data } = await apiClient.patch<
      ApiSuccess<PlayerRestrictionUpdateResult>
    >(`${BASE}/players/${encodeURIComponent(userId)}/restrictions`, input);
    return data.data;
  },

  reports: async (
    params: PageParams & { status?: string },
    signal?: AbortSignal,
  ): Promise<Paginated<GameReport>> => {
    const { data } = await apiClient.get<ApiSuccess<GameReport[]>>(
      `${BASE}/reports`,
      { params, signal },
    );
    return paginated(data, params);
  },

  resolveReport: async (
    id: string,
    input: { resolution: string; note?: string },
  ): Promise<GameReport> => {
    const { data } = await apiClient.patch<ApiSuccess<GameReport>>(
      `${BASE}/reports/${encodeURIComponent(id)}/resolve`,
      input,
    );
    return data.data;
  },

  subscriptionAnalytics: async (
    signal?: AbortSignal,
  ): Promise<SubscriptionAnalytics> => {
    const { data } = await apiClient.get<ApiSuccess<SubscriptionAnalytics>>(
      `${BASE}/subscriptions/analytics`,
      { signal },
    );
    return data.data;
  },

  paymentEvents: async (
    params: PageParams & { status?: string },
    signal?: AbortSignal,
  ): Promise<Paginated<GamePaymentEvent>> => {
    const { data } = await apiClient.get<ApiSuccess<GamePaymentEvent[]>>(
      `${BASE}/payment-events`,
      { params, signal },
    );
    return paginated(data, params);
  },

  configuration: async (signal?: AbortSignal): Promise<GameConfiguration> => {
    const { data } = await apiClient.get<
      ApiSuccess<GameConfiguration | GameConfigValues>
    >(`${BASE}/config`, { signal });
    return normalizeConfiguration(data.data);
  },

  updateConfiguration: async (
    values: GameConfigValues,
  ): Promise<GameConfiguration> => {
    const { data } = await apiClient.patch<
      ApiSuccess<GameConfiguration | GameConfigValues>
    >(`${BASE}/config`, { values });
    return normalizeConfiguration(data.data);
  },

  monitoring: async (signal?: AbortSignal): Promise<GameMonitoring> => {
    const { data } = await apiClient.get<ApiSuccess<GameMonitoring>>(
      `${BASE}/monitoring`,
      { signal },
    );
    return data.data;
  },

  auditLogs: async (
    params: PageParams & { search?: string },
    signal?: AbortSignal,
  ): Promise<Paginated<GameAuditEntry>> => {
    const { data } = await apiClient.get<ApiSuccess<GameAuditEntry[]>>(
      `${BASE}/audit-logs`,
      { params, signal },
    );
    return paginated(data, params);
  },
};
