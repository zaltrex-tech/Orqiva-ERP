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
} from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "../ui/badge";

const navigationItems = [
  { name: "Executive Overview", href: "/", icon: LayoutDashboard },
  { name: "Inventory & Logistics", href: "/inventory", icon: Boxes },
  { name: "Point of Sale", href: "/pos", icon: CircleDollarSign },
  { name: "Financial Accounting", href: "/accounting", icon: Receipt },
  { name: "Human Resources", href: "/hr", icon: Users2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-2xl">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-glow-amber text-lg">
              Ω
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-slate-100 flex items-center gap-1.5">
                ORQIVA <span className="text-[10px] font-normal px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">ERP</span>
              </span>
              <p className="text-[11px] text-slate-400 tracking-tight">Modular Monolith</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-3 mb-2">
            Enterprise Domains
          </div>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
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
        </nav>
      </div>

      {/* System Health & Architecture Footer */}
      <div className="p-4 border-t border-slate-800/60 space-y-3">
        <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Redis Queue
            </span>
            <Badge variant="emerald" className="text-[10px] py-0 px-1.5">Connected</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> SOC2 Invariant
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">ENFORCED</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
