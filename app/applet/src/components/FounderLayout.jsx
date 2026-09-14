import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FOUNDER_NAV } from "@/lib/nav";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck, LogOut, Menu, Search, Building2, User as UserIcon } from "lucide-react";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-100 bg-white">
      <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <ShieldCheck className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="font-bold text-slate-900 text-lg tracking-tight">MANI ERP</div>
        <div className="text-[10px] text-slate-500 tracking-wide">Founder / Super Admin</div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-4 px-3 py-4" data-testid="founder-sidebar-nav">
      {FOUNDER_NAV.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.title}</div>
          )}
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/platform/search?q=${encodeURIComponent(q.trim())}`);
        setResults(data);
        setOpen(true);
      } catch { setResults(null); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results && setOpen(true)}
        placeholder="Search schools, admins, users…" className="pl-9 h-10 bg-slate-50 border-slate-200" data-testid="global-search-input" />
      {open && results && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto" data-testid="global-search-results">
          {results.schools.length === 0 && results.users.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No matches found.</div>
          )}
          {results.schools.map((s) => (
            <Link key={s.id} to={`/app/schools/${s.id}`} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-sm">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">· {s.code} · {s.city}</span>
            </Link>
          ))}
          {results.users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-sm">
              <UserIcon className="h-4 w-4 text-slate-500" />
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-muted-foreground">· {u.role?.replace("_", " ")} · {u.school_name || "Platform"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FounderLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (user?.name || "F").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const handleLogout = async () => { await logout(); navigate("/login", { replace: true }); };
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800">
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
        <div className="p-4 border-t border-slate-100">
          <Button variant="ghost" onClick={handleLogout} data-testid="logout-button"
            className="w-full justify-start gap-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            <LogOut className="h-5 w-5" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-8 sticky top-0 z-20 shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon" data-testid="mobile-menu-button"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-white w-64 border-r border-slate-200 overflow-y-auto">
              <Brand />
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
              <div className="p-4 border-t border-slate-100">
                <Button variant="ghost" onClick={handleLogout}
                  className="w-full justify-start gap-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                  <LogOut className="h-5 w-5" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="hidden sm:block flex-1"><GlobalSearch /></div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="hidden md:inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">PLATFORM OWNER</span>
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-slate-900" data-testid="header-username">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
