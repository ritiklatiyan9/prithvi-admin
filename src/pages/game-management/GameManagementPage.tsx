import { lazy, Suspense } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AdjustmentsHorizontalIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  ClockIcon,
  CreditCardIcon,
  QueueListIcon,
  ServerStackIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth.store";

const loadOverview = () => import("./GameOverview");
const loadRooms = () => import("./LiveRooms");
const loadMatches = () => import("./MatchHistory");
const loadPlayers = () => import("./GamePlayers");
const loadModeration = () => import("./CommunicationModeration");
const loadSubscriptions = () => import("./SubscriptionAnalytics");
const loadConfiguration = () => import("./GameConfiguration");
const loadMonitoring = () => import("./TechnicalMonitoring");
const loadAudit = () => import("./GameAuditLogs");

const GameOverview = lazy(async () => ({
  default: (await loadOverview()).GameOverview,
}));
const LiveRooms = lazy(async () => ({
  default: (await loadRooms()).LiveRooms,
}));
const MatchHistory = lazy(async () => ({
  default: (await loadMatches()).MatchHistory,
}));
const GamePlayers = lazy(async () => ({
  default: (await loadPlayers()).GamePlayers,
}));
const CommunicationModeration = lazy(async () => ({
  default: (await loadModeration()).CommunicationModeration,
}));
const SubscriptionAnalytics = lazy(async () => ({
  default: (await loadSubscriptions()).SubscriptionAnalytics,
}));
const GameConfiguration = lazy(async () => ({
  default: (await loadConfiguration()).GameConfiguration,
}));
const TechnicalMonitoring = lazy(async () => ({
  default: (await loadMonitoring()).TechnicalMonitoring,
}));
const GameAuditLogs = lazy(async () => ({
  default: (await loadAudit()).GameAuditLogs,
}));

const TABS = [
  {
    key: "overview",
    label: "Overview",
    icon: ChartBarSquareIcon,
    load: loadOverview,
  },
  { key: "rooms", label: "Live Rooms", icon: QueueListIcon, load: loadRooms },
  { key: "matches", label: "Matches", icon: ClockIcon, load: loadMatches },
  { key: "players", label: "Players", icon: UsersIcon, load: loadPlayers },
  {
    key: "moderation",
    label: "Moderation",
    icon: ChatBubbleLeftRightIcon,
    load: loadModeration,
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    icon: CreditCardIcon,
    load: loadSubscriptions,
  },
  {
    key: "config",
    label: "Configuration",
    icon: AdjustmentsHorizontalIcon,
    load: loadConfiguration,
  },
  {
    key: "monitoring",
    label: "Monitoring",
    icon: ServerStackIcon,
    load: loadMonitoring,
  },
  { key: "audit", label: "Audit Logs", icon: CircleStackIcon, load: loadAudit },
] as const;

type Section = (typeof TABS)[number]["key"];

const CONTENT: Record<Section, JSX.Element> = {
  overview: <GameOverview />,
  rooms: <LiveRooms />,
  matches: <MatchHistory />,
  players: <GamePlayers />,
  moderation: <CommunicationModeration />,
  subscriptions: <SubscriptionAnalytics />,
  config: <GameConfiguration />,
  monitoring: <TechnicalMonitoring />,
  audit: <GameAuditLogs />,
};

const isSection = (value: string): value is Section =>
  TABS.some((tab) => tab.key === value);

export const GameManagementPage = (): JSX.Element => {
  const { section: routeSection } = useParams<{ section?: string }>();
  const role = useAuthStore((state) => state.user?.role);
  const section = routeSection ?? "overview";

  if (!isSection(section)) {
    return <Navigate to="/game-management/overview" replace />;
  }

  return (
    <div>
      <PageHeader
        title="Game Management"
        description="Live Ludo operations, player safety, subscription health and server configuration."
        actions={
          role === "SUPER_ADMIN" ? (
            <Badge variant="success">Super-admin controls enabled</Badge>
          ) : (
            <Badge variant="outline">Read-only access</Badge>
          )
        }
      />

      <Card className="mb-5 overflow-x-auto p-1.5">
        <div className="flex min-w-max gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                asChild
                size="sm"
                variant={section === tab.key ? "default" : "ghost"}
              >
                <Link
                  to={`/game-management/${tab.key}`}
                  onPointerEnter={() => void tab.load()}
                  onFocus={() => void tab.load()}
                >
                  <Icon className="mr-1.5 h-4 w-4" /> {tab.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </Card>

      <Suspense
        fallback={
          <Card>
            <TableSkeleton rows={7} />
          </Card>
        }
      >
        {CONTENT[section]}
      </Suspense>
    </div>
  );
};
