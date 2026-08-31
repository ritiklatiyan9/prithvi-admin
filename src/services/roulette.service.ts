import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";

export type RouletteBetType = "ODD" | "EVEN" | "RED" | "BLACK" | "NUMBER";
export type ProbabilityMode = "FAIR" | "WEIGHTED";
export type ProbabilityScheduleStatus =
  "UPCOMING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface RouletteProfile {
  id: string;
  name: string;
  mode: ProbabilityMode;
  numberWeights: number[];
  estimatedRtp: number;
  createdById: string | null;
  createdAt: string;
}

export interface RouletteProbabilitySchedule {
  id: string;
  profileId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: ProbabilityScheduleStatus;
  profile: {
    id: string;
    name: string;
    mode: ProbabilityMode;
    estimatedRtp: number;
  };
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface RouletteProbabilityPolicy {
  source: "FAIR" | "SCHEDULE";
  mode: ProbabilityMode;
  scheduleId: string | null;
  profileId: string | null;
  profileName: string | null;
  estimatedRtp: number;
  startsAt: string | null;
  endsAt: string | null;
  nextTransitionAt: string | null;
}

export interface RtpEstimate {
  overall: number;
  byCategory: {
    number: number;
    odd: number;
    even: number;
    red: number;
    black: number;
    maxNumberRtp: number;
  };
  warnings: string[];
}

export interface RouletteRound {
  id: string;
  userId: string;
  betType: RouletteBetType;
  selectedNumber: number | null;
  betAmount: number;
  usedFreeGame: boolean;
  winningNumber: number;
  winningColour: string;
  parity: string;
  won: boolean;
  payoutMultiplier: number;
  payoutAmount: number;
  netResult: number;
  status: string;
  probabilityMode: string;
  serverSeedHash: string;
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
  probabilityProfileId: string | null;
  probabilityScheduleId: string | null;
  policyResolvedAt: string;
  createdAt: string;
  settledAt: string | null;
}

export interface RouletteAnalytics {
  totals: {
    games: number;
    players: number;
    activePlayers: number;
    coinsWagered: number;
    coinsWon: number;
    coinsLost: number;
    netCoinMovement: number;
    averageBet: number;
    winRate: number;
    rtp: number;
    freeGames: number;
    paidGames: number;
  };
  numberDistribution: { number: number; count: number }[];
  parityDistribution: { odd: number; even: number; zero: number };
  colourDistribution: { red: number; black: number; green: number };
  daily: { date: string; games: number; wagered: number; won: number }[];
  topWins: {
    roundId: string;
    userId: string;
    payoutAmount: number;
    winningNumber: number;
    createdAt: string;
  }[];
  mostActive: { userId: string; games: number }[];
  recentRounds: RouletteRound[];
}

export interface RouletteAuditEntry {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface RoundFilters {
  page: number;
  limit: number;
  userId?: string;
  betType?: RouletteBetType;
  winningNumber?: number;
  won?: boolean;
  usedFreeGame?: boolean;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
}

const BASE = "/game/roulette/admin";

export const rouletteService = {
  listProfiles: async (): Promise<RouletteProfile[]> => {
    const { data } = await apiClient.get<ApiSuccess<RouletteProfile[]>>(
      `${BASE}/probability-profiles`,
    );
    return data.data;
  },

  createProfile: async (input: {
    name: string;
    mode: ProbabilityMode;
    numberWeights?: number[];
    reason?: string;
  }): Promise<RouletteProfile> => {
    const { data } = await apiClient.post<ApiSuccess<RouletteProfile>>(
      `${BASE}/probability-profiles`,
      input,
    );
    return data.data;
  },

  listProbabilitySchedules: async (): Promise<
    RouletteProbabilitySchedule[]
  > => {
    const { data } = await apiClient.get<
      ApiSuccess<RouletteProbabilitySchedule[]>
    >(`${BASE}/probability-schedules`);
    return data.data;
  },

  createProbabilitySchedule: async (input: {
    profileId: string;
    startsAt: string;
    endsAt: string;
    reason: string;
  }): Promise<RouletteProbabilitySchedule> => {
    const { data } = await apiClient.post<
      ApiSuccess<RouletteProbabilitySchedule>
    >(`${BASE}/probability-schedules`, input);
    return data.data;
  },

  cancelProbabilitySchedule: async (
    id: string,
    reason: string,
  ): Promise<RouletteProbabilitySchedule> => {
    const { data } = await apiClient.post<
      ApiSuccess<RouletteProbabilitySchedule>
    >(`${BASE}/probability-schedules/${id}/cancel`, { reason });
    return data.data;
  },

  currentProbabilityPolicy: async (): Promise<RouletteProbabilityPolicy> => {
    const { data } = await apiClient.get<ApiSuccess<RouletteProbabilityPolicy>>(
      `${BASE}/probability-policy/current`,
    );
    return data.data;
  },

  estimateRtp: async (input: {
    mode: ProbabilityMode;
    numberWeights?: number[];
  }): Promise<RtpEstimate> => {
    const { data } = await apiClient.post<ApiSuccess<RtpEstimate>>(
      `${BASE}/estimate-rtp`,
      input,
    );
    return data.data;
  },

  listRounds: async (
    filters: RoundFilters,
    signal?: AbortSignal,
  ): Promise<Paginated<RouletteRound>> => {
    const { data } = await apiClient.get<ApiSuccess<RouletteRound[]>>(
      `${BASE}/rounds`,
      {
        params: filters,
        signal,
      },
    );
    return { items: data.data, meta: data.meta! };
  },

  getRound: async (id: string): Promise<RouletteRound> => {
    const { data } = await apiClient.get<ApiSuccess<RouletteRound>>(
      `${BASE}/rounds/${id}`,
    );
    return data.data;
  },

  analytics: async (params: {
    from?: string;
    to?: string;
  }): Promise<RouletteAnalytics> => {
    const { data } = await apiClient.get<ApiSuccess<RouletteAnalytics>>(
      `${BASE}/analytics`,
      {
        params,
      },
    );
    return data.data;
  },

  auditLogs: async (
    params: { page: number; limit: number },
    signal?: AbortSignal,
  ): Promise<Paginated<RouletteAuditEntry>> => {
    const { data } = await apiClient.get<ApiSuccess<RouletteAuditEntry[]>>(
      `${BASE}/audit-logs`,
      {
        params,
        signal,
      },
    );
    return { items: data.data, meta: data.meta! };
  },
};
