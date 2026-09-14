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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Loader2, Trash2, Download, FileText } from "lucide-react";

const TYPES = [
  { v: "note", l: "Note" }, { v: "pdf", l: "PDF" }, { v: "worksheet", l: "Worksheet" },
  { v: "question_paper", l: "Question Paper" }, { v: "presentation", l: "Presentation" },
];

export default function Materials() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ["teacher", "school_admin", "principal"].includes(user?.role);
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const empty = { class_id: "", subject: "", chapter: "", title: "", type: "note", file_path: "" };
  const [form, setForm] = useState(empty);

  const { data: list = [], isLoading } = useQuery({ queryKey: ["materials"], queryFn: async () => (await api.get("/classroom/materials")).data });
  const { data: mc } = useQuery({ queryKey: ["my-classes"], queryFn: async () => (await api.get("/classroom/my-classes")).data, enabled: user?.role === "teacher" });
  const { data: allClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data, enabled: canManage && user?.role !== "teacher" });

  const classOptions = user?.role === "teacher" ? (mc?.classes || []).map((c) => ({ id: c.class_id, name: c.class_name })) : allClasses.map((c) => ({ id: c.id, name: c.name }));
  const subjectOptions = user?.role === "teacher" ? (mc?.subjects || []) : [];

  const createMut = useMutation({
    mutationFn: async (payload) => (await api.post("/classroom/materials", payload)).data,
    onSuccess: () => { toast.success("Material published"); qc.invalidateQueries({ queryKey: ["materials"] }); setOpen(false); setForm(empty); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/classroom/materials/${id}`)).data,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["materials"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upload = async (file) => {
    if (!file) return; setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("file_path", data.path); toast.success("File uploaded");
    } catch (e) { toast.error(apiError(e)); } finally { setUploading(false); }
  };
  const fileUrl = (p) => `${api.defaults.baseURL}/files/${p}`;

  return (
    <div>
      <PageHeader title="Notes & Study Material" subtitle={canManage ? "Publish notes, PDFs and worksheets" : "Study material shared by your teachers"}>
        {canManage && <Button onClick={() => { setForm(empty); setOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2" data-testid="add-material-button"><Plus className="h-4 w-4" /> Upload Material</Button>}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={BookOpen} title="No material yet" description={canManage ? "Upload your first study material." : "Nothing shared yet."} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="materials-list">
          {list.map((m) => (
            <div key={m.id} className="bg-white border border-border rounded-lg p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full capitalize">{m.type.replace("_", " ")}</span>
              </div>
              <h3 className="font-display font-semibold text-slate-900 mt-3">{m.title}</h3>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5 flex-1">
                {m.subject && <div>Subject: {m.subject}</div>}
                {m.chapter && <div>Chapter: {m.chapter}</div>}
                <div>By: {m.teacher_name}</div>
              </div>
              <div className="flex gap-2 mt-3">
                {m.file_path && <a href={fileUrl(m.file_path)} target="_blank" rel="noreferrer" className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> Open</Button></a>}
                {canManage && m.teacher_id === user.id && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmTarget(m)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Upload Study Material</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Class *</Label>
                <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
                  <SelectTrigger data-testid="mat-class-select"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{classOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
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
              <div className="space-y-1.5"><Label>Chapter</Label><Input value={form.chapter} onChange={(e) => set("chapter", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="mat-title-input" /></div>
            <div className="space-y-1.5">
              <Label>File (PDF / image)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif" onChange={(e) => upload(e.target.files[0])} disabled={uploading} data-testid="mat-file-input" />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              {form.file_path && <p className="text-xs text-emerald-600">File uploaded ✓</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || !form.class_id} className="bg-primary hover:bg-primary/90" data-testid="save-material-button">{createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title="Delete material?" description="This removes it for all students." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
