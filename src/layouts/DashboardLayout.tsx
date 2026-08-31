import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useUiStore } from "@/store/ui.store";
import { cn } from "@/utils/cn";

export const DashboardLayout = (): JSX.Element => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    // no bg-background: lets the dark body gradient (index.css) show through
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r bg-card transition-[width] duration-200 ease-in-out lg:block",
          sidebarCollapsed ? "w-[4.5rem]" : "w-60",
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* mobile drawer — always full width, never collapsed */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-60 border-r bg-card shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div
        className={cn(
          "transition-[padding] duration-200 ease-in-out",
          sidebarCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-60",
        )}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
