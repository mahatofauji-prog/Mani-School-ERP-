import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School, Loader2, Pencil } from "lucide-react";

export default function Subscriptions() {
  const qc = useQueryClient();
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ plan: "Free", start_date: "", expiry_date: "", status: "active" });

  const { data: schools = [], isLoading } = useQuery({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools")).data });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: async () => (await api.get("/plans")).data });

  const saveMut = useMutation({
    mutationFn: async ({ id, payload }) => (await api.patch(`/schools/${id}/subscription`, payload)).data,
    onSuccess: () => { toast.success("Subscription updated"); qc.invalidateQueries({ queryKey: ["schools"] }); setTarget(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  const openEdit = (s) => {
    setTarget(s);
    setForm({ plan: s.subscription?.plan || "Free", start_date: s.subscription?.start_date || "", expiry_date: s.subscription?.expiry_date || "", status: s.subscription?.status || "active" });
  };

  return (
    <div>
      <PageHeader title="School Subscriptions" subtitle="Assign and manage each school's plan" />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : schools.length === 0 ? (
        <EmptyState icon={School} title="No schools yet" description="Create schools to manage their subscriptions." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-xs uppercase tracking-wider">School</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Start</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Expiry</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Usage</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="subscriptions-table">
                {schools.map((s) => {
                  const plan = plans.find((p) => p.name === s.subscription?.plan);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{s.subscription?.plan || "—"}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.subscription?.start_date || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.subscription?.expiry_date || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{plan ? `${s.students}/${plan.max_students} students` : `${s.students} students`}</TableCell>
                      <TableCell><StatusBadge status={s.subscription?.status || "active"} /></TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(s)} data-testid={`edit-sub-${s.code}`}><Pencil className="h-3.5 w-3.5" /> Change</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Subscription · {target?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate({ id: target.id, payload: form }); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger data-testid="sub-plan-select"><SelectValue /></SelectTrigger>
                <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="trial">Trial</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={saveMut.isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-sub-button">{saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
