"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
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
        toast.error(t("auth.authFailed", "Authentication Failed"), {
          description: data.error || t("auth.authFailedDesc", "Please check your email and credentials."),
        });
        return;
      }

      toast.success(t("auth.identityVerified", "Identity Verified"), {
        description: t("auth.redirecting", "Welcome back, {name}. Redirecting to operational terminal...").replace(
          "{name}",
          data.data.user.fullName
        ),
      });

      if (data.data.user.role === "CASHIER") {
        router.push("/pos");
      } else {
        router.push("/");
      }
    } catch {
      toast.error(t("auth.networkError", "Network Error"), {
        description: t("auth.networkErrorDesc", "Failed to connect to authentication gateway."),
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
      {/* Top Language Switcher */}
      <div className="absolute top-6 end-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Background ambient light */}
      <div className="absolute top-1/4 inset-x-0 mx-auto w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-glow-amber text-2xl mx-auto">
            Ω
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
            {t("common.appName", "ORQIVA")} ERP
          </h1>
          <p className="text-xs text-slate-400">
            {t("auth.subtitle", "Modular Monolith Enterprise Gateway • Strict RBAC Enforced")}
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-2xl p-6 shadow-luxury-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200">
              {t("auth.title", "Terminal Authentication")}
            </span>
            <Badge variant="amber" className="font-mono text-[10px]">
              {t("auth.soc2Secured", "SOC-2 SECURED")}
            </Badge>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" /> {t("auth.email", "Corporate Email")}
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
                <Lock className="w-3.5 h-3.5 text-amber-400" /> {t("auth.password", "Password")}
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
              {loading ? t("auth.authenticating", "Authenticating...") : t("auth.loginBtn", "Authorize Terminal Session")}
              <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform" />
            </Button>
          </form>

          {/* Fast-switch buttons for demonstration / testing */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              {t("auth.quickCredentials", "Quick Test Credentials:")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("cashier@orqiva.io")}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-3 h-3 text-amber-400" />
                {t("auth.cashierRole", "Senior Cashier")}
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin@orqiva.io")}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                {t("auth.adminRole", "Super Admin")}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
