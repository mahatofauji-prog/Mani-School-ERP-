import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Loader2, Users, KeyRound } from "lucide-react";

const CONFIG = {
  teacher: { title: "Teachers", singular: "Teacher", subtitle: "Manage teaching staff" },
  student: { title: "Students", singular: "Student", subtitle: "Manage enrolled students" },
  parent: { title: "Parents", singular: "Parent", subtitle: "Manage parents & guardians" },
  principal: { title: "Principal", singular: "Principal", subtitle: "Manage school principal(s)" },
};

const baseForm = { name: "", email: "", password: "", phone: "" };

export default function UsersPage({ role }) {
  const cfg = CONFIG[role];
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(baseForm);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [pwTarget, setPwTarget] = useState(null);
  const [newPw, setNewPw] = useState("");

  const canManage = ["founder_admin", "school_admin", "principal"].includes(user?.role);
  const isTeacherViewer = user?.role === "teacher";

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", role],
    queryFn: async () => (await api.get(`/users?role=${role}`)).data,
  });

  const needsAcademics = role === "student" || role === "teacher";
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data, enabled: needsAcademics,
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["sections"], queryFn: async () => (await api.get("/sections")).data, enabled: needsAcademics,
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data, enabled: role === "teacher",
  });
  const { data: studentList = [] } = useQuery({
    queryKey: ["users", "student"], queryFn: async () => (await api.get(`/users?role=student`)).data, enabled: role === "parent",
  });

  const createMut = useMutation({
    mutationFn: async (payload) => (await api.post("/users", payload)).data,
    onSuccess: () => { toast.success(`${cfg.singular} created`); qc.invalidateQueries({ queryKey: ["users", role] }); setOpen(false); setForm(baseForm); },
    onError: (e) => toast.error(apiError(e)),
  });
  const deleteMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => { toast.success(`${cfg.singular} archived`); qc.invalidateQueries({ queryKey: ["users", role] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });
  const statusMut = useMutation({
    mutationFn: async ({ id, status }) => (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["users", role] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const pwMut = useMutation({
    mutationFn: async ({ id, password }) => (await api.post(`/users/${id}/reset-password`, { password })).data,
    onSuccess: () => { toast.success("Password updated"); setPwTarget(null); setNewPw(""); },
    onError: (e) => toast.error(apiError(e)),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    createMut.mutate({ ...form, role });
  };

  const filteredSections = sections.filter((s) => s.class_id === form.class_id);
  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}>
        {canManage && (
          <Button data-testid={`add-${role}-button`} onClick={() => { setForm(baseForm); setOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="h-4 w-4" /> Add {cfg.singular}
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title={`No ${cfg.title.toLowerCase()} yet`} description={isTeacherViewer ? "No students in your assigned classes yet." : `Add a ${cfg.singular.toLowerCase()} to get started.`} />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Phone</TableHead>
                  {role === "student" && <TableHead className="text-xs uppercase tracking-wider">Class</TableHead>}
                  {role === "student" && <TableHead className="text-xs uppercase tracking-wider">Roll</TableHead>}
                  {role === "teacher" && <TableHead className="text-xs uppercase tracking-wider">Qualification</TableHead>}
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  {canManage && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody data-testid={`${role}-table`}>
                {users.map((u) => (
                  <TableRow key={u.id} data-testid={`${role}-row-${u.email}`}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                    {role === "student" && <TableCell>{className(u.class_id)}</TableCell>}
                    {role === "student" && <TableCell>{u.roll_number || "—"}</TableCell>}
                    {role === "teacher" && <TableCell>{u.qualification || "—"}</TableCell>}
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`${role}-actions-${u.email}`}><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => statusMut.mutate({ id: u.id, status: u.status === "active" ? "suspended" : "active" })}>
                              {u.status === "active" ? "Suspend" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setPwTarget(u); setNewPw(""); }}>
                              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmTarget(u)}>Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add {cfg.singular}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Full Name *"><Input required value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="user-name-input" /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Login Email *"><Input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="user-email-input" /></Field>
              <Field label="Initial Password *"><Input required value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="user-password-input" /></Field>
            </div>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>

            {role === "teacher" && (
              <>
                <Field label="Qualification"><Input value={form.qualification || ""} onChange={(e) => set("qualification", e.target.value)} /></Field>
                <MultiSelect label="Assigned Classes" options={classes.map((c) => ({ value: c.id, label: c.name }))} value={form.assigned_classes || []} onChange={(v) => set("assigned_classes", v)} />
                <MultiSelect label="Subjects" options={subjects.map((s) => ({ value: s.id, label: s.name }))} value={form.subjects || []} onChange={(v) => set("subjects", v)} />
              </>
            )}
            {role === "student" && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Class *">
                    <Select value={form.class_id || ""} onValueChange={(v) => set("class_id", v)}>
                      <SelectTrigger data-testid="student-class-select"><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Section">
                    <Select value={form.section_id || ""} onValueChange={(v) => set("section_id", v)} disabled={!form.class_id}>
                      <SelectTrigger data-testid="student-section-select"><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>{filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Roll Number"><Input value={form.roll_number || ""} onChange={(e) => set("roll_number", e.target.value)} /></Field>
                  <Field label="Admission No."><Input value={form.admission_number || ""} onChange={(e) => set("admission_number", e.target.value)} /></Field>
                  <Field label="Date of Birth"><Input type="date" value={form.dob || ""} onChange={(e) => set("dob", e.target.value)} /></Field>
                  <Field label="Gender">
                    <Select value={form.gender || ""} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                  </Field>
                </div>
              </>
            )}
            {role === "parent" && (
              <>
                <Field label="Relationship"><Input value={form.relationship || ""} onChange={(e) => set("relationship", e.target.value)} placeholder="Father / Mother / Guardian" /></Field>
                <MultiSelect label="Linked Children" options={studentList.map((s) => ({ value: s.id, label: `${s.name}${s.roll_number ? ` (Roll ${s.roll_number})` : ""}` }))} value={form.linked_student_ids || []} onChange={(v) => set("linked_student_ids", v)} />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending} data-testid="save-user-button" className="bg-primary hover:bg-primary/90">
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Reset password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Set a new password for <span className="font-medium text-slate-900">{pwTarget?.name}</span>.</p>
            <Input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" data-testid="reset-pw-input" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>Cancel</Button>
            <Button disabled={pwMut.isPending || newPw.length < 6} className="bg-primary hover:bg-primary/90"
              onClick={() => pwMut.mutate({ id: pwTarget.id, password: newPw })} data-testid="reset-pw-submit">
              {pwMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`Archive ${confirmTarget?.name}?`}
        description="This deactivates the account and archives the profile. This can be reversed by an administrator."
        confirmLabel="Archive"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(confirmTarget.id)}
      />
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}

function MultiSelect({ label, options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">None available yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button type="button" key={o.value} onClick={() => toggle(o.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${value.includes(o.value) ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border hover:border-primary"}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
