import { NavLink } from "react-router-dom";
import {
  ChartBarIcon,
  BanknotesIcon,
  BellIcon,
  CheckBadgeIcon,
  Cog6ToothIcon,
  FireIcon,
  HomeIcon,
  MegaphoneIcon,
  UsersIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/campaigns", label: "Campaigns", icon: MegaphoneIcon },
  { to: "/hot-offers", label: "Hot Offers", icon: FireIcon },
  { to: "/claims", label: "Claims", icon: CheckBadgeIcon },
  { to: "/users", label: "Users", icon: UsersIcon },
  { to: "/wallet", label: "Wallet", icon: BanknotesIcon },
  { to: "/notifications", label: "Notifications", icon: BellIcon },
  { to: "/analytics", label: "Analytics", icon: ChartBarIcon },
  { to: "/settings", label: "Settings", icon: Cog6ToothIcon },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps): JSX.Element => (
  <div className="flex h-full flex-col">
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GiftIcon className="h-5 w-5" />
      </div>
      <span className="text-base font-semibold tracking-tight">RewardHub</span>
    </div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
    <div className="border-t p-4">
      <p className="text-xs text-muted-foreground">RewardHub Admin v0.1</p>
    </div>
  </div>
);
