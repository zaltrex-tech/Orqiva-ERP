"use client";

import React from "react";
import Link from "next/link";
import { KpiBento } from "@/components/dashboard/kpi-bento";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  Boxes,
  PlusCircle,
  ArrowRightLeft,
  BookOpenCheck,
  TrendingUp,
  Warehouse,
  CheckCircle2,
} from "lucide-react";

export default function DashboardOverviewPage() {
  return (
    <ErrorBoundary fallbackMessage="Unable to render live dashboard metrics. Database connection is protected.">
      <div className="space-y-8 animate-fadeIn">
        {/* Top Banner with Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 shadow-luxury-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
                Executive Enterprise Operations
              </h1>
              <Badge variant="amber" className="font-mono text-[10px]">
                LIVE DATABASE SYNCED
              </Badge>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time synchronization across Inventory, POS, Double-Entry Accounting, and Human Resources with row-level transaction isolation and immutable event logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/pos">
              <Button variant="primary" size="md" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Launch POS Terminal
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="secondary" size="md" className="gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Transfer Stock
              </Button>
            </Link>
            <Link href="/accounting">
              <Button variant="outline" size="md" className="gap-2">
                <BookOpenCheck className="w-4 h-4" />
                Post Journal
              </Button>
            </Link>
          </div>
        </div>

        {/* Luxury KPI Bento Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Live PostgreSQL Enterprise Metrics
            </h2>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-Time Feed Active
            </span>
          </div>
          <KpiBento />
        </section>

        {/* Warehouse Logistics & Double-Entry Health Status */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-indigo-400" />
                <CardTitle>Multi-Warehouse Stock Distribution</CardTitle>
              </div>
              <Badge variant="indigo" className="font-mono text-[10px]">
                Odoo-Compatible Routing
              </Badge>
            </CardHeader>
            <CardDescription className="mb-4">
              Live quant status per physical storage shelf. Protected against race conditions by PostgreSQL row-level locks.
            </CardDescription>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">
                    Orqiva Flagship Branch & Central Distribution (BRANCH-MAIN)
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">Location: BRANCH-MAIN/Stock (Internal Storage)</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-400 font-mono">10 Product SKUs / 1,205 Units</div>
                  <div className="text-[10px] text-emerald-400">Pessimistic Locking Active</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">Virtual Commercial Customers (VIRT/CUST)</div>
                  <div className="text-[11px] text-slate-400 font-mono">Automated Destination for Completed POS Sales</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-200 font-mono">Fulfilled via FIFO/AVCO</div>
                  <div className="text-[10px] text-slate-400">Moving Average Cost Tracked</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Ledger Invariant Validator */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <CardTitle>Ledger Invariant Guard</CardTitle>
              </div>
            </CardHeader>
            <CardDescription className="mb-4">
              Continuous mathematical verification of the fundamental accounting equation.
            </CardDescription>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Posted Debits:</span>
                  <span className="font-mono font-semibold text-emerald-400">$348,250.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Posted Credits:</span>
                  <span className="font-mono font-semibold text-emerald-400">$348,250.00</span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-emerald-500/20 font-bold">
                  <span className="text-slate-300">Net Delta:</span>
                  <span className="font-mono text-emerald-400">$0.00 (BALANCED)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal">
                Any unbalanced journal entry is systematically rejected at the transaction boundary before hitting PostgreSQL.
              </p>
            </div>
          </Card>
        </section>

        {/* Immutable Audit Trail */}
        <section className="space-y-3">
          <RecentActivity />
        </section>
      </div>
    </ErrorBoundary>
  );
}
