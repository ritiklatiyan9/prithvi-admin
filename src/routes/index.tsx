import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";

// Route-level code splitting: each page ships as its own chunk.
const lazyPage = <T extends Record<string, ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) =>
  lazy(async () => {
    const module = await loader();
    return { default: module[name] };
  });

const LoginPage = lazyPage(() => import("@/pages/login/LoginPage"), "LoginPage");
const DashboardPage = lazyPage(() => import("@/pages/dashboard/DashboardPage"), "DashboardPage");
const CampaignsPage = lazyPage(() => import("@/pages/campaigns/CampaignsPage"), "CampaignsPage");
const ClaimsPage = lazyPage(() => import("@/pages/claims/ClaimsPage"), "ClaimsPage");
const UsersPage = lazyPage(() => import("@/pages/users/UsersPage"), "UsersPage");
const RedemptionsPage = lazyPage(
  () => import("@/pages/redemptions/RedemptionsPage"),
  "RedemptionsPage",
);
const WalletPage = lazyPage(() => import("@/pages/wallet/WalletPage"), "WalletPage");
const NotificationsPage = lazyPage(
  () => import("@/pages/notifications/NotificationsPage"),
  "NotificationsPage",
);
const AnalyticsPage = lazyPage(() => import("@/pages/analytics/AnalyticsPage"), "AnalyticsPage");
const SettingsPage = lazyPage(() => import("@/pages/settings/SettingsPage"), "SettingsPage");
const HotOffersPage = lazyPage(() => import("@/pages/hot-offers/HotOffersPage"), "HotOffersPage");
const AppOffersPage = lazyPage(() => import("@/pages/app-offers/AppOffersPage"), "AppOffersPage");
const ReferralsPage = lazyPage(() => import("@/pages/referrals/ReferralsPage"), "ReferralsPage");
const AppGraphicsPage = lazyPage(
  () => import("@/pages/app-graphics/AppGraphicsPage"),
  "AppGraphicsPage",
);
const MissionsPage = lazyPage(() => import("@/pages/missions/MissionsPage"), "MissionsPage");

const PageLoader = (): JSX.Element => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
  </div>
);

const withSuspense = (element: JSX.Element): JSX.Element => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const NotFound = (): JSX.Element => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
    <h1 className="text-3xl font-semibold">404</h1>
    <p className="text-muted-foreground">This page doesn't exist.</p>
    <Link to="/" className="text-sm font-medium underline underline-offset-4">
      Back to dashboard
    </Link>
  </div>
);

export const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<LoginPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/", element: withSuspense(<DashboardPage />) },
          { path: "/campaigns", element: withSuspense(<CampaignsPage />) },
          { path: "/claims", element: withSuspense(<ClaimsPage />) },
          { path: "/redemptions", element: withSuspense(<RedemptionsPage />) },
          { path: "/users", element: withSuspense(<UsersPage />) },
          { path: "/referrals", element: withSuspense(<ReferralsPage />) },
          { path: "/wallet", element: withSuspense(<WalletPage />) },
          { path: "/notifications", element: withSuspense(<NotificationsPage />) },
          { path: "/hot-offers", element: withSuspense(<HotOffersPage />) },
          { path: "/app-offers", element: withSuspense(<AppOffersPage />) },
          { path: "/missions", element: withSuspense(<MissionsPage />) },
          { path: "/app-graphics", element: withSuspense(<AppGraphicsPage />) },
          { path: "/analytics", element: withSuspense(<AnalyticsPage />) },
          { path: "/settings", element: withSuspense(<SettingsPage />) },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
