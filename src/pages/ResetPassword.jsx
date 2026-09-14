import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password reset. Please sign in.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-slate-900">MANI SCHOOL ERP</span>
        </div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">Set a new password</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">{error}</div>}
          {!token && <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-2">Missing reset token. Use the link from your email.</div>}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="reset-password-input" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              data-testid="reset-confirm-input" placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading || !token} data-testid="reset-submit-button" className="w-full bg-primary hover:bg-primary/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset password
          </Button>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
