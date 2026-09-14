import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Megaphone, Loader2 } from "lucide-react";

const P_COLOR = { high: "bg-red-50 text-red-700 border-red-200", normal: "bg-blue-50 text-blue-700 border-blue-200", low: "bg-slate-100 text-slate-600 border-slate-200" };

export default function AnnouncementsFeed() {
  const { data: list = [], isLoading } = useQuery({ queryKey: ["announcements-feed"], queryFn: async () => (await api.get("/announcements")).data });

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Notices from your school and the platform" />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="You're all caught up." />
      ) : (
        <div className="space-y-3" data-testid="feed-list">
          {list.map((a) => (
            <div key={a.id} className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold text-slate-900">{a.title}</h3>
                <span className={`text-xs font-medium border rounded-full px-2 py-0.5 capitalize ${P_COLOR[a.priority] || P_COLOR.normal}`}>{a.priority}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
