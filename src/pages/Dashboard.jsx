import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCard, PageHeader } from "@/components/ui-helpers";
import { ROLE_LABELS } from "@/lib/nav";
import {
  School, Users, GraduationCap, Layers, BookOpen, Grid3x3, Baby,
  Activity, CheckCircle2, XCircle, ClipboardCheck, Loader2,
} from "lucide-react";

function RecentActivity({ items }) {
  if (!items?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg p-6 mt-6">
      <h3 className="font-display font-semibold text-slate-900 mb-4">Recent Activity</h3>
      <ul className="space-y-3" data-testid="recent-activity">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3 text-sm">
            <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-slate-900">{it.actor_name}</span>
              <span className="text-muted-foreground"> · {it.action.replace(/[._]/g, " ")}</span>
              <div className="text-xs text-muted-foreground">{new Date(it.timestamp).toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard/stats")).data,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const stats = data || {};
  const role = user?.role;
  const grid = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name?.split(" ")[0] || "User"}`} subtitle={`${ROLE_LABELS[role] || "Dashboard"} overview`} />
      <div className={grid}>
        {role === "founder_admin" && (
          <>
            <StatCard label="Total Schools" value={stats.total_schools ?? stats.schools ?? 0} icon={School} />
            <StatCard label="Active Schools" value={stats.active_schools ?? stats.schools ?? 0} icon={CheckCircle2} accent="text-emerald-600" />
            <StatCard label="Inactive Schools" value={stats.inactive_schools ?? 0} icon={XCircle} accent="text-slate-400" />
            <StatCard label="Total Students" value={stats.total_students ?? stats.students ?? 0} icon={Users} />
            <StatCard label="Total Teachers" value={stats.total_teachers ?? stats.teachers ?? 0} icon={GraduationCap} />
          </>
        )}
        {(role === "school_admin" || role === "principal") && (
          <>
            <StatCard label="Students" value={stats.total_students ?? stats.students ?? 0} icon={Users} />
            <StatCard label="Teachers" value={stats.total_teachers ?? stats.teachers ?? 0} icon={GraduationCap} />
            <StatCard label="Parents" value={stats.total_parents ?? 0} icon={Baby} />
            <StatCard label="Classes" value={stats.total_classes ?? stats.classes ?? 0} icon={Layers} />
            <StatCard label="Sections" value={stats.total_sections ?? stats.sections ?? 0} icon={Grid3x3} />
            <StatCard label="Subjects" value={stats.total_subjects ?? 0} icon={BookOpen} />
          </>
        )}
        {role === "teacher" && (
          <>
            <StatCard label="My Classes" value={stats.my_classes ?? stats.classes ?? 0} icon={Layers} />
            <StatCard label="My Students" value={stats.my_students ?? stats.students ?? 0} icon={Users} />
            <StatCard label="My Subjects" value={stats.my_subjects ?? 0} icon={BookOpen} />
          </>
        )}
        {role === "student" && (
          <>
            <StatCard label="Attendance %" value={`${stats.attendance_pct ?? 0}%`} icon={ClipboardCheck} accent="text-emerald-600" />
            <StatCard label="Days Present" value={stats.attendance_present ?? 0} icon={CheckCircle2} />
            <StatCard label="Days Recorded" value={stats.attendance_total ?? 0} icon={Activity} />
          </>
        )}
        {role === "parent" && (
          <StatCard label="Children Linked" value={stats.children ?? 0} icon={Baby} />
        )}
      </div>
      {(role === "founder_admin" || role === "school_admin" || role === "principal") && (
        <RecentActivity items={stats.recent_activity} />
      )}
    </div>
  );
}
