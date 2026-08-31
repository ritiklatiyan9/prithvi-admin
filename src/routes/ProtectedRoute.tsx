import { Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
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
          This dashboard is restricted to administrators. Your account doesn't
          have an admin role.
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

const SessionLoader = (): JSX.Element => (
  <div className="flex min-h-screen items-center justify-center" role="status">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
    <span className="sr-only">Restoring admin session</span>
  </div>
);

const SessionUnavailable = ({ retry }: { retry: () => void }): JSX.Element => {
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Couldn't verify your session</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Check your connection and try again. Your saved session has not been
          removed.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={retry}>
          <ArrowPathIcon className="mr-2 h-4 w-4" /> Try again
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            clear();
            navigate("/login", { replace: true });
          }}
        >
          Sign in again
        </Button>
      </div>
    </div>
  );
};

export const ProtectedRoute = (): JSX.Element => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const auth = useAuth(); // revalidates persisted sessions in the background

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  // A normally persisted session has a user and renders immediately. This
  // guard only blocks partial/corrupt persisted state from flashing the panel.
  if (!user && auth.isPending) {
    return <SessionLoader />;
  }
  if (!user && auth.isError) {
    return <SessionUnavailable retry={() => void auth.refetch()} />;
  }
  if (user && !isAdminRole(user)) {
    return <NotAuthorized />;
  }
  return <Outlet />;
};
