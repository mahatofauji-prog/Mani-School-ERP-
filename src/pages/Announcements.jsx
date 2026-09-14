import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Loader2, Trash2 } from "lucide-react";

const empty = { title: "", message: "", priority: "normal", target_type: "all", school_ids: [], start_date: "", expiry_date: "" };
const P_COLOR = { high: "bg-red-50 text-red-700 border-red-200", normal: "bg-blue-50 text-blue-700 border-blue-200", low: "bg-slate-100 text-slate-600 border-slate-200" };

export default function Announcements() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { data: list = [], isLoading } = useQuery({ queryKey: ["announcements"], queryFn: async () => (await api.get("/announcements")).data });
  const { data: schools = [] } = useQuery({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools")).data });

  const createMut = useMutation({
    mutationFn: async (payload) => (await api.post("/announcements", payload)).data,
    onSuccess: () => { toast.success("Announcement published"); qc.invalidateQueries({ queryKey: ["announcements"] }); setOpen(false); setForm(empty); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/announcements/${id}`)).data,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["announcements"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSchool = (id) => setForm((f) => ({ ...f, school_ids: f.school_ids.includes(id) ? f.school_ids.filter((x) => x !== id) : [...f.school_ids, id] }));

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Publish platform-wide or targeted announcements">
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2" data-testid="add-announcement-button"><Plus className="h-4 w-4" /> New</Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="Create your first announcement." />
      ) : (
        <div className="space-y-3" data-testid="announcements-list">
          {list.map((a) => (
            <div key={a.id} className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-slate-900">{a.title}</h3>
                    <span className={`text-xs font-medium border rounded-full px-2 py-0.5 capitalize ${P_COLOR[a.priority] || P_COLOR.normal}`}>{a.priority}</span>
                    <span className="text-xs text-muted-foreground">· {a.target_type === "all" ? "All schools" : `${a.school_ids?.length || 0} school(s)`}</span>
                    {a.status !== "active" && <span className="text-xs text-muted-foreground">· {a.status}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setConfirmTarget(a)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Announcement</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="ann-title-input" /></div>
            <div className="space-y-1.5"><Label>Message *</Label><Textarea required value={form.message} onChange={(e) => set("message", e.target.value)} data-testid="ann-message-input" rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Target</Label>
                <Select value={form.target_type} onValueChange={(v) => set("target_type", v)}>
                  <SelectTrigger data-testid="ann-target-select"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All schools</SelectItem><SelectItem value="selected">Selected schools</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.target_type === "selected" && (
              <div>
                <Label className="text-sm">Choose schools</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {schools.map((s) => (
                    <button type="button" key={s.id} onClick={() => toggleSchool(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.school_ids.includes(s.id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-border"}`}>{s.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-announcement-button">{createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title="Delete announcement?" description="This removes it for all recipients." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
