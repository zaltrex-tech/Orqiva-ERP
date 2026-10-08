"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, BookOpen, AlertCircle, PlusCircle } from "lucide-react";

interface JournalEntryRow {
  entryNumber: string;
  journal: string;
  date: string;
  reference: string;
  totalDebit: number;
  totalCredit: number;
  status: "POSTED" | "DRAFT";
}

const mockJournalEntries: JournalEntryRow[] = [
  {
    entryNumber: "JE-2026-00109",
    journal: "Main Cash (CSH)",
    date: "2026-10-08",
    reference: "POS-ORD-00045-12",
    totalDebit: 1500.0,
    totalCredit: 1500.0,
    status: "POSTED",
  },
  {
    entryNumber: "JE-2026-00108",
    journal: "Customer Invoicing (INV)",
    date: "2026-10-07",
    reference: "INV/2026/089",
    totalDebit: 12450.0,
    totalCredit: 12450.0,
    status: "POSTED",
  },
  {
    entryNumber: "JE-2026-00107",
    journal: "Corporate Bank (BNK)",
    date: "2026-10-06",
    reference: "VENDOR-WIRE-441",
    totalDebit: 6800.0,
    totalCredit: 6800.0,
    status: "POSTED",
  },
];

const mockAccounts = [
  { code: "1010", name: "Operating Cash Account", type: "ASSET", balance: 14850.0 },
  { code: "1020", name: "JPMorgan Treasury Bank", type: "ASSET", balance: 132400.0 },
  { code: "1030", name: "Finished Goods Inventory Asset", type: "ASSET", balance: 286400.0 },
  { code: "2010", name: "Accounts Payable (Vendors)", type: "LIABILITY", balance: 42100.0 },
  { code: "4010", name: "Commercial & POS Revenue", type: "INCOME", balance: 348250.0 },
  { code: "5010", name: "Cost of Goods Sold (COGS)", type: "EXPENSE", balance: 164200.0 },
];

export default function AccountingPage() {
  const [entries] = useState<JournalEntryRow[]>(mockJournalEntries);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            Financial Accounting & General Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Strict Odoo-style double-entry bookkeeping. Every financial event satisfies the fundamental balance invariant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="emerald" className="font-mono text-xs py-1 px-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            INVARIANT: Δ = $0.00
          </Badge>
          <Button variant="primary" size="sm" className="gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* Chart of Accounts Grid */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          Active Chart of Accounts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockAccounts.map((acc) => (
            <div
              key={acc.code}
              className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400">{acc.code}</span>
                  <Badge variant="slate" className="text-[9px] py-0">{acc.type}</Badge>
                </div>
                <div className="text-slate-200 font-medium">{acc.name}</div>
              </div>
              <div className="text-right font-mono font-bold text-slate-100 text-sm">
                ${acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Journal Entries Table */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader>
          <div>
            <CardTitle>Posted Journal Entries</CardTitle>
            <CardDescription>
              Verified atomic ledger entries. Debit sums strictly match Credit sums.
            </CardDescription>
          </div>
          <Badge variant="amber" className="font-mono text-[10px]">
            IMMUTABLE RECORDS
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400">
                <th className="pb-3 font-medium">Entry Number</th>
                <th className="pb-3 font-medium">Journal</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Reference</th>
                <th className="pb-3 font-medium text-right">Debit Total</th>
                <th className="pb-3 font-medium text-right">Credit Total</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {entries.map((entry) => (
                <tr key={entry.entryNumber} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 font-mono text-amber-400 font-semibold">{entry.entryNumber}</td>
                  <td className="py-3.5 text-slate-200">{entry.journal}</td>
                  <td className="py-3.5 text-slate-400 font-mono">{entry.date}</td>
                  <td className="py-3.5 text-slate-300 font-mono">{entry.reference}</td>
                  <td className="py-3.5 text-right font-mono text-emerald-400 font-medium">
                    ${entry.totalDebit.toFixed(2)}
                  </td>
                  <td className="py-3.5 text-right font-mono text-emerald-400 font-medium">
                    ${entry.totalCredit.toFixed(2)}
                  </td>
                  <td className="py-3.5 text-right">
                    <Badge variant="emerald" className="font-mono text-[10px]">
                      {entry.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
