import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { StatCard, StatusBadge, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Building2, Users, GraduationCap, Baby, Layers, Grid3x3, BookOpen, UserCog,
  Loader2, Power, KeyRound, Plus, Mail, Phone, MapPin, Calendar,
} from "lucide-react";

export default function SchoolDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addAdmin, setAddAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [pwTarget, setPwTarget] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [confirmStatus, setConfirmStatus] = useState(null);

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", id], queryFn: async () => (await api.get(`/schools/${id}`)).data,
  });

  const statusMut = useMutation({
    mutationFn: async (status) => (await api.patch(`/schools/${id}/status`, { status })).data,
    onSuccess: () => { toast.success("School status updated"); qc.invalidateQueries({ queryKey: ["school", id] }); setConfirmStatus(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmStatus(null); },
  });
  const addAdminMut = useMutation({
    mutationFn: async (payload) => (await api.post(`/schools/${id}/admins`, payload)).data,
    onSuccess: () => { toast.success("School Admin created"); qc.invalidateQueries({ queryKey: ["school", id] }); setAddAdmin(false); setAdminForm({ name: "", email: "", password: "", phone: "" }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const disableMut = useMutation({
    mutationFn: async ({ uid, status }) => (await api.patch(`/users/${uid}/status`, { status })).data,
    onSuccess: () => { toast.success("Admin updated"); qc.invalidateQueries({ queryKey: ["school", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const pwMut = useMutation({
    mutationFn: async ({ uid, password }) => (await api.post(`/users/${uid}/reset-password`, { password })).data,
    onSuccess: () => { toast.success("Password reset"); setPwTarget(null); setNewPw(""); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!school) return <EmptyState icon={Building2} title="School not found" />;

  const stats = [
    { label: "Students", value: school.students, icon: Users },
    { label: "Teachers", value: school.teachers, icon: GraduationCap },
    { label: "Parents", value: school.parents, icon: Baby },
    { label: "Classes", value: school.classes, icon: Layers },
    { label: "Sections", value: school.sections, icon: Grid3x3 },
    { label: "Subjects", value: school.subjects, icon: BookOpen },
  ];

  return (
    <div>
      <button onClick={() => navigate("/app/schools")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-slate-900 mb-4" data-testid="back-to-schools">
        <ArrowLeft className="h-4 w-4" /> Back to Schools
      </button>

      <div className="bg-white border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0"><Building2 className="h-7 w-7 text-indigo-600" /></div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-slate-900">{school.name}</h1>
                <StatusBadge status={school.status} />
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{school.code}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-muted-foreground">
                {school.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {school.email}</span>}
                {school.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {school.phone}</span>}
                {(school.city || school.state) && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {[school.city, school.state].filter(Boolean).join(", ")}</span>}
                {school.academic_year && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {school.academic_year}</span>}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {school.board && <span>Board: <b className="text-slate-700">{school.board}</b></span>}
                <span>Plan: <b className="text-slate-700">{school.subscription?.plan || "—"}</b></span>
                {school.principal_name && <span>Principal: <b className="text-slate-700">{school.principal_name}</b></span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {school.status !== "active"
              ? <Button onClick={() => statusMut.mutate("active")} className="bg-emerald-600 hover:bg-emerald-700 gap-2" data-testid="reactivate-school"><Power className="h-4 w-4" /> Reactivate</Button>
              : <Button onClick={() => setConfirmStatus("suspended")} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" data-testid="suspend-school"><Power className="h-4 w-4" /> Suspend</Button>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent="text-indigo-600" />)}
      </div>

      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2"><UserCog className="h-5 w-5 text-indigo-600" /> School Administrators</h3>
          <Button size="sm" onClick={() => setAddAdmin(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2" data-testid="add-admin-button"><Plus className="h-4 w-4" /> Add Admin</Button>
        </div>
        {school.admins?.length ? (
          <div className="divide-y divide-border" data-testid="admins-list">
            {school.admins.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium text-slate-900 flex items-center gap-2">{a.name} <StatusBadge status={a.status} /></div>
                  <div className="text-sm text-muted-foreground">{a.email}{a.phone ? ` · ${a.phone}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setPwTarget(a); setNewPw(""); }} className="gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Reset</Button>
                  <Button size="sm" variant="outline" onClick={() => disableMut.mutate({ uid: a.id, status: a.status === "active" ? "suspended" : "active" })}>{a.status === "active" ? "Disable" : "Enable"}</Button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No administrators yet.</p>}
      </div>

      <Dialog open={addAdmin} onOpenChange={setAddAdmin}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Add School Admin</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addAdminMut.mutate(adminForm); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input required value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} data-testid="new-admin-name" /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input required type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} data-testid="new-admin-email" /></div>
            <div className="space-y-1.5"><Label>Password *</Label><Input required value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} data-testid="new-admin-password" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddAdmin(false)}>Cancel</Button>
              <Button type="submit" disabled={addAdminMut.isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-admin-button">{addAdminMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Reset password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">New password for <b>{pwTarget?.name}</b>.</p>
          <Input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" data-testid="admin-pw-input" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>Cancel</Button>
            <Button disabled={pwMut.isPending || newPw.length < 6} className="bg-indigo-600 hover:bg-indigo-700" onClick={() => pwMut.mutate({ uid: pwTarget.id, password: newPw })} data-testid="admin-pw-submit">{pwMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmStatus} onOpenChange={(o) => !o && setConfirmStatus(null)}
        title={`Suspend ${school.name}?`} description="All users of this school will be blocked from logging in until you reactivate it. No data is deleted."
        confirmLabel="Suspend" loading={statusMut.isPending} onConfirm={() => statusMut.mutate("suspended")} />
    </div>
  );
}
