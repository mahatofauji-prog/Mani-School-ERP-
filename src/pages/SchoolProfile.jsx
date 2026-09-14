import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2, Save, Lock } from "lucide-react";

const FIELDS = [
  ["name", "School Name"], ["principal_name", "Principal Name"], ["email", "Email"],
  ["phone", "Phone"], ["website", "Website"], ["board", "Board"],
  ["academic_year", "Academic Session"], ["timings", "School Timings"],
  ["working_days", "Working Days"], ["city", "City"], ["state", "State"], ["pincode", "PIN Code"],
];

export default function SchoolProfile() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["my-school"], queryFn: async () => (await api.get("/my-school")).data });

  useEffect(() => { if (data) setForm(data); }, [data]);
  if (isLoading || !form) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      FIELDS.forEach(([k]) => { if ((form[k] || "").trim() !== "") payload[k] = form[k]; });
      if ((form.address || "").trim() !== "") payload.address = form.address;
      if ((form.description || "").trim() !== "") payload.description = form.description;
      const { data: updated } = await api.put("/my-school", payload);
      setForm(updated);
      toast.success("School profile updated");
    } catch (err) { toast.error(apiError(err)); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="School Profile" subtitle="Manage your school's information" />
      <form onSubmit={save} className="max-w-3xl space-y-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
            <div>
              <h3 className="font-display font-semibold text-slate-900">{form.name}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Code <b className="font-mono">{form.code}</b> · Status <b className="capitalize">{form.status}</b> (set by platform)</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELDS.map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <Input value={form[k] || ""} onChange={(e) => set(k, e.target.value)} data-testid={`school-${k}-input`} />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-1.5"><Label className="text-sm">Address</Label><Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} data-testid="school-address-input" /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label className="text-sm">Description</Label><Textarea rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
          </div>
        </div>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 gap-2" data-testid="save-school-profile-button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
        </Button>
      </form>
    </div>
  );
}
