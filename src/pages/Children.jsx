import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState, StatCard } from "@/components/ui-helpers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Baby, Loader2, ClipboardCheck, CheckCircle2, ClipboardList, Download } from "lucide-react";

export default function Children() {
  const { user } = useAuth();
  const linked = user?.linked_student_ids || [];
  const [selected, setSelected] = useState(null);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["children", linked],
    queryFn: async () => {
      const res = await Promise.all(linked.map((id) => api.get(`/users/${id}`).then((r) => r.data).catch(() => null)));
      return res.filter(Boolean);
    },
    enabled: linked.length > 0,
  });

  useEffect(() => { if (children.length && !selected) setSelected(children[0].id); }, [children, selected]);

  const child = children.find((c) => c.id === selected);

  const { data: attendance = [] } = useQuery({
    queryKey: ["child-attendance", selected],
    queryFn: async () => (await api.get(`/attendance?student_id=${selected}`)).data,
    enabled: !!selected,
  });
  const { data: homework = [] } = useQuery({
    queryKey: ["child-homework", selected],
    queryFn: async () => (await api.get(`/classroom/homework?student_id=${selected}`)).data,
    enabled: !!selected,
  });

  const present = attendance.filter((a) => a.status === "present").length;
  const pct = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  if (linked.length === 0)
    return (
      <div>
        <PageHeader title="My Children" subtitle="Students linked to your account" />
        <EmptyState icon={Baby} title="No children linked" description="Ask your school admin to link your children to your account." />
      </div>
    );

  return (
    <div>
      <PageHeader title="My Children" subtitle="Select a child to view their academics" />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6" data-testid="child-switcher">
            {children.map((c) => {
              const active = c.id === selected;
              const initials = (c.name || "S").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <button key={c.id} onClick={() => setSelected(c.id)} data-testid={`child-tab-${c.email}`}
                  className={`flex items-center gap-2 rounded-full border pl-1.5 pr-4 py-1.5 transition-colors ${active ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-border hover:border-primary/40"}`}>
                  <Avatar className="h-7 w-7"><AvatarFallback className={active ? "bg-white/20 text-white text-xs" : "bg-primary/10 text-primary text-xs"}>{initials}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium">{c.name}</span>
                </button>
              );
            })}
          </div>

          {child && (
            <>
              <div className="bg-white border border-border rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center"><Baby className="h-7 w-7 text-primary" /></div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-slate-900">{child.name}</h2>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 mt-0.5">
                      <span>Roll: {child.roll_number || "—"}</span>
                      <span>Admission: {child.admission_number || "—"}</span>
                      <span className="capitalize">Gender: {child.gender || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard label="Attendance %" value={`${pct}%`} icon={ClipboardCheck} accent="text-emerald-600" />
                <StatCard label="Days Present" value={present} icon={CheckCircle2} />
                <StatCard label="Days Recorded" value={attendance.length} icon={ClipboardList} />
              </div>

              <div className="bg-white border border-border rounded-lg p-6">
                <h3 className="font-display font-semibold text-slate-900 mb-4">Homework</h3>
                {homework.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No homework assigned for this child's class.</p>
                ) : (
                  <ul className="divide-y divide-border" data-testid="child-homework-list">
                    {homework.map((h) => (
                      <li key={h.id} className="py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          <span className="font-medium text-slate-900">{h.title}</span>
                          {h.subject && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{h.subject}</span>}
                          {h.attachment_path && <a href={`${api.defaults.baseURL}/files/${h.attachment_path}`} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1"><Download className="h-3 w-3" /> Attachment</a>}
                        </div>
                        {h.due_date && <div className="text-xs text-muted-foreground ml-6">Due {h.due_date}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
