import React, { useState } from "react";
import { Lock, Mail, User, ArrowRight, CheckCircle, ShieldAlert } from "lucide-react";

interface AuthPagesProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function AuthPages({ onLoginSuccess }: AuthPagesProps) {
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [canReset, setCanReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: canReset ? newPassword : "" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Password reset failed");
      }

      if (canReset) {
        setSuccess("Password updated successfully! Please login with your new password.");
        setCanReset(false);
        setView("login");
        setEmail("");
        setPassword("");
        setNewPassword("");
      } else {
        setCanReset(true);
        setSuccess("Account verified! Please specify your new password below.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-container" className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background ambient glows */}
      <div id="glow-1" className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div id="glow-2" className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div id="auth-card" className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Brand header */}
        <div id="auth-header" className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-3 shadow-lg shadow-indigo-500/20 mb-4">
            <span className="text-xl font-black text-white tracking-widest">KS</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            KoSh Vote Software
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Premium SMM & WhatsApp Voting Platform
          </p>
        </div>

        {/* Message banners */}
        {error && (
          <div id="auth-error-banner" className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div id="auth-success-banner" className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* --- VIEW: LOGIN --- */}
        {view === "login" && (
          <form id="login-form" onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  id="forgot-password-link"
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    clearMessages();
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In to Panel"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-800/60">
              Don&apos;t have an account?{" "}
              <button
                id="toggle-signup-button"
                type="button"
                onClick={() => {
                  setView("signup");
                  clearMessages();
                }}
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* --- VIEW: SIGNUP --- */}
        {view === "signup" && (
          <form id="signup-form" onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="signup-name"
                  type="text"
                  required
                  placeholder="Aijaz Ahmed Kosh"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Choose Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="signup-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              id="signup-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Registering..." : "Create Free Account"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-800/60">
              Already have an account?{" "}
              <button
                id="toggle-login-button"
                type="button"
                onClick={() => {
                  setView("login");
                  clearMessages();
                }}
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* --- VIEW: FORGOT PASSWORD --- */}
        {view === "forgot" && (
          <form id="forgot-form" onSubmit={handleForgot} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Your Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  disabled={canReset}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors disabled:opacity-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {canReset && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Enter New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="forgot-new-password"
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              id="forgot-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Processing..." : canReset ? "Update Password" : "Verify Account"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-800/60">
              Remember your details?{" "}
              <button
                id="toggle-login-back"
                type="button"
                onClick={() => {
                  setView("login");
                  setCanReset(false);
                  clearMessages();
                }}
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                Go Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Demo Credentials Helper */}
        <div id="demo-credentials" className="mt-8 pt-4 border-t border-slate-800/60 text-center text-[11px] text-slate-500 space-y-1">
          <p>Demo Admin: <span className="text-slate-400">admin@kosh.com</span> / <span className="text-slate-400">admin123</span></p>
          <p>Demo User: <span className="text-slate-400">user@kosh.com</span> / <span className="text-slate-400">user123</span></p>
        </div>

      </div>
    </div>
  );
}
