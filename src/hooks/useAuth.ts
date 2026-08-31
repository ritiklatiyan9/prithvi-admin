import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

/** Revalidates the session against the backend and syncs the stored user. */
export const useAuth = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async ({ signal }) => {
      const user = await authService.me(signal);
      setUser(user);
      return user;
    },
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 5 * 60_000,
  });
};
