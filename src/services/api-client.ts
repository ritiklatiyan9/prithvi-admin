import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";
import type { ApiSuccess, ApiError } from "@/types/api";
import type { AuthTokens } from "@/types/user";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Single-flight refresh: concurrent 401s share one refresh request. */
let refreshPromise: Promise<string | null> | null = null;

const refreshTokens = async (): Promise<string | null> => {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    // bare axios — must not recurse through these interceptors
    const { data } = await axios.post<ApiSuccess<AuthTokens>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    useAuthStore.getState().setAuth(data.data);
    return data.data.accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthRoute = original.url?.includes("/auth/");

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshPromise ??= refreshTokens().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts the backend's error message for toasts. */
export const apiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};
