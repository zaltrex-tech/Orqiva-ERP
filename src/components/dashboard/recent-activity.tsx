"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { ShieldCheck, ArrowRightLeft, FileCheck2, UserCheck, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function RecentActivity() {
  const { t, locale } = useI18n();

  const auditEvents = [
    {
      id: "AUD-9821",
      time: locale === "ar" ? "منذ دقيقتين" : "2 mins ago",
      action: "STOCK_ADJUSTMENT",
      actionLabel: locale === "ar" ? "حركة تسوية مخزنية" : "STOCK_ADJUSTMENT",
      entity: "StockMove WH/OUT/0049",
      actor: "cashier@orqiva.io",
      details: locale === "ar"
        ? "خصم وحدتين من أجهزة شاشات اللمس (WH-NORTH/Stock → العميل)"
        : "Deducted 2x Touch POS Terminals (WH-NORTH/Stock → Customer)",
      badge: t("dashboard.rowLocked", "Row-Locked"),
      badgeVariant: "emerald" as const,
      icon: ArrowRightLeft,
    },
    {
      id: "AUD-9820",
      time: locale === "ar" ? "منذ 14 دقيقة" : "14 mins ago",
      action: "POST_LEDGER",
      actionLabel: locale === "ar" ? "ترحيل قيد يومية" : "POST_LEDGER",
      entity: "JournalEntry JE-2026-00109",
      actor: "finance@orqiva.io",
      details: locale === "ar"
        ? "مدين 1010 ($1,500.00) == دائن 4010 ($1,500.00)"
        : "Debit 1010 ($1,500.00) == Credit 4010 ($1,500.00)",
      badge: t("dashboard.balancedInvariant", "Balanced Invariant"),
      badgeVariant: "amber" as const,
      icon: FileCheck2,
    },
    {
      id: "AUD-9819",
      time: locale === "ar" ? "منذ 48 دقيقة" : "48 mins ago",
      action: "POS_ORDER",
      actionLabel: locale === "ar" ? "طلب نقطة بيع" : "POS_ORDER",
      entity: "PosOrder POS-ORD-00045-12",
      actor: "cashier@orqiva.io",
      details: locale === "ar"
        ? "بيع نقدي مكتمل عبر نقطة البيع رقم #01 ($350.00)"
        : "Terminal #01 Cash Sale completed ($350.00)",
      badge: t("dashboard.cashReconciled", "Cash Reconciled"),
      badgeVariant: "indigo" as const,
      icon: ShoppingBag,
    },
    {
      id: "AUD-9818",
      time: locale === "ar" ? "منذ ساعة" : "1 hour ago",
      action: "SECURITY_LOGIN",
      actionLabel: locale === "ar" ? "تسجيل دخول أمني" : "SECURITY_LOGIN",
      entity: "User admin@orqiva.io",
      actor: "admin@orqiva.io",
      details: locale === "ar"
        ? "تم تأكيد مفتاح الأمان Hardware MFA عبر IP 192.168.1.104"
        : "Hardware MFA token validated via IPv4 192.168.1.104",
      badge: t("dashboard.soc2Verified", "SOC-2 Verified"),
      badgeVariant: "slate" as const,
      icon: UserCheck,
    },
  ];

  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <CardTitle>{t("dashboard.auditTitle", "Immutable Ledger & Transaction Audit Feed")}</CardTitle>
        </div>
        <Badge variant="emerald" className="font-mono text-[10px]">
          {t("dashboard.soc2Audited", "SOC-2 TYPE II AUDITED")}
        </Badge>
      </CardHeader>

      <CardDescription className="mb-4">
        {t("dashboard.auditDesc", "Append-only event sourcing log. State transitions are cryptographic and irreversible.")}
      </CardDescription>

      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400">
              <th className="pb-2.5 font-medium text-start">{t("dashboard.traceId", "Trace ID")}</th>
              <th className="pb-2.5 font-medium text-start">{t("common.action", "Action")}</th>
              <th className="pb-2.5 font-medium text-start">{t("dashboard.domainEntity", "Domain Entity")}</th>
              <th className="pb-2.5 font-medium text-start">{t("dashboard.actor", "Actor")}</th>
              <th className="pb-2.5 font-medium text-start">{t("dashboard.ledgerDetail", "Ledger / State Detail")}</th>
              <th className="pb-2.5 font-medium text-end">{t("dashboard.verification", "Verification")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {auditEvents.map((evt) => {
              const Icon = evt.icon;
              return (
                <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-mono text-slate-400 text-start">{evt.id}</td>
                  <td className="py-3 text-start">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      {evt.actionLabel}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300 font-mono text-start">{evt.entity}</td>
                  <td className="py-3 text-slate-400 text-start">{evt.actor}</td>
                  <td className="py-3 text-slate-300 max-w-xs truncate text-start">{evt.details}</td>
                  <td className="py-3 text-end">
                    <Badge variant={evt.badgeVariant} className="font-mono text-[10px]">
                      {evt.badge}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
