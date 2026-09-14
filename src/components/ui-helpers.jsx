import React from "react";

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-border rounded-lg bg-white" data-testid="empty-state">
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-display font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "text-primary" }) {
  return (
    <div className="bg-white border border-border rounded-lg p-5 transition-transform hover:-translate-y-1 hover:shadow-lg" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">{label}</span>
        {Icon && <Icon className={`h-5 w-5 ${accent}`} />}
      </div>
      <div className="mt-3 text-3xl font-display font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    suspended: "bg-amber-50 text-amber-700 border-amber-200",
    archived: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] || map.inactive}`}>
      {status}
    </span>
  );
}
