import {
  QueryCache,
  QueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";

const responseStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

const queryErrorMessage = (error: unknown): string => {
  const apiMessage = (
    error as { response?: { data?: { error?: { message?: string } } } } | null
  )?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error
    ? error.message
    : "Data couldn't be loaded. Please try again.";
};

/**
 * Shared server-state policy for the whole admin app.
 *
 * - Previous list data stays visible while a new page/filter is loading.
 * - Validation/auth failures are never retried; transient failures get one retry.
 * - Inactive data is retained long enough to make back/forward navigation instant.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Existing data remains usable during a background failure. Only surface
      // initial-load failures, deduped per query, to avoid polling toast spam.
      if (query.state.data === undefined) {
        toast.error(queryErrorMessage(error), {
          id: `query-error-${query.queryHash}`,
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      placeholderData: keepPreviousData,
      // Revalidate only stale data when an administrator returns to the tab.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = responseStatus(error);
        if (
          status &&
          status >= 400 &&
          status < 500 &&
          status !== 408 &&
          status !== 429
        ) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
    },
    mutations: {
      retry: false,
    },
  },
});
