import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { School as SchoolIcon, Plus, MoreVertical, Loader2, Building2, Power, Search, Eye } from "lucide-react";

const empty = {
  name: "", code: "", city: "", state: "", country: "India", pincode: "", board: "", phone: "",
  email: "", website: "", address: "", principal_name: "", academic_year: "", session: "",
  plan: "Free", status: "active", admin: { name: "", email: "", password: "", phone: "" },
};

const FILTERS = ["all", "active", "suspended", "trial", "inactive"];

export default function Schools() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const { data: schools = [], isLoading } = useQuery({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools")).data });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: async () => (await api.get("/plans")).data });

  const DEFAULT_PLANS = [
    { id: "plan_free", name: "Free" },
    { id: "plan_standard", name: "Standard" },
    { id: "plan_premium", name: "Premium" }
  ];
  const availablePlans = plans.length > 0 ? plans : DEFAULT_PLANS;

  useEffect(() => {
    const list = availablePlans;
    if (list.length > 0 && (!form.plan || !list.some(p => p.name === form.plan))) {
      setForm(f => ({ ...f, plan: list[0].name }));
    }
  }, [plans]);

  const createMut = useMutation({
    mutationFn: async (payload) => {
      const payloadToSend = {
        ...payload,
        subscription: { plan: payload.plan || "Free" }
      };
      return (await api.post("/schools", payloadToSend)).data;
    },
    onSuccess: () => {
      toast.success("School created successfully with School Admin login");
      qc.invalidateQueries({ queryKey: ["schools"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e) => {
      toast.error(apiError(e));
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }) => (await api.patch(`/schools/${id}/status`, { status })).data,
    onSuccess: () => { toast.success("School status updated"); qc.invalidateQueries({ queryKey: ["schools"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/schools/${id}`)).data,
    onSuccess: () => { toast.success("School archived"); qc.invalidateQueries({ queryKey: ["schools"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAdmin = (k, v) => setForm((f) => ({ ...f, admin: { ...f.admin, [k]: v } }));

  const view = useMemo(() => {
    let list = schools;
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "students") return (b.students || 0) - (a.students || 0);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    return list;
  }, [schools, filter, search, sort]);

  return (
    <div>
      <PageHeader title="Schools" subtitle="Create and manage every school (tenant) on the platform">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-school-button" className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus className="h-4 w-4" /> Add School</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Create New School</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-5">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">School Information</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="School Name *"><Input required value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="school-name-input" /></Field>
                  <Field label="School Code / Tenant ID *"><Input required value={form.code} onChange={(e) => set("code", e.target.value)} data-testid="school-code-input" placeholder="e.g. SCH-A" /></Field>
                  <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                  <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                  <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
                  <Field label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
                  <Field label="Pincode"><Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
                  <Field label="Board"><Input value={form.board} onChange={(e) => set("board", e.target.value)} placeholder="CBSE / ICSE / State" /></Field>
                  <Field label="Principal Name"><Input value={form.principal_name} onChange={(e) => set("principal_name", e.target.value)} /></Field>
                  <Field label="Academic Session"><Input value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} placeholder="2025-2026" /></Field>
                  <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field></div>
                  <Field label="Subscription Plan">
                    <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                      <SelectTrigger data-testid="school-plan-select"><SelectValue placeholder="Select plan" /></SelectTrigger>
                      <SelectContent>
                        {availablePlans.map((p) => <SelectItem key={p.id || p.name} value={p.name}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Account Status">
                    <Select value={form.status} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </Field>
                </div>
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">School Admin Login</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Admin Name *"><Input required value={form.admin.name} onChange={(e) => setAdmin("name", e.target.value)} data-testid="admin-name-input" /></Field>
                  <Field label="Admin Phone"><Input value={form.admin.phone} onChange={(e) => setAdmin("phone", e.target.value)} /></Field>
                  <Field label="Admin Email *"><Input required type="email" value={form.admin.email} onChange={(e) => setAdmin("email", e.target.value)} data-testid="admin-email-input" /></Field>
                  <Field label="Admin Password *"><Input required type="text" value={form.admin.password} onChange={(e) => setAdmin("password", e.target.value)} data-testid="admin-password-input" placeholder="Initial password" /></Field>
                </div>
              </section>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending} data-testid="save-school-button" className="bg-indigo-600 hover:bg-indigo-700">
                  {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create School
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-wrap gap-1 bg-white border border-border rounded-lg p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-secondary"}`}>{f}</button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schools…" className="pl-9" data-testid="school-search-input" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="name">Name A-Z</SelectItem><SelectItem value="students">Most students</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : view.length === 0 ? (
        <EmptyState icon={SchoolIcon} title="No schools found" description="Create your first school — a School Admin login is generated automatically." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-xs uppercase tracking-wider">School</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Code</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Students</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="schools-table">
                {view.map((s) => (
                  <TableRow key={s.id} data-testid={`school-row-${s.code}`} className="cursor-pointer" onClick={() => navigate(`/app/schools/${s.id}`)}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center"><Building2 className="h-4 w-4 text-indigo-600" /></div>{s.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-muted-foreground">{[s.city, s.state].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="text-xs">{s.subscription?.plan || s.plan || "—"}</TableCell>
                    <TableCell>{s.students || 0}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" data-testid={`school-actions-${s.code}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/app/schools/${s.id}`)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                          {s.status !== "active"
                            ? <DropdownMenuItem onClick={() => statusMut.mutate({ id: s.id, status: "active" })}><Power className="h-4 w-4 mr-2" /> Activate</DropdownMenuItem>
                            : <DropdownMenuItem onClick={() => statusMut.mutate({ id: s.id, status: "suspended" })}><Power className="h-4 w-4 mr-2" /> Suspend</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmTarget(s)}>Archive School</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`Archive ${confirmTarget?.name}?`} description="This soft-deletes the school and deactivates its users. Data is preserved but access is revoked."
        confirmLabel="Archive" loading={deleteMut.isPending} onConfirm={() => deleteMut.mutate(confirmTarget.id)} />
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
