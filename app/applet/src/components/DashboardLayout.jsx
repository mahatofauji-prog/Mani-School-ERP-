import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NAV, ROLE_LABELS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap, LogOut, Menu } from "lucide-react";

function SidebarContent({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4" data-testid="sidebar-nav">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            onClick={onNavigate}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-100 bg-white">
      <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <div className="h-4 w-4 border-2 border-white rounded-full"></div>
      </div>
      <div className="leading-tight">
        <div className="font-bold text-slate-900 text-lg tracking-tight">MANI ERP</div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allItems = NAV[user?.role] || [];
  const enabled = user?.enabled_modules;
  const items = allItems.filter((it) => {
    if (it.module && enabled && !enabled.includes(it.module)) return false;
    if (it.flag && !user?.[it.flag]) return false;
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <SidebarContent items={items} />
        </div>
        <div className="p-4 border-t border-slate-100">
          <Button variant="ghost" onClick={handleLogout} data-testid="logout-button"
            className="w-full justify-start gap-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            <LogOut className="h-5 w-5" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon" data-testid="mobile-menu-button">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-white w-64 border-r border-slate-200">
                <Brand />
                <SidebarContent items={items} onNavigate={() => setMobileOpen(false)} />
                <div className="p-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={handleLogout}
                    className="w-full justify-start gap-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                    <LogOut className="h-5 w-5" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm hidden sm:inline">Role:</span>
              <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded text-sm text-slate-700">
                {ROLE_LABELS[user?.role] || 'User'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-slate-900" data-testid="header-username">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
