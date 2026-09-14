import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Activity, Database, ShieldCheck, HardDrive, Server, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

function StatusRow({ label, value, icon: Icon }) {
  const ok = value === "operational";
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-slate-500" /><span className="font-medium text-slate-900">{label}</span></div>
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}<span className="capitalize">{value}</span>
      </span>
    </div>
  );
}

export default function SystemHealth() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system-health"], queryFn: async () => (await api.get("/platform/health")).data,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div>
      <PageHeader title="System Health" subtitle={`Last checked: ${new Date(data.checked_at).toLocaleString()}`}>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2" data-testid="refresh-health"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</Button>
      </PageHeader>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-2">Services</h3>
          <StatusRow label="Database" value={data.database} icon={Database} />
          <StatusRow label="Authentication" value={data.authentication} icon={ShieldCheck} />
          <StatusRow label="Object Storage" value={data.storage} icon={HardDrive} />
          <StatusRow label="API / System" value={data.api} icon={Server} />
        </div>
        <div className="grid grid-cols-2 gap-4 content-start">
          <StatCard label="Schools" value={data.collections.schools} icon={Server} accent="text-indigo-600" />
          <StatCard label="Users" value={data.collections.users} icon={Activity} accent="text-indigo-600" />
          <StatCard label="Audit Records" value={data.collections.audit_logs} icon={Activity} />
          <StatCard label="Error Events" value={data.error_count} icon={AlertTriangle} accent={data.error_count ? "text-amber-600" : "text-emerald-600"} />
        </div>
      </div>
    </div>
  );
}
