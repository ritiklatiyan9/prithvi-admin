import { apiClient } from "./api-client";
import type { ApiSuccess } from "@/types/api";
import type { AuthTokens, User } from "@/types/user";

export const authService = {
  /**
   * Sign in through Firebase (Google provider), then exchange the Firebase ID
   * token with the backend for our app session (JWT + rotating refresh token).
   */
  firebaseSignIn: async (): Promise<AuthTokens> => {
    const { firebaseGoogleIdToken } = await import("./firebase-auth");
    const idToken = await firebaseGoogleIdToken();
    const { data } = await apiClient.post<ApiSuccess<AuthTokens>>(
      "/auth/firebase",
      { idToken },
    );
    return data.data;
  },

  me: async (signal?: AbortSignal): Promise<User> => {
    const { data } = await apiClient.get<ApiSuccess<User>>("/auth/me", {
      signal,
    });
    return data.data;
  },

  logout: async (
    refreshToken: string,
    accessToken?: string | null,
  ): Promise<void> => {
    const firebaseLogout = import("./firebase-auth").then(
      ({ signOutFirebase }) => signOutFirebase(),
    );
    await Promise.allSettled([
      apiClient.post(
        "/auth/logout",
        { refreshToken },
        accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined,
      ),
      firebaseLogout,
    ]);
  },

  logoutAll: async (): Promise<void> => {
    const firebaseLogout = import("./firebase-auth").then(
      ({ signOutFirebase }) => signOutFirebase(),
    );
    await Promise.allSettled([
      apiClient.post("/auth/logout-all"),
      firebaseLogout,
    ]);
  },
};
