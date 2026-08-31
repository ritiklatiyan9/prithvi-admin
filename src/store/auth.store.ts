import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queryClient } from "@/services/query-client";
import type { AuthTokens, User } from "@/types/user";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      setUser: (user) => set({ user }),
      clear: () => {
        // Never expose one administrator's cached API data to the next session.
        queryClient.clear();
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "rewardhub-admin-auth",
      partialize: ({ user, accessToken, refreshToken }) => ({
        user,
        accessToken,
        refreshToken,
      }),
    },
  ),
);

export const isAdminRole = (user: User | null): boolean =>
  user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
