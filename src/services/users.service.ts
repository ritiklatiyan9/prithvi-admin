import { apiClient } from "./api-client";
import type { ApiSuccess } from "@/types/api";
import type { User } from "@/types/user";

export const usersService = {
  updateMe: async (input: { name?: string; avatarUrl?: string | null }): Promise<User> => {
    const { data } = await apiClient.patch<ApiSuccess<User>>("/users/me", input);
    return data.data;
  },
};
