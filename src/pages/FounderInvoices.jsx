import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Loader2, Check, X, Eye, Settings } from "lucide-react";

const ST = { issued: "bg-slate-100 text-slate-600", payment_submitted: "bg-amber-50 text-amber-700", paid: "bg-emerald-50 text-emerald-700" };

export default function FounderInvoices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [setOpenS, setSetOpenS] = useState(false);
  const [form, setForm] = useState({ school_id: "", description: "", amount: "", due_date: "" });
  const [view, setView] = useState(null);
  const [reason, setReason] = useState("");

  const { data: schools = [] } = useQuery({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools")).data });
  const { data, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: async () => (await api.get("/payments/invoices")).data });
  const { data: settings } = useQuery({ queryKey: ["fsettings"], queryFn: async () => (await api.get("/payments/founder-settings")).data });
  const invoices = data?.invoices || [];
  const schoolName = (id) => schools.find((s) => s.id === id)?.name || id?.slice(-6);

  const createMut = useMutation({
    mutationFn: async (p) => (await api.post("/payments/invoices", { ...p, amount: parseFloat(p.amount) })).data,
    onSuccess: () => { toast.success("Invoice issued"); qc.invalidateQueries({ queryKey: ["invoices"] }); setOpen(false); setForm({ school_id: "", description: "", amount: "", due_date: "" }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const verifyMut = useMutation({
    mutationFn: async ({ id, action, reason }) => (await api.post(`/payments/invoices/${id}/verify`, { action, reason })).data,
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["invoices"] }); setView(null); setReason(""); },
    onError: (e) => toast.error(apiError(e)),
  });
  const [sForm, setSForm] = useState(null);
  const saveSettings = async () => {
    try { await api.put("/payments/founder-settings", sForm); toast.success("Payment details saved"); setSetOpenS(false); qc.invalidateQueries({ queryKey: ["fsettings"] }); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div>
      <PageHeader title="MANI Solutions Invoices" subtitle="Issue invoices to schools and verify payments">
        <Button variant="outline" onClick={() => { setSForm(settings || {}); setSetOpenS(true); }} className="gap-2" data-testid="payment-settings-button"><Settings className="h-4 w-4" /> Payment Details</Button>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2" data-testid="add-invoice-button"><Plus className="h-4 w-4" /> New Invoice</Button>
      </PageHeader>

      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      : invoices.length === 0 ? <EmptyState icon={FileText} title="No invoices yet" description="Create an invoice for a school." />
      : (
        <div className="bg-white border border-border rounded-lg overflow-hidden"><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow className="bg-secondary/50">
            <TableHead className="text-xs uppercase">Invoice</TableHead><TableHead className="text-xs uppercase">School</TableHead>
            <TableHead className="text-xs uppercase">Amount</TableHead><TableHead className="text-xs uppercase">Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody data-testid="invoices-table">{invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs">{inv.invoice_number}<div className="text-muted-foreground">{inv.description}</div></TableCell>
              <TableCell>{schoolName(inv.school_id)}</TableCell>
              <TableCell>₹{inv.amount}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded capitalize ${ST[inv.status] || ST.issued}`}>{inv.status.replace("_", " ")}</span>{inv.receipt_number && <div className="text-[10px] text-muted-foreground">{inv.receipt_number}</div>}</TableCell>
              <TableCell className="text-right">{inv.status === "payment_submitted" && <Button size="sm" variant="outline" onClick={() => setView(inv)} data-testid={`verify-${inv.invoice_number}`} className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Verify</Button>}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></div></div>
      )}

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">New Invoice</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div className="space-y-1.5"><Label>School *</Label><Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })}><SelectTrigger data-testid="inv-school-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Description *</Label><Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="inv-desc-input" placeholder="ERP Annual Subscription" /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Amount (₹) *</Label><Input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="inv-amount-input" /></div><div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={createMut.isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-invoice-button">{createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Issue</Button></DialogFooter>
        </form>
      </DialogContent></Dialog>

      <Dialog open={setOpenS} onOpenChange={setSetOpenS}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">MANI Solutions Payment Details</DialogTitle></DialogHeader>
        {sForm && <div className="space-y-3">
          {[["upi_id", "UPI ID"], ["bank_name", "Bank Name"], ["account_name", "Account Name"], ["account_number", "Account Number"], ["ifsc", "IFSC"], ["branch", "Branch"]].map(([k, l]) => (
            <div key={k} className="space-y-1.5"><Label>{l}</Label><Input value={sForm[k] || ""} onChange={(e) => setSForm({ ...sForm, [k]: e.target.value })} data-testid={`fs-${k}`} /></div>
          ))}
          <DialogFooter><Button variant="outline" onClick={() => setSetOpenS(false)}>Cancel</Button><Button onClick={saveSettings} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-fsettings">Save</Button></DialogFooter>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Verify Payment</DialogTitle></DialogHeader>
        {view && <div className="space-y-2 text-sm">
          <div>School: <b>{schoolName(view.school_id)}</b></div><div>Amount: <b>₹{view.submission?.amount_paid}</b></div>
          <div>UTR: <b className="font-mono">{view.submission?.utr}</b></div><div>Date: {view.submission?.payment_date} · {view.submission?.method}</div>
          {view.submission?.screenshot_path && <a href={`${api.defaults.baseURL}/files/${view.submission.screenshot_path}`} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View screenshot</a>}
          <Textarea placeholder="Rejection reason (required to reject)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => verifyMut.mutate({ id: view.id, action: "approve" })} data-testid="approve-payment"><Check className="h-4 w-4" /> Approve</Button>
            <Button variant="outline" className="flex-1 text-destructive gap-1.5" onClick={() => verifyMut.mutate({ id: view.id, action: "reject", reason })} data-testid="reject-payment"><X className="h-4 w-4" /> Reject</Button>
          </div>
        </div>}
      </DialogContent></Dialog>
    </div>
  );
}
