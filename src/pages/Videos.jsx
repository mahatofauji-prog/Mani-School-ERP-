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
import { Video as VideoIcon, Plus, Loader2, Trash2, Play } from "lucide-react";

export default function Videos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ["teacher", "school_admin", "principal"].includes(user?.role);
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const empty = { class_id: "", subject: "", chapter: "", title: "", description: "", url: "" };
  const [form, setForm] = useState(empty);

  const { data: list = [], isLoading } = useQuery({ queryKey: ["videos"], queryFn: async () => (await api.get("/classroom/videos")).data });
  const { data: mc } = useQuery({ queryKey: ["my-classes"], queryFn: async () => (await api.get("/classroom/my-classes")).data, enabled: user?.role === "teacher" });
  const { data: allClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data, enabled: canManage && user?.role !== "teacher" });

  const classOptions = user?.role === "teacher" ? (mc?.classes || []).map((c) => ({ id: c.class_id, name: c.class_name })) : allClasses.map((c) => ({ id: c.id, name: c.name }));
  const subjectOptions = user?.role === "teacher" ? (mc?.subjects || []) : [];

  const createMut = useMutation({
    mutationFn: async (payload) => (await api.post("/classroom/videos", payload)).data,
    onSuccess: () => { toast.success("Video shared"); qc.invalidateQueries({ queryKey: ["videos"] }); setOpen(false); setForm(empty); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/classroom/videos/${id}`)).data,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["videos"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader title="Class Videos" subtitle={canManage ? "Share recorded lectures & educational videos" : "Videos shared by your teachers"}>
        {canManage && <Button onClick={() => { setForm(empty); setOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2" data-testid="add-video-button"><Plus className="h-4 w-4" /> Share Video</Button>}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={VideoIcon} title="No videos yet" description={canManage ? "Share your first class video." : "Nothing shared yet."} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="videos-list">
          {list.map((v) => (
            <div key={v.id} className="bg-white border border-border rounded-lg overflow-hidden flex flex-col">
              <a href={v.url} target="_blank" rel="noreferrer" className="h-32 bg-slate-900 flex items-center justify-center group">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors"><Play className="h-6 w-6 text-white fill-white" /></div>
              </a>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-display font-semibold text-slate-900">{v.title}</h3>
                {v.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
                <div className="text-xs text-muted-foreground mt-2 flex-1">
                  {v.subject && <span>{v.subject}</span>}{v.chapter && <span> · {v.chapter}</span>}<div>By: {v.teacher_name}</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a href={v.url} target="_blank" rel="noreferrer" className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><Play className="h-3.5 w-3.5" /> Watch</Button></a>
                  {canManage && v.teacher_id === user.id && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmTarget(v)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Share Video</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Class *</Label>
                <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
                  <SelectTrigger data-testid="vid-class-select"><SelectValue placeholder="Select" /></SelectTrigger>
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
            <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="vid-title-input" /></div>
            <div className="space-y-1.5"><Label>Video URL * (YouTube / Vimeo / link)</Label><Input required type="url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://youtube.com/watch?v=..." data-testid="vid-url-input" /></div>
            <div className="space-y-1.5"><Label>Chapter</Label><Input value={form.chapter} onChange={(e) => set("chapter", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || !form.class_id} className="bg-primary hover:bg-primary/90" data-testid="save-video-button">{createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Share</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title="Delete video?" description="This removes it for all students." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
