import React, { useState } from "react";
import { Link } from "react-router-dom";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
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
        {sent ? (
          <div className="text-center" data-testid="forgot-success">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900">Check your email</h1>
            <p className="text-sm text-muted-foreground mt-2">
              If that email is registered, a reset link has been sent. It expires in 1 hour.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline mt-6">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">Forgot password?</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu" data-testid="forgot-email-input" />
              </div>
              <Button type="submit" disabled={loading} data-testid="forgot-submit-button" className="w-full bg-primary hover:bg-primary/90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
              </Button>
              <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
