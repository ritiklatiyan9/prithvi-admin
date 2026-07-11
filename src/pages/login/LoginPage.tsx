import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { GiftIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";

const GoogleGlyph = (): JSX.Element => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
    />
  </svg>
);

const firebaseErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled.";
      case "auth/popup-blocked":
        return "The sign-in popup was blocked. Allow popups and try again.";
      case "auth/unauthorized-domain":
        return "This domain isn't authorized in Firebase Auth settings.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return error.message;
    }
  }
  return apiErrorMessage(error);
};

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { accessToken, setAuth } = useAuthStore();

  const signIn = useMutation({
    mutationFn: authService.firebaseSignIn,
    onSuccess: (tokens) => {
      setAuth(tokens);
      navigate("/", { replace: true });
    },
    onError: (error) => {
      // A user-cancelled popup isn't worth a red toast.
      if (error instanceof FirebaseError && error.code.includes("popup")) return;
      toast.error(firebaseErrorMessage(error));
    },
  });

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GiftIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">RewardHub Admin</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage the platform</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Continue with your administrator Google account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={signIn.isPending}
              onClick={() => signIn.mutate()}
            >
              {signIn.isPending ? (
                "Signing in…"
              ) : (
                <>
                  <GoogleGlyph /> Continue with Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Only accounts with the ADMIN or SUPER_ADMIN role can access this dashboard.
        </p>
      </div>
    </div>
  );
};
