import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";
import type { ClaimStatus, ContentStatus } from "@/types/domain";

// ponytail: types live here, not domain.ts — missions are only used by this page.
export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  status: ContentStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MissionInput {
  title: string;
  description: string;
  rewardCoins: number;
  status: ContentStatus;
  sortOrder: number;
}

export interface MissionCompletion {
  id: string;
  missionId: string;
  missionTitle: string;
  rewardCoins: number;
  userId: string;
  userEmail: string;
  status: ClaimStatus;
  note: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export const missionsService = {
  list: async (): Promise<Mission[]> => {
    const { data } = await apiClient.get<ApiSuccess<Mission[]>>("/missions/admin");
    return data.data;
  },

  create: async (input: MissionInput): Promise<Mission> => {
    const { data } = await apiClient.post<ApiSuccess<Mission>>("/missions/admin", input);
    return data.data;
  },

  update: async (id: string, input: Partial<MissionInput>): Promise<Mission> => {
    const { data } = await apiClient.patch<ApiSuccess<Mission>>(`/missions/admin/${id}`, input);
    return data.data;
  },

  /** Soft delete (sets deletedAt) — the mission disappears from the app. */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/missions/admin/${id}`);
  },

  listCompletions: async (params: {
    page: number;
    limit: number;
    status?: ClaimStatus;
  }): Promise<Paginated<MissionCompletion>> => {
    const { data } = await apiClient.get<ApiSuccess<MissionCompletion[]>>(
      "/missions/admin/completions",
      { params },
    );
    return { items: data.data, meta: data.meta! };
  },

  reviewCompletion: async (
    id: string,
    input: { action: "APPROVE" | "REJECT"; note?: string },
  ): Promise<MissionCompletion> => {
    const { data } = await apiClient.patch<ApiSuccess<MissionCompletion>>(
      `/missions/admin/completions/${id}/review`,
      input,
    );
    return data.data;
  },
};
