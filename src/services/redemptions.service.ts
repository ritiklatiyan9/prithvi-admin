import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";

export type RedemptionStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" | "FAILED";

// Mirrors RedemptionDto in the backend's redemptions.schema.ts (admin listing shape).
export interface Redemption {
  id: string;
  coins: number;
  status: RedemptionStatus;
  provider: string | null;
  voucherCode: string | null;
  voucherUrl: string | null;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
  providerRef?: string | null;
  failReason?: string | null;
  user?: { id: string; name: string; email: string };
}

export const redemptionsService = {
  list: async (params: {
    page: number;
    limit: number;
    status?: RedemptionStatus;
    search?: string;
    from?: string;
    to?: string;
  }): Promise<Paginated<Redemption>> => {
    const { data } = await apiClient.get<ApiSuccess<Redemption[]>>("/redemptions", { params });
    return { items: data.data, meta: data.meta! };
  },

  review: async (
    id: string,
    input: { action: "APPROVE" | "REJECT"; note?: string },
  ): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/review`,
      input,
    );
    return data.data;
  },

  fulfill: async (
    id: string,
    input: { voucherCode: string; voucherUrl?: string },
  ): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/fulfill`,
      input,
    );
    return data.data;
  },
};
