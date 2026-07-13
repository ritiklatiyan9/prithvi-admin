import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";

export interface ReferralRow {
  referred: {
    id: string;
    name: string;
    email: string;
    referredAt: string | null;
  };
  referrer: {
    id: string;
    name: string;
    email: string;
    referralCode: string | null;
  } | null;
  creditedPoints: number | null;
}

export const referralsService = {
  list: async (params: {
    page: number;
    limit: number;
    search?: string;
    from?: string;
    to?: string;
  }): Promise<Paginated<ReferralRow>> => {
    const { data } = await apiClient.get<ApiSuccess<ReferralRow[]>>("/admin/referrals", {
      params,
    });
    return { items: data.data, meta: data.meta! };
  },
};
