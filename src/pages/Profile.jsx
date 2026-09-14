import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-helpers";
import { ROLE_LABELS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Smartphone, ShieldCheck } from "lucide-react";

function QuickLoginCard({ user, onChange }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const enabled = user?.pin_enabled;

  const save = async () => {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("PIN must be 4-6 digits");
    setBusy(true);
    try {
      await api.post("/auth/set-pin", { pin });
      localStorage.setItem("mani_quick_email", user.email);
      toast.success(enabled ? "PIN updated" : "Quick Login enabled");
      setPin("");
      onChange();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      await api.post("/auth/disable-pin");
      localStorage.removeItem("mani_quick_email");
      toast.success("Quick Login disabled");
      onChange();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-border rounded-lg p-6 lg:col-span-3" data-testid="quick-login-card">
      <div className="flex items-center gap-2 mb-1">
        <Smartphone className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold text-slate-900">Quick Login (PIN)</h3>
        {enabled && <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><ShieldCheck className="h-3.5 w-3.5" /> Enabled</span>}
      </div>
      <p className="text-sm text-muted-foreground mb-4">Sign in faster on this device with a 4-6 digit PIN. Email &amp; password always keep working.</p>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-sm">{enabled ? "New PIN" : "Set a PIN"}</Label>
          <Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" className="w-32" data-testid="pin-input" />
        </div>
        <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90" data-testid="save-pin-button">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{enabled ? "Change PIN" : "Enable Quick Login"}
        </Button>
        {enabled && <Button variant="outline" onClick={disable} disabled={busy} data-testid="disable-pin-button" className="text-destructive border-destructive/30 hover:bg-destructive/5">Disable</Button>}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, { name, phone });
      await refreshMe();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your account information" />
      <div className="grid lg:grid-cols-3 gap-6 max-w-4xl">
        <div className="bg-white border border-border rounded-lg p-6 flex flex-col items-center text-center">
          <Avatar className="h-20 w-20"><AvatarFallback className="bg-primary text-white text-xl font-semibold">{initials}</AvatarFallback></Avatar>
          <h3 className="font-display font-semibold text-slate-900 mt-4">{user?.name}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="mt-3 inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{ROLE_LABELS[user?.role]}</span>
        </div>
        <form onSubmit={save} className="bg-white border border-border rounded-lg p-6 lg:col-span-2 space-y-5">
          <div className="space-y-1.5"><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name-input" /></div>
          <div className="space-y-1.5"><Label>Email (read-only)</Label><Input value={user?.email} disabled /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="profile-phone-input" /></div>
          <Button type="submit" disabled={saving} data-testid="save-profile-button" className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </form>
        <QuickLoginCard user={user} onChange={refreshMe} />
      </div>
    </div>
  );
}
