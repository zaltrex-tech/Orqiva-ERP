"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Scale,
  DollarSign,
  RefreshCw,
  Building2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";
import {
  TrialBalanceReport,
  ProfitAndLossReport,
  BalanceSheetReport,
} from "@/modules/accounting/financial-reports";

export default function FinancialReportsPage() {
  const { t, locale } = useI18n();

  const [activeTab, setActiveTab] = useState<"trial-balance" | "pnl" | "balance-sheet">("trial-balance");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceReport | null>(null);
  const [pnlData, setPnlData] = useState<ProfitAndLossReport | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetReport | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: activeTab });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/v1/accounting/reports?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load financial report");
      }

      if (activeTab === "trial-balance") {
        setTrialBalanceData(json.data);
      } else if (activeTab === "pnl") {
        setPnlData(json.data);
      } else if (activeTab === "balance-sheet") {
        setBalanceSheetData(json.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate]);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        type: activeTab,
        export: "csv",
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/v1/accounting/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export report CSV");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Financial statement exported to CSV successfully");
    } catch (err: any) {
      toast.error(err.message || "Export error");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0 print:space-y-4">
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            aside,
            header,
            nav,
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .print-clean {
              background: #ffffff !important;
              border: 1px solid #e2e8f0 !important;
              color: #000000 !important;
              box-shadow: none !important;
            }
            .print-clean * {
              color: #000000 !important;
              border-color: #cbd5e1 !important;
            }
          }
        `}</style>

        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5 no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="amber" className="text-xs">
                {t("accounting.title", "General Ledger")}
              </Badge>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs font-mono">IFRS / SOC2 Compliant</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <FileSpreadsheet className="h-7 w-7 text-amber-500" />
              {t("reports.title", "Executive Financial Statements")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("reports.subtitle", "Real-time general ledger financial reports, audit verification, and export engine.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={loading}
              className="border-border/60 hover:bg-accent/40"
            >
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin text-amber-400" : ""}`} />
              {t("common.refresh", "Refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting || loading}
              className="border-border/60 hover:bg-accent/40 text-foreground"
            >
              <Download className="h-4 w-4 me-2 text-emerald-400" />
              {t("reports.exportCsv", "Export CSV")}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-600/20"
            >
              <Printer className="h-4 w-4 me-2" />
              {t("reports.printPdf", "Print / PDF")}
            </Button>
          </div>
        </div>

        {/* Print Letterhead Header (Only displayed when printing) */}
        <div className="hidden print-only text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold text-black tracking-tight">ORQIVA ENTERPRISE ERP</h1>
          <p className="text-sm text-gray-600 font-mono">FINANCIAL AUDIT STATEMENT • IFRS & DOUBLE-ENTRY VERIFIED</p>
          <p className="text-xs text-gray-500 mt-1">
            Generated: {new Date().toLocaleString()} • Tenant: ORQ-MAIN
          </p>
        </div>

        {/* Filter & Navigation Toolbar */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print shadow-sm">
          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto p-1 bg-background/60 rounded-lg border border-border/40">
            <button
              onClick={() => setActiveTab("trial-balance")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeTab === "trial-balance"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              {t("reports.trialBalance", "Trial Balance")}
            </button>
            <button
              onClick={() => setActiveTab("pnl")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeTab === "pnl"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t("reports.profitAndLoss", "Profit & Loss (P&L)")}
            </button>
            <button
              onClick={() => setActiveTab("balance-sheet")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeTab === "balance-sheet"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {t("reports.balanceSheet", "Balance Sheet")}
            </button>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-3 w-full md:w-auto text-xs">
            <div className="flex items-center gap-2 bg-background/60 border border-border/40 rounded-lg px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none"
                placeholder="Start Date"
                title="Start Date"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none"
                placeholder="End Date"
                title="End Date"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: TRIAL BALANCE (ميزان المراجعة) */}
        {activeTab === "trial-balance" && (
          <div className="space-y-6">
            {/* KPI Cards / Audit Invariant Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {t("reports.debit", "Debit")} (Sum)
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-emerald-400">
                    ${trialBalanceData?.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {t("reports.credit", "Credit")} (Sum)
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-cyan-400">
                    ${trialBalanceData?.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    Mathematical Delta
                  </CardDescription>
                  <CardTitle className={`text-xl font-bold font-mono ${trialBalanceData?.isBalanced ? "text-emerald-400" : "text-rose-400"}`}>
                    ${trialBalanceData?.delta.toFixed(4) ?? "0.00"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    Audit Verification Status
                  </CardDescription>
                  <div className="pt-1">
                    {trialBalanceData?.isBalanced ? (
                      <Badge variant="emerald" className="text-xs py-1 px-2.5 font-mono flex items-center gap-1.5 w-fit">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("reports.balanced", "BALANCED")} (100% INVARIANT)
                      </Badge>
                    ) : (
                      <Badge variant="rose" className="text-xs py-1 px-2.5 font-mono flex items-center gap-1.5 w-fit">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t("reports.unbalanced", "UNBALANCED")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Trial Balance Data Table */}
            <div className="bg-card/70 border border-border/50 rounded-xl overflow-hidden shadow-sm print-clean">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-500" />
                    {t("reports.trialBalance", "Trial Balance")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time aggregated ledger accounts and net balances.
                  </p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {trialBalanceData?.rows.length ?? 0} Accounts Audited
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40 text-muted-foreground font-medium uppercase tracking-wider">
                      <th className="py-3 px-4 text-start">{t("reports.accountCode", "Account Code")}</th>
                      <th className="py-3 px-4 text-start">{t("reports.accountName", "Account Name")}</th>
                      <th className="py-3 px-4 text-start">{t("reports.type", "Category")}</th>
                      <th className="py-3 px-4 text-end">{t("reports.debit", "Debit")}</th>
                      <th className="py-3 px-4 text-end">{t("reports.credit", "Credit")}</th>
                      <th className="py-3 px-4 text-end">Net Debit</th>
                      <th className="py-3 px-4 text-end">Net Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {trialBalanceData?.rows.map((row) => (
                      <tr key={row.code} className="hover:bg-accent/20 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-semibold text-amber-400 text-start">
                          {row.code}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-foreground text-start">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-start">
                          <span className="bg-background/80 px-2 py-0.5 rounded border border-border/40 text-[10px]">
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono text-foreground">
                          {row.debit > 0 ? `$${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono text-foreground">
                          {row.credit > 0 ? `$${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono text-emerald-400">
                          {row.netDebit > 0 ? `$${row.netDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono text-cyan-400">
                          {row.netCredit > 0 ? `$${row.netCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t-2 border-border/80 font-bold font-mono text-sm">
                      <td colSpan={3} className="py-3 px-4 text-start uppercase text-muted-foreground">
                        Grand Audit Total
                      </td>
                      <td className="py-3 px-4 text-end text-emerald-400">
                        ${trialBalanceData?.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                      </td>
                      <td className="py-3 px-4 text-end text-cyan-400">
                        ${trialBalanceData?.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-end text-muted-foreground">
                        Invariant Match: {trialBalanceData?.isBalanced ? "100%" : "FAIL"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROFIT & LOSS (قائمة الدخل) */}
        {activeTab === "pnl" && (
          <div className="space-y-6">
            {/* P&L Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {t("reports.revenue", "Operating Revenue")}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-emerald-400 flex items-center justify-between">
                    <span>${pnlData?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}</span>
                    <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {t("reports.cogs", "Cost of Goods Sold (COGS)")}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-amber-400 flex items-center justify-between">
                    <span>${pnlData?.totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}</span>
                    <ArrowDownRight className="h-5 w-5 text-amber-400" />
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {t("reports.grossProfit", "Gross Profit")}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-cyan-400">
                    ${pnlData?.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {t("reports.netIncome", "Net Operating Income")}
                  </CardDescription>
                  <CardTitle className={`text-xl font-bold font-mono ${(pnlData?.netOperatingIncome ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ${pnlData?.netOperatingIncome.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                    <span className="text-xs font-normal text-muted-foreground ms-2">
                      ({pnlData?.netMarginPercentage.toFixed(1)}%)
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* P&L Statement Breakdowns */}
            <div className="bg-card/70 border border-border/50 rounded-xl overflow-hidden shadow-sm print-clean">
              <div className="p-4 border-b border-border/40">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  {t("reports.profitAndLoss", "Profit & Loss (P&L)")}
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* 1. Operating Revenue */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="font-semibold text-foreground text-sm uppercase tracking-wider text-emerald-400">
                      1. {t("reports.revenue", "Operating Revenue")}
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      ${pnlData?.totalRevenue.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  {pnlData?.operatingRevenue.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic ps-4">No revenue entries recorded.</p>
                  ) : (
                    pnlData?.operatingRevenue.map((item) => (
                      <div key={item.code} className="flex items-center justify-between text-xs ps-4 py-1 text-muted-foreground">
                        <span>
                          <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                        </span>
                        <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. Cost of Goods Sold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="font-semibold text-foreground text-sm uppercase tracking-wider text-amber-400">
                      2. {t("reports.cogs", "Cost of Goods Sold (COGS)")}
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      (${pnlData?.totalCogs.toFixed(2) ?? "0.00"})
                    </span>
                  </div>
                  {pnlData?.costOfGoodsSold.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic ps-4">No cost of goods sold recorded.</p>
                  ) : (
                    pnlData?.costOfGoodsSold.map((item) => (
                      <div key={item.code} className="flex items-center justify-between text-xs ps-4 py-1 text-muted-foreground">
                        <span>
                          <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                        </span>
                        <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Gross Profit Subtotal */}
                <div className="bg-muted/20 border-y border-border/40 p-3 flex items-center justify-between rounded-lg">
                  <span className="font-bold text-sm text-foreground">{t("reports.grossProfit", "Gross Profit")}</span>
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    ${pnlData?.grossProfit.toFixed(2) ?? "0.00"}
                  </span>
                </div>

                {/* 3. Operating Expenses */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="font-semibold text-foreground text-sm uppercase tracking-wider text-rose-400">
                      3. {t("reports.expenses", "Operating Expenses")}
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      (${pnlData?.totalExpenses.toFixed(2) ?? "0.00"})
                    </span>
                  </div>
                  {pnlData?.operatingExpenses.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic ps-4">No operating expenses recorded.</p>
                  ) : (
                    pnlData?.operatingExpenses.map((item) => (
                      <div key={item.code} className="flex items-center justify-between text-xs ps-4 py-1 text-muted-foreground">
                        <span>
                          <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                        </span>
                        <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Net Operating Income Grand Total */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex items-center justify-between rounded-xl">
                  <div>
                    <span className="font-bold text-base text-foreground block">{t("reports.netIncome", "Net Operating Income")}</span>
                    <span className="text-xs text-muted-foreground">Operating margin: {pnlData?.netMarginPercentage.toFixed(2)}%</span>
                  </div>
                  <span className={`font-mono font-bold text-lg ${(pnlData?.netOperatingIncome ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ${pnlData?.netOperatingIncome.toFixed(2) ?? "0.00"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BALANCE SHEET (الميزانية العمومية) */}
        {activeTab === "balance-sheet" && (
          <div className="space-y-6">
            {/* Balance Sheet Invariant Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    Total Assets (الأصول)
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-emerald-400">
                    ${balanceSheetData?.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    Total Liabilities & Equity (الخصوم وحقوق الملكية)
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-mono text-cyan-400">
                    ${balanceSheetData?.totalLiabilitiesAndEquity.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-card/70 border-border/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    Accounting Equation Invariant (Assets = Liabilities + Equity)
                  </CardDescription>
                  <div className="pt-1">
                    {balanceSheetData?.isBalanced ? (
                      <Badge variant="emerald" className="text-xs py-1 px-2.5 font-mono flex items-center gap-1.5 w-fit">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        BALANCED (Variance: ${balanceSheetData.variance.toFixed(2)})
                      </Badge>
                    ) : (
                      <Badge variant="rose" className="text-xs py-1 px-2.5 font-mono flex items-center gap-1.5 w-fit">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        VARIANCE DETECTED (${balanceSheetData?.variance.toFixed(2)})
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Two-Column Side-by-Side Balance Sheet: Assets vs Liabilities & Equity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: ASSETS */}
              <div className="bg-card/70 border border-border/50 rounded-xl overflow-hidden shadow-sm print-clean p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t("reports.assets", "Assets")}
                  </h3>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    ${balanceSheetData?.totalAssets.toFixed(2) ?? "0.00"}
                  </span>
                </div>

                {/* Current Assets */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Current Assets (الأصول المتداولة)
                  </span>
                  {balanceSheetData?.currentAssets.map((item) => (
                    <div key={item.code} className="flex items-center justify-between text-xs ps-3 py-1">
                      <span>
                        <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                      </span>
                      <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Non-Current Assets */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Non-Current Assets (الأصول غير المتداولة)
                  </span>
                  {balanceSheetData?.nonCurrentAssets.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic ps-3">None</p>
                  ) : (
                    balanceSheetData?.nonCurrentAssets.map((item) => (
                      <div key={item.code} className="flex items-center justify-between text-xs ps-3 py-1">
                        <span>
                          <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                        </span>
                        <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: LIABILITIES & EQUITY */}
              <div className="bg-card/70 border border-border/50 rounded-xl overflow-hidden shadow-sm print-clean p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {t("reports.liabilities", "Liabilities")} & {t("reports.equity", "Equity")}
                  </h3>
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    ${balanceSheetData?.totalLiabilitiesAndEquity.toFixed(2) ?? "0.00"}
                  </span>
                </div>

                {/* Liabilities */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Current Liabilities (الالتزامات المتداولة)
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Subtotal: ${balanceSheetData?.totalLiabilities.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  {balanceSheetData?.currentLiabilities.map((item) => (
                    <div key={item.code} className="flex items-center justify-between text-xs ps-3 py-1">
                      <span>
                        <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                      </span>
                      <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Equity */}
                <div className="space-y-2 border-t border-border/30 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Equity & Retained Earnings (حقوق الملكية)
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Subtotal: ${balanceSheetData?.totalEquity.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  {balanceSheetData?.equityAccounts.map((item) => (
                    <div key={item.code} className="flex items-center justify-between text-xs ps-3 py-1">
                      <span>
                        <span className="font-mono text-amber-400 me-2">{item.code}</span> {item.name}
                      </span>
                      <span className="font-mono text-foreground">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs ps-3 py-1 text-emerald-400">
                    <span>Current Period Retained Earnings</span>
                    <span className="font-mono font-semibold">
                      ${balanceSheetData?.currentPeriodNetEarnings.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
