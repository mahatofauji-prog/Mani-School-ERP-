import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Settings, Fingerprint } from "lucide-react";

export default function PlatformSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/platform/settings")).data });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        platform_name: form.platform_name, contact_email: form.contact_email, support_phone: form.support_phone,
        default_academic_year: form.default_academic_year, session_timeout_minutes: parseInt(form.session_timeout_minutes) || 60,
        min_password_length: parseInt(form.min_password_length) || 6, maintenance_mode: !!form.maintenance_mode,
        biometric_attendance: !!form.biometric_attendance,
        qr_attendance: form.qr_attendance !== false,
      };
      await api.put("/platform/settings", payload);
      toast.success("Platform settings saved");
    } catch (err) { toast.error(apiError(err)); } finally { setSaving(false); }
  };

  if (isLoading || !form) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader title="Platform Settings" subtitle="Global configuration for the entire platform" />
      <form onSubmit={save} className="max-w-2xl space-y-6">
        <section className="bg-white border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2"><Settings className="h-5 w-5 text-indigo-600" /> General</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Platform Name</Label><Input value={form.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} data-testid="setting-platform-name" /></div>
            <div className="space-y-1.5"><Label>Default Academic Year</Label><Input value={form.default_academic_year || ""} onChange={(e) => set("default_academic_year", e.target.value)} placeholder="2025-2026" /></div>
            <div className="space-y-1.5"><Label>Contact Email</Label><Input type="email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Support Phone</Label><Input value={form.support_phone || ""} onChange={(e) => set("support_phone", e.target.value)} /></div>
          </div>
        </section>
        <section className="bg-white border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-display font-semibold text-slate-900">Security</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Session Timeout (minutes)</Label><Input type="number" value={form.session_timeout_minutes || 60} onChange={(e) => set("session_timeout_minutes", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Min Password Length</Label><Input type="number" value={form.min_password_length || 6} onChange={(e) => set("min_password_length", e.target.value)} /></div>
          </div>
        </section>
        <section className="bg-white border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div><h3 className="font-display font-semibold text-slate-900">Maintenance Mode</h3><p className="text-sm text-muted-foreground">Display a maintenance banner across the platform.</p></div>
            <Switch checked={!!form.maintenance_mode} onCheckedChange={(v) => set("maintenance_mode", v)} data-testid="setting-maintenance-toggle" />
          </div>
        </section>
        <section className="bg-white border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2"><Fingerprint className="h-5 w-5 text-indigo-600" /> Feature Management — Attendance Features</h3>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <div className="font-medium text-slate-900">QR Code Attendance</div>
              <p className="text-sm text-muted-foreground">Global master switch. Teachers scan student ID-card QR codes to mark attendance. When OFF, QR attendance is hidden and blocked for every school.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold uppercase ${form.qr_attendance !== false ? "text-emerald-600" : "text-slate-400"}`} data-testid="qr-global-state">{form.qr_attendance !== false ? "Enabled" : "Disabled"}</span>
              <Switch checked={form.qr_attendance !== false} onCheckedChange={(v) => set("qr_attendance", v)} data-testid="setting-qr-toggle" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <div className="font-medium text-slate-900">Biometric Attendance</div>
              <p className="text-sm text-muted-foreground">Global master switch. When OFF, biometric attendance is completely hidden and blocked for every school, regardless of per-school settings.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold uppercase ${form.biometric_attendance ? "text-emerald-600" : "text-slate-400"}`} data-testid="biometric-global-state">{form.biometric_attendance ? "Enabled" : "Disabled"}</span>
              <Switch checked={!!form.biometric_attendance} onCheckedChange={(v) => set("biometric_attendance", v)} data-testid="setting-biometric-toggle" />
            </div>
          </div>
        </section>
        <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2" data-testid="save-settings-button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
        </Button>
      </form>
    </div>
  );
}
