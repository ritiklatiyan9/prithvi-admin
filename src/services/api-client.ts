import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";
import type { ApiSuccess, ApiError } from "@/types/api";
import type { AuthTokens } from "@/types/user";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Never forward an admin bearer token to an absolute URL supplied by a
  // compromised/incorrect feature module.
  allowAbsoluteUrls: false,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Single-flight refresh: concurrent 401s share one refresh request. */
let refreshPromise: Promise<string> | null = null;

const refreshTokens = async (): Promise<string> => {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    useAuthStore.getState().clear();
    throw new Error("Your session has expired. Please sign in again.");
  }
  try {
    // bare axios — must not recurse through these interceptors
    const { data } = await axios.post<ApiSuccess<AuthTokens>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 15_000, headers: { Accept: "application/json" } },
    );
    useAuthStore.getState().setAuth(data.data);
    return data.data.accessToken;
  } catch (error) {
    // A network outage or temporary 5xx must not destroy a valid persisted
    // session. Only an authoritative auth rejection signs the administrator out.
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    if (status === 400 || status === 401 || status === 403) {
      useAuthStore.getState().clear();
    }
    throw error;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original) return Promise.reject(error);

    const path = original.url?.split("?", 1)[0] ?? "";
    const isSignInRoute = path.endsWith("/auth/firebase");

    if (error.response?.status === 401 && original._retry) {
      useAuthStore.getState().clear();
    } else if (error.response?.status === 401 && !isSignInRoute) {
      original._retry = true;
      refreshPromise ??= refreshTokens().finally(() => {
        refreshPromise = null;
      });
      try {
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts the backend's error message for toasts. */
export const apiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    if (error.code === "ECONNABORTED")
      return "The server took too long to respond. Try again.";
    if (!error.response)
      return "Can't reach the server. Check your connection and try again.";
    return error.response?.data?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};
