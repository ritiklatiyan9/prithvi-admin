import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { isAdminRole, useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/hooks/useAuth";

const NotAuthorized = (): JSX.Element => {
  const navigate = useNavigate();
  const clear = useAuthStore((state) => state.clear);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <ShieldExclamationIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Not authorized</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This dashboard is restricted to administrators. Your account doesn't have an admin role.
        </p>
      </div>
      <Button
        onClick={() => {
          clear();
          navigate("/login", { replace: true });
        }}
      >
        Sign in with a different account
      </Button>
    </div>
  );
};

export const ProtectedRoute = (): JSX.Element => {
  const { accessToken, user } = useAuthStore();
  useAuth(); // revalidates the session in the background

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  if (user && !isAdminRole(user)) {
    return <NotAuthorized />;
  }
  return <Outlet />;
};
