import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { StatCard, PageHeader, EmptyState } from "@/components/ui-helpers";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  School, Users, GraduationCap, UserCog, Baby, CheckCircle2, PauseCircle,
  XCircle, Sparkles, Activity, Building2, Loader2,
} from "lucide-react";

const RANGES = [
  { key: "today", label: "Today" }, { key: "week", label: "Week" },
  { key: "month", label: "Month" }, { key: "year", label: "Year" }, { key: "all", label: "All time" },
];
const PIE_COLORS = ["#16a34a", "#f59e0b", "#94a3b8", "#6366f1", "#cbd5e1"];

export default function FounderDashboard() {
  const [range, setRange] = useState("month");
  const { data, isLoading } = useQuery({
    queryKey: ["founder-dashboard", range],
    queryFn: async () => (await api.get(`/dashboard/stats?range=${range}`)).data,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  const stats = data || {};
  const pie = Object.entries(stats.status_breakdown || {})
    .filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div>
      <PageHeader title="Platform Overview" subtitle="Global view across every school on the platform">
        <div className="flex flex-wrap gap-1 bg-white border border-border rounded-lg p-1" data-testid="range-filter">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} data-testid={`range-${r.key}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === r.key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-secondary"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Schools" value={stats.total_schools ?? stats.schools ?? 0} icon={School} accent="text-indigo-600" />
        <StatCard label="Active Schools" value={stats.active_schools ?? stats.schools ?? 0} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="Suspended" value={stats.suspended_schools ?? 0} icon={PauseCircle} accent="text-amber-600" />
        <StatCard label="Inactive" value={stats.inactive_schools ?? 0} icon={XCircle} accent="text-slate-400" />
        <StatCard label="Trial Schools" value={stats.trial_schools ?? 0} icon={Sparkles} accent="text-violet-600" />
        <StatCard label={`New (${range})`} value={stats.new_schools ?? 0} icon={Building2} accent="text-indigo-600" />
        <StatCard label="School Admins" value={stats.total_school_admins ?? 0} icon={UserCog} />
        <StatCard label="Total Parents" value={stats.total_parents ?? 0} icon={Baby} />
        <StatCard label="Total Students" value={stats.total_students ?? stats.students ?? 0} icon={Users} />
        <StatCard label="Total Teachers" value={stats.total_teachers ?? stats.teachers ?? 0} icon={GraduationCap} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white border border-border rounded-lg p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Top Schools by Students</h3>
          {(!stats.top_schools || stats.top_schools.every((s) => s.students === 0)) ? (
            <EmptyState icon={School} title="No enrollment data yet" description="Student counts will appear as schools add students." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.top_schools} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Schools by Status</h3>
          {pie.length === 0 ? (
            <EmptyState icon={Activity} title="No schools yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name} (${e.value})`}>
                  {pie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Recently Created Schools</h3>
          {stats.recently_created?.length ? (
            <ul className="divide-y divide-border" data-testid="recent-schools">
              {stats.recently_created.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <Link to={`/app/schools/${s.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-indigo-600">
                    <Building2 className="h-4 w-4 text-indigo-500" /> {s.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No schools yet.</p>}
        </div>
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Platform Activity</h3>
          {stats.recent_activity?.length ? (
            <ul className="space-y-3" data-testid="platform-activity">
              {stats.recent_activity.map((it) => (
                <li key={it.id} className="flex items-start gap-3 text-sm">
                  <Activity className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-900">{it.actor_name}</span>
                    <span className="text-muted-foreground"> · {it.action ? it.action.replace(/[._]/g, " ") : ""}</span>
                    <div className="text-xs text-muted-foreground">{it.timestamp ? new Date(it.timestamp).toLocaleString() : ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
