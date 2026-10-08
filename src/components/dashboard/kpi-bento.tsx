"use client";

import React from "react";
import { TrendingUp, Boxes, CircleDollarSign, Users, ArrowUpRight } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

export function KpiBento() {
  const stats = [
    {
      title: "Real-Time Sales Revenue",
      value: "$148,250.00",
      change: "+14.8%",
      changeType: "positive",
      subtext: "vs prior 30-day billing cycle",
      icon: TrendingUp,
      badge: "Double-Entry Verified",
      badgeVariant: "emerald" as const,
      color: "from-amber-500/10 to-amber-500/0",
      iconColor: "text-amber-400",
    },
    {
      title: "Inventory Asset Valuation",
      value: "$286,400.00",
      change: "470 Units",
      changeType: "neutral",
      subtext: "AVCO Moving Average Costing",
      icon: Boxes,
      badge: "2 Active Hubs",
      badgeVariant: "indigo" as const,
      color: "from-indigo-500/10 to-indigo-500/0",
      iconColor: "text-indigo-400",
    },
    {
      title: "Active POS Registers",
      value: "$12,480.00",
      change: "Session #00045",
      changeType: "positive",
      subtext: "Cash In Register: $2,850.00",
      icon: CircleDollarSign,
      badge: "Locked & Reconciled",
      badgeVariant: "amber" as const,
      color: "from-amber-500/10 to-amber-500/0",
      iconColor: "text-amber-400",
    },
    {
      title: "Monthly Payroll Obligation",
      value: "$68,400.00",
      change: "100% Tax Compliant",
      changeType: "positive",
      subtext: "12 Execs & Floor Staff",
      icon: Users,
      badge: "Auto-Journaled",
      badgeVariant: "slate" as const,
      color: "from-slate-500/10 to-slate-500/0",
      iconColor: "text-slate-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card
            key={idx}
            hoverEffect
            className="relative overflow-hidden bg-gradient-to-b bg-slate-900/40 border-slate-800"
          >
            <div className={`absolute -right-6 -bottom-6 w-28 h-28 bg-gradient-to-br ${stat.color} rounded-full blur-xl pointer-events-none`} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">{stat.title}</span>
              <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                <Icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <div className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
                {stat.value}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="text-emerald-400 font-medium flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {stat.change}
                </span>
                <span>•</span>
                <span>{stat.subtext}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <Badge variant={stat.badgeVariant} className="text-[10px] py-0 px-2 font-mono">
                {stat.badge}
              </Badge>
              <span className="text-[10px] text-slate-400 font-mono">SOC-2 VERIFIED</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
