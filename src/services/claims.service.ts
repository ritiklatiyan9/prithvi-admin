import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";
import type { Claim, ClaimStatus } from "@/types/domain";

export const claimsService = {
  list: async (
    params: {
      page: number;
      limit: number;
      status?: ClaimStatus;
    },
    signal?: AbortSignal,
  ): Promise<Paginated<Claim>> => {
    const { data } = await apiClient.get<ApiSuccess<Claim[]>>("/claims", {
      params,
      signal,
    });
    return { items: data.data, meta: data.meta! };
  },

  review: async (
    id: string,
    input: { action: "APPROVE" | "REJECT"; reviewNote?: string },
  ): Promise<Claim> => {
    const { data } = await apiClient.patch<ApiSuccess<Claim>>(
      `/claims/${id}/review`,
      input,
    );
    return data.data;
  },
};
