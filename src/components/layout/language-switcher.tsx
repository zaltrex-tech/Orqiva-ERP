"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function LanguageSwitcher() {
  const { locale, toggleLocale } = useI18n();

  return (
    <button
      id="language-switcher-btn"
      onClick={toggleLocale}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all cursor-pointer shadow-luxury-sm group"
      title={locale === "en" ? "التبديل إلى اللغة العربية" : "Switch to English"}
    >
      <Globe className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
      <span className="font-semibold text-xs tracking-wider">
        {locale === "en" ? "العربية" : "English"}
      </span>
      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono uppercase">
        {locale === "en" ? "AR" : "EN"}
      </span>
    </button>
  );
}
