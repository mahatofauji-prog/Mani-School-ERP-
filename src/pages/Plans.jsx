import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MODULE_LABELS, ALL_MODULES } from "@/lib/nav";
import { CreditCard, Plus, Loader2, Trash2, Check } from "lucide-react";

const empty = { name: "", max_students: 100, max_teachers: 10, max_parents: 100, max_classes: 10, storage_limit_mb: 500, modules: [...ALL_MODULES], status: "active" };

export default function Plans() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { data: plans = [], isLoading } = useQuery({ queryKey: ["plans"], queryFn: async () => (await api.get("/plans")).data });

  const saveMut = useMutation({
    mutationFn: async (payload) => editId ? (await api.put(`/plans/${editId}`, payload)).data : (await api.post("/plans", payload)).data,
    onSuccess: () => { toast.success(editId ? "Plan updated" : "Plan created"); qc.invalidateQueries({ queryKey: ["plans"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/plans/${id}`)).data,
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["plans"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ ...empty, ...p, modules: p.modules || [] }); setOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleMod = (m) => setForm((f) => ({ ...f, modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m] }));

  return (
    <div>
      <PageHeader title="Subscription Plans" subtitle="Define plans, limits and included modules">
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 gap-2" data-testid="add-plan-button"><Plus className="h-4 w-4" /> New Plan</Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans yet" description="Create a subscription plan to assign to schools." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="plans-grid">
          {plans.map((p) => (
            <div key={p.id} className="bg-white border border-border rounded-lg p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-slate-900">{p.name}</h3>
                <CreditCard className="h-5 w-5 text-indigo-500" />
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground flex-1">
                <li>Students: <b className="text-slate-700">{p.max_students}</b></li>
                <li>Teachers: <b className="text-slate-700">{p.max_teachers}</b></li>
                <li>Parents: <b className="text-slate-700">{p.max_parents}</b></li>
                <li>Classes: <b className="text-slate-700">{p.max_classes}</b></li>
                <li>Storage: <b className="text-slate-700">{p.storage_limit_mb} MB</b></li>
                <li>Modules: <b className="text-slate-700">{p.modules?.length || 0}</b></li>
              </ul>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)} data-testid={`edit-plan-${p.name}`}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmTarget(p)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editId ? "Edit Plan" : "New Plan"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Plan Name *</Label><Input required value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="plan-name-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              {[["max_students", "Max Students"], ["max_teachers", "Max Teachers"], ["max_parents", "Max Parents"], ["max_classes", "Max Classes"], ["storage_limit_mb", "Storage (MB)"]].map(([k, l]) => (
                <div key={k} className="space-y-1.5"><Label>{l}</Label><Input type="number" value={form[k]} onChange={(e) => set(k, parseInt(e.target.value) || 0)} /></div>
              ))}
            </div>
            <div>
              <Label className="text-sm">Included Modules</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_MODULES.map((m) => (
                  <button type="button" key={m} onClick={() => toggleMod(m)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${form.modules.includes(m) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-border"}`}>
                    {form.modules.includes(m) && <Check className="h-3 w-3" />}{MODULE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMut.isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-plan-button">{saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`Delete ${confirmTarget?.name} plan?`} description="Schools already assigned keep their settings." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
