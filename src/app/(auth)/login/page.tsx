"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("cashier@orqiva.io");
  const [password, setPassword] = useState("Admin@Orqiva2026!");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error("Authentication Failed", {
          description: data.error || "Please check your email and credentials.",
        });
        return;
      }

      toast.success("Identity Verified", {
        description: `Welcome back, ${data.data.user.fullName}. Redirecting to operational terminal...`,
      });

      if (data.data.user.role === "CASHIER") {
        router.push("/pos");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      toast.error("Network Error", {
        description: "Failed to connect to authentication gateway.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("Admin@Orqiva2026!");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-glow-amber text-2xl mx-auto">
            Ω
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
            ORQIVA ERP
          </h1>
          <p className="text-xs text-slate-400">
            Modular Monolith Enterprise Gateway • Strict RBAC Enforced
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-2xl p-6 shadow-luxury-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200">Terminal Authentication</span>
            <Badge variant="amber" className="font-mono text-[10px]">
              SOC-2 SECURED
            </Badge>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" /> Corporate Email
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cashier@orqiva.io"
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors text-xs"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Password
              </label>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors text-xs"
              />
            </div>

            <Button
              id="login-submit-btn"
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="w-full gap-2 mt-2"
            >
              {loading ? "Authenticating..." : "Authorize Terminal Session"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Fast-switch buttons for demonstration / testing */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Quick Test Credentials:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("cashier@orqiva.io")}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-3 h-3 text-amber-400" />
                Senior Cashier
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin@orqiva.io")}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Super Admin
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
