import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCard, PageHeader } from "@/components/ui-helpers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Layers, Users, BookOpen, Video, ClipboardList, CalendarCheck, Megaphone,
  Loader2, Plus, ArrowRight,
} from "lucide-react";

const QUICK = [
  { to: "/app/attendance", label: "Take Attendance", icon: CalendarCheck },
  { to: "/app/homework", label: "Add Homework", icon: ClipboardList },
  { to: "/app/materials", label: "Upload Material", icon: BookOpen },
  { to: "/app/videos", label: "Share Video", icon: Video },
  { to: "/app/my-classes", label: "My Classes", icon: Layers },
  { to: "/app/students", label: "View Students", icon: Users },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await api.get("/dashboard/stats")).data });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const stats = data || {};
  const initials = (user?.name || "T").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      <div className="bg-white border border-border rounded-lg p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="h-14 w-14"><AvatarFallback className="bg-primary text-white text-lg font-semibold">{initials}</AvatarFallback></Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-slate-900">Welcome, {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">{user?.school_name || "Your School"} · {today}</p>
          {stats.subjects?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stats.subjects.map((s, i) => <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{s}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={stats.my_classes ?? stats.classes ?? 0} icon={Layers} />
        <StatCard label="My Students" value={stats.my_students ?? stats.students ?? 0} icon={Users} />
        <StatCard label="Homework Posted" value={stats.my_homework ?? 0} icon={ClipboardList} />
        <StatCard label="Materials" value={stats.my_materials ?? 0} icon={BookOpen} />
        <StatCard label="Videos Shared" value={stats.my_videos ?? 0} icon={Video} />
        <StatCard label="My Subjects" value={stats.my_subjects ?? 0} icon={BookOpen} />
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground mt-8 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="quick-actions">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <button key={q.to} onClick={() => navigate(q.to)} data-testid={`quick-${q.label.toLowerCase().replace(/\s+/g, "-")}`}
              className="bg-white border border-border rounded-lg p-4 flex flex-col items-center gap-2 text-center transition-transform hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
              <span className="text-xs font-medium text-slate-700">{q.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-border rounded-lg p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-900">Recent Homework</h3>
          <button onClick={() => navigate("/app/homework")} className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">View all <ArrowRight className="h-4 w-4" /></button>
        </div>
        {stats.recent_homework?.length ? (
          <ul className="divide-y divide-border">
            {stats.recent_homework.map((h) => (
              <li key={h.id} className="py-2.5">
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><span className="font-medium text-slate-900">{h.title}</span>{h.subject && <span className="text-xs text-muted-foreground">· {h.subject}</span>}</div>
                {h.due_date && <div className="text-xs text-muted-foreground ml-6">Due {h.due_date}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No homework posted yet.</p>
            <button onClick={() => navigate("/app/homework")} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"><Plus className="h-4 w-4" /> Add your first homework</button>
          </div>
        )}
      </div>
    </div>
  );
}
