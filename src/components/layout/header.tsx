"use client";

import React from "react";
import { Search, Bell, Building2, Shield } from "lucide-react";
import { Badge } from "../ui/badge";
import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "@/lib/i18n/context";

export function Header() {
  const { t } = useI18n();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Start: Organization & Global Search */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-200">{t("common.enterprise", "Orqiva Holdings")}</span>
          <span className="text-slate-400 font-mono text-[11px]">(ORQ-MAIN)</span>
        </div>

        <div className="relative w-80 hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("header.searchPlaceholder", "Search SKU, Ledger, PO, Invoices... (Ctrl+K)")}
            className="w-full ps-9 pe-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
      </div>

      {/* End: Role, Language Switcher, Notifications, User */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="amber" className="flex items-center gap-1 font-mono text-[11px]">
            <Shield className="w-3 h-3" />
            {t("header.superAdmin", "SUPER ADMIN")}
          </Badge>
          <div className="w-2 h-2 rounded-full bg-emerald-400" title="Active Cash Session #00045" />
        </div>

        {/* Bilingual Switcher */}
        <LanguageSwitcher />

        <button
          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors relative"
          title={t("header.notifications", "Notifications")}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
        </button>

        <div className="flex items-center gap-2.5 ps-3 border-s border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center font-bold text-slate-950 text-xs shadow-luxury-sm">
            AV
          </div>
          <div className="hidden lg:block text-start">
            <div className="text-xs font-semibold text-slate-200">Alexander Vance</div>
            <div className="text-[10px] text-slate-400">admin@orqiva.io</div>
          </div>
        </div>
      </div>
    </header>
  );
}
