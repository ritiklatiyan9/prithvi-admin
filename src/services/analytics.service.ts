import { apiClient } from "./api-client";
import type { ApiSuccess } from "@/types/api";
import type { AnalyticsSummary } from "@/types/domain";

export const analyticsService = {
  summary: async (
    params: { from?: string; to?: string },
    signal?: AbortSignal,
  ): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get<ApiSuccess<AnalyticsSummary>>(
      "/analytics/summary",
      {
        params,
        signal,
      },
    );
    return data.data;
  },
};
