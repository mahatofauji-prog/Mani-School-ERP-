import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODULE_LABELS, ALL_MODULES } from "@/lib/nav";
import { Switch } from "@/components/ui/switch";
import { ToggleRight, Loader2, Save, Fingerprint } from "lucide-react";

export default function Modules() {
  const qc = useQueryClient();
  const [schoolId, setSchoolId] = useState("");
  const [enabled, setEnabled] = useState([]);
  const [bio, setBio] = useState(false);
  const [qr, setQr] = useState(true);

  const { data: schools = [] } = useQuery({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools")).data });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/platform/settings")).data });
  const globalBiometric = !!settings?.biometric_attendance;
  const globalQr = settings?.qr_attendance !== false;
  const selected = schools.find((s) => s.id === schoolId);

  useEffect(() => {
    if (selected) { setEnabled(selected.enabled_modules || [...ALL_MODULES]); setBio(!!selected.biometric_attendance); setQr(selected.qr_attendance !== false); }
  }, [schoolId]); // eslint-disable-line

  const saveMut = useMutation({
    mutationFn: async () => (await api.patch(`/schools/${schoolId}/modules`, { enabled_modules: enabled })).data,
    onSuccess: () => { toast.success("Modules updated for this school"); qc.invalidateQueries({ queryKey: ["schools"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const bioMut = useMutation({
    mutationFn: async (v) => (await api.patch(`/schools/${schoolId}/biometric`, { biometric_attendance: v })).data,
    onSuccess: (_, v) => { setBio(v); toast.success(`Biometric ${v ? "enabled" : "disabled"} for this school`); qc.invalidateQueries({ queryKey: ["schools"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const qrMut = useMutation({
    mutationFn: async (v) => (await api.patch(`/schools/${schoolId}/qr`, { qr_attendance: v })).data,
    onSuccess: (_, v) => { setQr(v); toast.success(`QR attendance ${v ? "enabled" : "disabled"} for this school`); qc.invalidateQueries({ queryKey: ["schools"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const toggle = (m) => setEnabled((e) => e.includes(m) ? e.filter((x) => x !== m) : [...e, m]);

  return (
    <div>
      <PageHeader title="Feature Modules" subtitle="Enable or disable modules per school. Disabled modules disappear from that school's portal." />
      <div className="max-w-xs mb-6">
        <Select value={schoolId} onValueChange={setSchoolId}>
          <SelectTrigger data-testid="module-school-select"><SelectValue placeholder="Select a school" /></SelectTrigger>
          <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!schoolId ? (
        <EmptyState icon={ToggleRight} title="Select a school" description="Choose a school to manage its enabled modules." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="modules-grid">
            {ALL_MODULES.map((m) => {
              const on = enabled.includes(m);
              return (
                <button key={m} onClick={() => toggle(m)} data-testid={`module-toggle-${m}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${on ? "bg-indigo-50 border-indigo-300 text-indigo-800" : "bg-white border-border text-slate-500"}`}>
                  {MODULE_LABELS[m]}
                  <span className={`h-4 w-8 rounded-full relative transition-colors ${on ? "bg-indigo-600" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2" data-testid="save-modules-button">
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Modules
            </Button>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-white p-5" data-testid="school-biometric-section">
            <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2 mb-3"><Fingerprint className="h-5 w-5 text-indigo-600" /> Attendance Features</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">QR Code Attendance</div>
                <p className="text-sm text-muted-foreground">
                  {globalQr
                    ? "Teachers can scan student ID-card QR codes to mark attendance."
                    : "The global master switch is OFF. Turn it on in Platform Settings to allow QR attendance for any school."}
                </p>
              </div>
              <Switch checked={qr} disabled={!globalQr || qrMut.isPending} onCheckedChange={(v) => qrMut.mutate(v)} data-testid="school-qr-toggle" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
              <div>
                <div className="font-medium text-slate-900">Biometric Attendance</div>
                <p className="text-sm text-muted-foreground">
                  {globalBiometric
                    ? "Enable biometric attendance for this school."
                    : "The global master switch is OFF. Turn it on in Platform Settings to allow biometric attendance for any school."}
                </p>
              </div>
              <Switch checked={bio} disabled={!globalBiometric || bioMut.isPending} onCheckedChange={(v) => bioMut.mutate(v)} data-testid="school-biometric-toggle" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
