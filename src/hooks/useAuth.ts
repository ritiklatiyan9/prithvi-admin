import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

/** Revalidates the session against the backend and syncs the stored user. */
export const useAuth = () => {
  const { accessToken, setUser } = useAuthStore();

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const user = await authService.me();
      setUser(user);
      return user;
    },
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 60_000,
  });
};
