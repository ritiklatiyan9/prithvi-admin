import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";
import type { Campaign, CampaignInput, CampaignStatus } from "@/types/domain";

export const campaignsService = {
  list: async (params: {
    page: number;
    limit: number;
    status?: CampaignStatus;
  }): Promise<Paginated<Campaign>> => {
    const { data } = await apiClient.get<ApiSuccess<Campaign[]>>("/campaigns/manage", { params });
    return { items: data.data, meta: data.meta! };
  },

  getById: async (id: string): Promise<Campaign> => {
    const { data } = await apiClient.get<ApiSuccess<Campaign>>(`/campaigns/${id}`);
    return data.data;
  },

  create: async (input: CampaignInput): Promise<Campaign> => {
    const { data } = await apiClient.post<ApiSuccess<Campaign>>("/campaigns", input);
    return data.data;
  },

  update: async (id: string, input: Partial<CampaignInput>): Promise<Campaign> => {
    const { data } = await apiClient.patch<ApiSuccess<Campaign>>(`/campaigns/${id}`, input);
    return data.data;
  },

  changeStatus: async (id: string, status: CampaignStatus): Promise<Campaign> => {
    const { data } = await apiClient.patch<ApiSuccess<Campaign>>(`/campaigns/${id}/status`, {
      status,
    });
    return data.data;
  },
};
