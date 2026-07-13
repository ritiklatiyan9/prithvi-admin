import { apiClient } from "./api-client";
import type { ApiSuccess } from "@/types/api";

export interface AppAssetSlot {
  key: string;
  page: string;
  label: string;
  description: string;
  /** Override URL, or null = app uses its bundled default artwork. */
  imageUrl: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const appAssetsService = {
  listAdmin: async (): Promise<AppAssetSlot[]> => {
    const { data } = await apiClient.get<ApiSuccess<{ slots: AppAssetSlot[] }>>(
      "/app-assets/admin",
    );
    return data.data.slots;
  },

  setSlot: async (key: string, imageUrl: string): Promise<void> => {
    await apiClient.put(`/app-assets/admin/${key}`, { imageUrl });
  },

  clearSlot: async (key: string): Promise<void> => {
    await apiClient.delete(`/app-assets/admin/${key}`);
  },
};
