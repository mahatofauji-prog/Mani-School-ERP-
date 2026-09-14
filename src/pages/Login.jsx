import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";

const HERO = "https://images.pexels.com/photos/15261241/pexels-photo-15261241.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Login() {
  const { user, login, pinLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const quickEmail = typeof window !== "undefined" ? localStorage.getItem("mani_quick_email") : null;
  const [mode, setMode] = useState(quickEmail ? "pin" : "password");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await pinLogin(quickEmail, pin);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero */}
      <div className="hidden lg:block relative">
        <img src={HERO} alt="Modern school architecture" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">MANI SCHOOL ERP</span>
          </div>
          <div>
            <h2 className="text-4xl font-display font-bold tracking-tight leading-tight">One platform.<br />Every school. Zero chaos.</h2>
            <p className="mt-4 text-slate-300 max-w-md">A secure multi-tenant ERP that keeps every school's data fully isolated — from the founder's office to the classroom.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Founder", "School Admin", "Principal", "Teacher", "Student", "Parent"].map((r) => (
                <span key={r} className="text-xs font-medium bg-white/10 border border-white/15 text-slate-200 rounded-full px-3 py-1">{r}</span>
              ))}
            </div>
            <p className="mt-8 text-xs tracking-[0.2em] uppercase text-slate-400">Modern Advancement for New India</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-900">MANI SCHOOL ERP</span>
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">One login for everyone — Founder, School Admin, Principal, Teacher, Student & Parent. Sign in and we'll take you to your dashboard automatically.</p>

          {mode === "pin" && quickEmail ? (
            <form onSubmit={handlePin} className="mt-8 space-y-5" data-testid="pin-login-form">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2" data-testid="login-error">{error}</div>
              )}
              <div className="rounded-md bg-secondary px-3 py-2 text-sm text-slate-700">Quick Login as <span className="font-medium">{quickEmail}</span></div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" type="password" inputMode="numeric" maxLength={6} required value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Enter your PIN"
                  data-testid="pin-login-input" autoFocus />
              </div>
              <Button type="submit" disabled={loading} data-testid="pin-login-submit"
                className="w-full bg-primary hover:bg-primary/90 transition-transform hover:-translate-y-0.5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Quick Login
              </Button>
              <button type="button" onClick={() => { setMode("password"); setError(""); }} data-testid="use-password-instead"
                className="w-full text-sm font-medium text-primary hover:underline">Use email &amp; password instead</button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email / User ID</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu" data-testid="login-email-input" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  data-testid="login-password-input" autoComplete="current-password" className="pr-10" />
                <button type="button" onClick={() => setShow(!show)} data-testid="toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={setRemember} data-testid="remember-me" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline" data-testid="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" disabled={loading} data-testid="login-submit-button"
              className="w-full bg-primary hover:bg-primary/90 transition-transform hover:-translate-y-0.5">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            {quickEmail && (
              <button type="button" onClick={() => { setMode("pin"); setError(""); }} data-testid="use-pin-instead"
                className="w-full text-sm font-medium text-primary hover:underline">Quick Login with PIN</button>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
