import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Loader2, Trash2, Paperclip, Download } from "lucide-react";

const PRIORITY = { high: "bg-red-50 text-red-700 border-red-200", normal: "bg-blue-50 text-blue-700 border-blue-200", low: "bg-slate-100 text-slate-600 border-slate-200" };

export default function Homework() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ["teacher", "school_admin", "principal"].includes(user?.role);
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const empty = { class_id: "", section_id: "", subject: "", title: "", description: "", instructions: "", due_date: "", priority: "normal", attachment_path: "" };
  const [form, setForm] = useState(empty);

  const { data: list = [], isLoading } = useQuery({ queryKey: ["homework"], queryFn: async () => (await api.get("/classroom/homework")).data });
  const { data: mc } = useQuery({ queryKey: ["my-classes"], queryFn: async () => (await api.get("/classroom/my-classes")).data, enabled: user?.role === "teacher" });
  const { data: allClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data, enabled: canManage && user?.role !== "teacher" });

  const classOptions = user?.role === "teacher"
    ? (mc?.classes || []).map((c) => ({ id: c.class_id, name: c.class_name }))
    : allClasses.map((c) => ({ id: c.id, name: c.name }));
  const subjectOptions = user?.role === "teacher" ? (mc?.subjects || []) : [];

  const createMut = useMutation({
    mutationFn: async (payload) => (await api.post("/classroom/homework", payload)).data,
    onSuccess: () => { toast.success("Homework posted"); qc.invalidateQueries({ queryKey: ["homework"] }); setOpen(false); setForm(empty); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/classroom/homework/${id}`)).data,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["homework"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("attachment_path", data.path);
      toast.success("Attachment uploaded");
    } catch (e) { toast.error(apiError(e)); } finally { setUploading(false); }
  };
  const fileUrl = (p) => `${api.defaults.baseURL}/files/${p}`;

  return (
    <div>
      <PageHeader title="Homework" subtitle={canManage ? "Assign homework to your classes" : "Homework from your teachers"}>
        {canManage && <Button onClick={() => { setForm(empty); setOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2" data-testid="add-homework-button"><Plus className="h-4 w-4" /> Add Homework</Button>}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No homework yet" description={canManage ? "Post homework for your students." : "Nothing assigned right now."} />
      ) : (
        <div className="space-y-3" data-testid="homework-list">
          {list.map((h) => (
            <div key={h.id} className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-slate-900">{h.title}</h3>
                    {h.subject && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{h.subject}</span>}
                    <span className={`text-xs font-medium border rounded-full px-2 py-0.5 capitalize ${PRIORITY[h.priority] || PRIORITY.normal}`}>{h.priority}</span>
                  </div>
                  {h.description && <p className="text-sm text-muted-foreground mt-1">{h.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {h.due_date && <span>Due: <b className="text-slate-700">{h.due_date}</b></span>}
                    <span>By: {h.teacher_name}</span>
                    {h.attachment_path && <a href={fileUrl(h.attachment_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-medium"><Download className="h-3.5 w-3.5" /> Attachment</a>}
                  </div>
                </div>
                {canManage && h.teacher_id === user.id && <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setConfirmTarget(h)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add Homework</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Class *</Label>
                <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
                  <SelectTrigger data-testid="hw-class-select"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{classOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Subject</Label>
                {subjectOptions.length ? (
                  <Select value={form.subject} onValueChange={(v) => set("subject", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{subjectOptions.map((s, i) => <SelectItem key={i} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} />}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="hw-title-input" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Attachment (PDF / image)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif" onChange={(e) => upload(e.target.files[0])} disabled={uploading} data-testid="hw-file-input" />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              {form.attachment_path && <p className="text-xs text-emerald-600 flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attached</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || !form.class_id} className="bg-primary hover:bg-primary/90" data-testid="save-homework-button">{createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title="Delete homework?" description="This removes it for all students." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
