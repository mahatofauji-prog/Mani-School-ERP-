import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Layers, Users, Loader2, BookOpen, ArrowRight } from "lucide-react";

export default function MyClasses() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["my-classes"], queryFn: async () => (await api.get("/classroom/my-classes")).data });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const classes = data?.classes || [];

  return (
    <div>
      <PageHeader title="My Classes" subtitle="Classes, sections and subjects assigned to you" />
      {data?.subjects?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> My Subjects:</span>
          {data.subjects.map((s, i) => <span key={i} className="text-xs bg-secondary px-2.5 py-1 rounded-full font-medium">{s}</span>)}
        </div>
      )}
      {classes.length === 0 ? (
        <EmptyState icon={Layers} title="No classes assigned" description="Your school admin has not assigned any classes to you yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="my-classes-grid">
          {classes.map((c) => (
            <div key={c.class_id} className="bg-white border border-border rounded-lg p-6 transition-transform hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Layers className="h-5 w-5 text-primary" /></div>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {c.students}</span>
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900">{c.class_name}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.sections.length ? c.sections.map((s) => <span key={s.id} className="text-xs bg-secondary px-2 py-0.5 rounded-full">Sec {s.name}</span>) : <span className="text-xs text-muted-foreground">No sections</span>}
              </div>
              <button onClick={() => navigate("/app/students")} className="mt-4 text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">View students <ArrowRight className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
