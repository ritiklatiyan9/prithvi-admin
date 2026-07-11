import { apiClient } from "./api-client";
import type { ApiSuccess } from "@/types/api";

export type SettingType = "NUMBER" | "BOOLEAN" | "STRING";

export interface RewardSetting {
  key: string;
  value: string;
  type: SettingType;
  category: string;
  label: string;
  description: string;
  isDefault: boolean;
}

export const settingsService = {
  list: async (): Promise<RewardSetting[]> => {
    const { data } = await apiClient.get<ApiSuccess<RewardSetting[]>>("/settings");
    return data.data;
  },

  update: async (values: Record<string, string>): Promise<RewardSetting[]> => {
    const { data } = await apiClient.patch<ApiSuccess<RewardSetting[]>>("/settings", { values });
    return data.data;
  },
};
