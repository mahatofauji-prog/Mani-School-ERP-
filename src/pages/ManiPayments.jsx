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
import { CreditCard, Loader2, Copy, Upload, Printer } from "lucide-react";

const ST = { issued: "bg-slate-100 text-slate-600", payment_submitted: "bg-amber-50 text-amber-700", paid: "bg-emerald-50 text-emerald-700" };

export default function ManiPayments() {
  const qc = useQueryClient();
  const [pay, setPay] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ amount_paid: "", payment_date: "", method: "upi", utr: "", screenshot_path: "", note: "" });
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["mani-invoices"], queryFn: async () => (await api.get("/payments/invoices")).data });
  const invoices = data?.invoices || [];
  const pd = data?.payment_details || {};

  const submitMut = useMutation({
    mutationFn: async ({ id, body }) => (await api.post(`/payments/invoices/${id}/submit`, body)).data,
    onSuccess: () => { toast.success("Payment proof submitted for verification"); qc.invalidateQueries({ queryKey: ["mani-invoices"] }); setPay(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  const openPay = (inv) => { setPay(inv); setForm({ amount_paid: inv.amount, payment_date: new Date().toISOString().slice(0, 10), method: "upi", utr: "", screenshot_path: "", note: "" }); };
  const upload = async (file) => {
    if (!file) return; setUploading(true);
    try { const fd = new FormData(); fd.append("file", file); const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); setForm((f) => ({ ...f, screenshot_path: data.path })); toast.success("Screenshot uploaded"); }
    catch (e) { toast.error(apiError(e)); } finally { setUploading(false); }
  };
  const copy = (t) => { navigator.clipboard?.writeText(t); toast.success("Copied"); };

  return (
    <div>
      <PageHeader title="MANI Solutions Payments" subtitle="View invoices and submit payment proof" />
      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      : invoices.length === 0 ? <EmptyState icon={CreditCard} title="No invoices" description="You have no MANI Solutions invoices." />
      : <div className="space-y-3" data-testid="mani-invoices-list">{invoices.map((inv) => (
        <div key={inv.id} className="bg-white border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><div className="font-medium text-slate-900">{inv.description}</div><div className="text-xs text-muted-foreground font-mono">{inv.invoice_number} · ₹{inv.amount}{inv.due_date ? ` · due ${inv.due_date}` : ""}</div></div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded capitalize ${ST[inv.status] || ST.issued}`}>{inv.status.replace("_", " ")}</span>
            {inv.status === "issued" && <Button size="sm" onClick={() => openPay(inv)} className="bg-primary hover:bg-primary/90" data-testid={`pay-${inv.invoice_number}`}>Pay Now</Button>}
            {inv.status === "payment_submitted" && inv.submission?.status === "rejected" && <Button size="sm" variant="outline" onClick={() => openPay(inv)}>Resubmit</Button>}
            {inv.status === "paid" && <Button size="sm" variant="outline" onClick={() => setReceipt(inv)} className="gap-1.5" data-testid={`receipt-${inv.invoice_number}`}><Printer className="h-3.5 w-3.5" /> Receipt</Button>}
          </div>
        </div>
      ))}</div>}

      <Dialog open={!!pay} onOpenChange={(o) => !o && setPay(null)}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Pay ₹{pay?.amount} — {pay?.invoice_number}</DialogTitle></DialogHeader>
        {pay && <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4 text-sm space-y-1">
            <div className="font-semibold text-slate-900 mb-1">MANI Solutions Payment Details</div>
            {pd.upi_id && <div className="flex items-center justify-between">UPI: <b>{pd.upi_id}</b><Button size="sm" variant="ghost" onClick={() => copy(pd.upi_id)}><Copy className="h-3.5 w-3.5" /></Button></div>}
            {pd.bank_name && <div>Bank: <b>{pd.bank_name}</b></div>}
            {pd.account_name && <div>A/C Name: <b>{pd.account_name}</b></div>}
            {pd.account_number && <div>A/C No: <b>{pd.account_number}</b></div>}
            {pd.ifsc && <div>IFSC: <b>{pd.ifsc}</b></div>}
            {!pd.upi_id && !pd.bank_name && <div className="text-muted-foreground">Payment details not configured yet.</div>}
          </div>
          <p className="text-xs text-muted-foreground">Pay using the details above, then submit your proof below.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Amount Paid *</Label><Input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} data-testid="pay-amount" /></div>
            <div className="space-y-1.5"><Label>Payment Date *</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Method</Label><Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>UTR / Txn ID *</Label><Input value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} data-testid="pay-utr" /></div>
          </div>
          <div className="space-y-1.5"><Label>Screenshot</Label><div className="flex items-center gap-2"><Input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => upload(e.target.files[0])} disabled={uploading} data-testid="pay-screenshot" />{uploading && <Loader2 className="h-4 w-4 animate-spin" />}</div>{form.screenshot_path && <p className="text-xs text-emerald-600">Uploaded ✓</p>}</div>
          <DialogFooter><Button variant="outline" onClick={() => setPay(null)}>Cancel</Button><Button disabled={submitMut.isPending || !form.utr || !form.amount_paid} className="bg-primary hover:bg-primary/90" onClick={() => submitMut.mutate({ id: pay.id, body: { ...form, amount_paid: parseFloat(form.amount_paid) } })} data-testid="submit-proof"><Upload className="mr-2 h-4 w-4" /> Submit Proof</Button></DialogFooter>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}><DialogContent className="max-w-md">
        <div className="receipt space-y-2 text-sm p-2">
          <div className="text-center border-b pb-2 mb-2"><div className="font-display font-bold text-lg">MANI Solutions</div><div className="text-xs text-muted-foreground">Payment Receipt</div></div>
          <div className="flex justify-between"><span>Receipt No.</span><b>{receipt?.receipt_number}</b></div>
          <div className="flex justify-between"><span>Invoice</span><b>{receipt?.invoice_number}</b></div>
          <div className="flex justify-between"><span>Description</span><b>{receipt?.description}</b></div>
          <div className="flex justify-between"><span>Amount</span><b>₹{receipt?.submission?.amount_paid || receipt?.amount}</b></div>
          <div className="flex justify-between"><span>UTR</span><b>{receipt?.submission?.utr}</b></div>
          <div className="flex justify-between"><span>Date</span><b>{receipt?.submission?.payment_date}</b></div>
          <div className="text-center text-emerald-600 font-semibold pt-2">PAID ✓</div>
        </div>
        <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 gap-2 no-print" data-testid="print-receipt"><Printer className="h-4 w-4" /> Print / Save PDF</Button>
        <style>{`@media print{.no-print{display:none!important}body *{visibility:hidden}.receipt,.receipt *{visibility:visible}.receipt{position:absolute;left:20px;top:20px;width:320px}}`}</style>
      </DialogContent></Dialog>
    </div>
  );
}
