import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fingerprint, Plus, Loader2, Trash2, Cpu, Users, Activity } from "lucide-react";

const DEV_ST = { active: "bg-emerald-50 text-emerald-700", inactive: "bg-slate-100 text-slate-600", disconnected: "bg-amber-50 text-amber-700" };

export default function Biometric() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("devices");
  const [addOpen, setAddOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [dev, setDev] = useState({ name: "", device_id: "", location: "" });
  const [enrollStudent, setEnrollStudent] = useState("");

  const { data: status } = useQuery({ queryKey: ["bio-status"], queryFn: async () => (await api.get("/biometric/status")).data });
  const { data: devices = [], isLoading } = useQuery({ queryKey: ["bio-devices"], queryFn: async () => (await api.get("/biometric/devices")).data });
  const { data: enrollments = [] } = useQuery({ queryKey: ["bio-enrollments"], queryFn: async () => (await api.get("/biometric/enrollments")).data });
  const { data: students = [] } = useQuery({ queryKey: ["users", "student"], queryFn: async () => (await api.get("/users?role=student")).data });

  const addMut = useMutation({
    mutationFn: async (p) => (await api.post("/biometric/devices", p)).data,
    onSuccess: () => { toast.success("Device registered"); qc.invalidateQueries({ queryKey: ["bio-devices"] }); qc.invalidateQueries({ queryKey: ["bio-status"] }); setAddOpen(false); setDev({ name: "", device_id: "", location: "" }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const statusMut = useMutation({
    mutationFn: async ({ id, status }) => (await api.patch(`/biometric/devices/${id}`, { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bio-devices"] }); qc.invalidateQueries({ queryKey: ["bio-status"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/biometric/devices/${id}`)).data,
    onSuccess: () => { toast.success("Device removed"); qc.invalidateQueries({ queryKey: ["bio-devices"] }); qc.invalidateQueries({ queryKey: ["bio-status"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const enrollMut = useMutation({
    mutationFn: async (student_id) => (await api.post("/biometric/enroll", { student_id })).data,
    onSuccess: () => { toast.success("Student enrolled"); qc.invalidateQueries({ queryKey: ["bio-enrollments"] }); qc.invalidateQueries({ queryKey: ["bio-status"] }); setEnrollOpen(false); setEnrollStudent(""); },
    onError: (e) => toast.error(apiError(e)),
  });
  const unenrollMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/biometric/enroll/${id}`)).data,
    onSuccess: () => { toast.success("Enrolment removed"); qc.invalidateQueries({ queryKey: ["bio-enrollments"] }); qc.invalidateQueries({ queryKey: ["bio-status"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const stat = [
    { label: "Devices", value: status?.devices ?? 0, icon: Cpu },
    { label: "Active", value: status?.active_devices ?? 0, icon: Activity },
    { label: "Enrolled Students", value: status?.enrolled_students ?? 0, icon: Users },
  ];

  return (
    <div>
      <PageHeader title="Biometric Attendance" subtitle="Manage biometric devices and student enrolment">
        {tab === "devices"
          ? <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 gap-2" data-testid="add-device-button"><Plus className="h-4 w-4" /> Register Device</Button>
          : <Button onClick={() => setEnrollOpen(true)} className="bg-primary hover:bg-primary/90 gap-2" data-testid="enroll-student-button"><Plus className="h-4 w-4" /> Enrol Student</Button>}
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6" data-testid="biometric-stats">
        {stat.map((s) => { const Icon = s.icon; return (
          <div key={s.label} className="bg-white border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
            <div><div className="text-2xl font-display font-bold text-slate-900">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
          </div>
        ); })}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("devices")} data-testid="tab-devices" className={`px-4 py-2 rounded-md text-sm font-medium border ${tab === "devices" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border"}`}>Devices</button>
        <button onClick={() => setTab("enrollments")} data-testid="tab-enrollments" className={`px-4 py-2 rounded-md text-sm font-medium border ${tab === "enrollments" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border"}`}>Enrolled Students</button>
      </div>

      {tab === "devices" ? (
        isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : devices.length === 0 ? <EmptyState icon={Fingerprint} title="No devices" description="Register a biometric device to begin syncing attendance." />
        : <div className="space-y-3" data-testid="devices-list">{devices.map((d) => (
            <div key={d.id} className="bg-white border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div><div className="font-medium text-slate-900">{d.name}</div><div className="text-xs text-muted-foreground font-mono">{d.device_id}{d.location ? ` · ${d.location}` : ""}{d.last_sync ? ` · last sync ${new Date(d.last_sync).toLocaleString()}` : ""}</div></div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${DEV_ST[d.status] || DEV_ST.inactive}`}>{d.status}</span>
                <Select value={d.status} onValueChange={(v) => statusMut.mutate({ id: d.id, status: v })}><SelectTrigger className="w-32 h-8 text-xs" data-testid={`device-status-${d.device_id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="disconnected">Disconnected</SelectItem></SelectContent></Select>
                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => delMut.mutate(d.id)} data-testid={`delete-device-${d.device_id}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}</div>
      ) : (
        enrollments.length === 0 ? <EmptyState icon={Users} title="No enrolments" description="Enrol students to map their biometric identity." />
        : <div className="space-y-2" data-testid="enrollments-list">{enrollments.map((e) => (
            <div key={e.id} className="bg-white border border-border rounded-lg p-4 flex items-center justify-between">
              <div><div className="font-medium text-slate-900">{e.student_name}</div><div className="text-xs text-emerald-600 capitalize">{e.status}</div></div>
              <Button size="sm" variant="outline" className="text-destructive gap-1.5" onClick={() => unenrollMut.mutate(e.id)} data-testid={`unenroll-${e.id}`}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
            </div>
          ))}</div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Register Biometric Device</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(dev); }} className="space-y-4">
          <div className="space-y-1.5"><Label>Device Name *</Label><Input required value={dev.name} onChange={(e) => setDev({ ...dev, name: e.target.value })} data-testid="device-name-input" placeholder="Main Gate Scanner" /></div>
          <div className="space-y-1.5"><Label>Device ID *</Label><Input required value={dev.device_id} onChange={(e) => setDev({ ...dev, device_id: e.target.value })} data-testid="device-id-input" placeholder="ZK-9500-001" /></div>
          <div className="space-y-1.5"><Label>Location</Label><Input value={dev.location} onChange={(e) => setDev({ ...dev, location: e.target.value })} placeholder="Main entrance" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" disabled={addMut.isPending} className="bg-primary hover:bg-primary/90" data-testid="save-device-button">{addMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Register</Button></DialogFooter>
        </form>
      </DialogContent></Dialog>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Enrol Student</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Student *</Label><Select value={enrollStudent} onValueChange={setEnrollStudent}><SelectTrigger data-testid="enroll-student-select"><SelectValue placeholder="Select student" /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <p className="text-xs text-muted-foreground">The biometric template is captured by the device during future hardware integration. This maps the student for biometric attendance.</p>
          <DialogFooter><Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button><Button disabled={!enrollStudent || enrollMut.isPending} className="bg-primary hover:bg-primary/90" onClick={() => enrollMut.mutate(enrollStudent)} data-testid="save-enroll-button">{enrollMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enrol</Button></DialogFooter>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
