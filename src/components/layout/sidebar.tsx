"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  CircleDollarSign,
  Receipt,
  Users2,
  ShieldCheck,
  Server,
  Zap,
  UserCog,
  Truck,
  FileSpreadsheet,
  ArrowLeftRight,
  ClipboardCheck,
} from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "../ui/badge";
import { useI18n } from "@/lib/i18n/context";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const domainItems = [
    { name: t("nav.overview", "Executive Overview"), href: "/", icon: LayoutDashboard },
    { name: t("nav.inventory", "Inventory & Logistics"), href: "/inventory", icon: Boxes },
    { name: t("nav.transfers", "Stock Transfers"), href: "/inventory/transfers", icon: ArrowLeftRight },
    { name: t("nav.adjustments", "Stocktake Adjustments"), href: "/inventory/adjustments", icon: ClipboardCheck },
    { name: t("nav.purchases", "Purchases & Suppliers"), href: "/purchases", icon: Truck },
    { name: t("nav.pos", "Point of Sale"), href: "/pos", icon: CircleDollarSign },
    { name: t("nav.accounting", "Financial Accounting"), href: "/accounting", icon: Receipt },
    { name: t("nav.reports", "Financial Statements"), href: "/accounting/reports", icon: FileSpreadsheet },
    { name: t("nav.hr", "Human Resources"), href: "/hr", icon: Users2 },
  ];

  const adminItems = [
    { name: t("nav.users", "User Management"), href: "/admin/users", icon: UserCog },
  ];

  return (
    <aside className="w-64 bg-slate-950/80 border-e border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-2xl">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-glow-amber text-lg">
              Ω
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-slate-100 flex items-center gap-1.5">
                {t("common.appName", "ORQIVA")}{" "}
                <span className="text-[10px] font-normal px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ERP
                </span>
              </span>
              <p className="text-[11px] text-slate-400 tracking-tight">{t("common.appSub", "Modular Monolith")}</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-4">
          <div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-3 mb-2">
              {t("nav.domains", "Enterprise Domains")}
            </div>
            <div className="space-y-1">
              {domainItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-luxury-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-4 h-4 transition-transform group-hover:scale-110",
                        isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-3 mb-2">
              {t("nav.administration", "Administration")}
            </div>
            <div className="space-y-1">
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-luxury-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-4 h-4 transition-transform group-hover:scale-110",
                        isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* System Health & Architecture Footer */}
      <div className="p-4 border-t border-slate-800/60 space-y-3">
        <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-emerald-400" /> {t("nav.postgresDb", "PostgreSQL")}
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> {t("nav.redisQueue", "Redis Queue")}
            </span>
            <Badge variant="emerald" className="text-[10px] py-0 px-1.5">{t("nav.connected", "Connected")}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> {t("nav.soc2Invariant", "SOC2 Invariant")}
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">{t("nav.soc2Enforced", "ENFORCED")}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
