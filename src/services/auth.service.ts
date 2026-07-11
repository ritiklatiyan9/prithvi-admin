import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { apiClient } from "./api-client";
import { firebaseAuth, googleProvider } from "./firebase";
import type { ApiSuccess } from "@/types/api";
import type { AuthTokens, User } from "@/types/user";

export const authService = {
  /**
   * Sign in through Firebase (Google provider), then exchange the Firebase ID
   * token with the backend for our app session (JWT + rotating refresh token).
   */
  firebaseSignIn: async (): Promise<AuthTokens> => {
    const credential = await signInWithPopup(firebaseAuth, googleProvider);
    const idToken = await credential.user.getIdToken();
    const { data } = await apiClient.post<ApiSuccess<AuthTokens>>("/auth/firebase", { idToken });
    return data.data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiSuccess<User>>("/auth/me");
    return data.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await Promise.allSettled([
      apiClient.post("/auth/logout", { refreshToken }),
      firebaseSignOut(firebaseAuth),
    ]);
  },

  logoutAll: async (): Promise<void> => {
    await Promise.allSettled([
      apiClient.post("/auth/logout-all"),
      firebaseSignOut(firebaseAuth),
    ]);
  },
};
