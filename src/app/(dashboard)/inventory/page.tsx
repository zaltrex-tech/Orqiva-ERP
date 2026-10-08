"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Boxes, ArrowRightLeft, AlertTriangle, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface ProductRow {
  sku: string;
  name: string;
  nameAr?: string;
  category: string;
  categoryAr?: string;
  location: string;
  costPrice: number;
  sellingPrice: number;
  onHand: number;
  minAlert: number;
}

const mockProducts: ProductRow[] = [
  {
    sku: "PRD-POS-TERM",
    name: "Orqiva Touch POS Terminal Pro (15.6\")",
    nameAr: "شاشة لمس نقطة بيع أوركيفا برو (15.6 بوصة)",
    category: "Hardware",
    categoryAr: "أجهزة ومعدات",
    location: "WH-NORTH/Stock",
    costPrice: 420.0,
    sellingPrice: 750.0,
    onHand: 120,
    minAlert: 15,
  },
  {
    sku: "PRD-BAR-SCAN",
    name: "Omni-directional 2D Barcode Scanner",
    nameAr: "قارئ باركود ثنائي الأبعاد متعدد الاتجاهات",
    category: "Hardware",
    categoryAr: "أجهزة ومعدات",
    location: "WH-NORTH/Stock",
    costPrice: 65.0,
    sellingPrice: 140.0,
    onHand: 350,
    minAlert: 25,
  },
  {
    sku: "PRD-REC-ROLL",
    name: "Thermal Paper Roll (80mm x 80m)",
    nameAr: "لفائف ورق حراري للإيصالات (80 مم × 80 م)",
    category: "Consumables",
    categoryAr: "مواد استهلاكية",
    location: "WH-NORTH/Stock",
    costPrice: 1.2,
    sellingPrice: 3.5,
    onHand: 14,
    minAlert: 50,
  },
];

export default function InventoryPage() {
  const { t, locale } = useI18n();
  const [products] = useState<ProductRow[]>(mockProducts);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            {t("inventory.title", "Inventory & Multi-Warehouse Operations")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("inventory.subtitle", "Real-time stock quants with Odoo-style AVCO valuation, min-stock replenishment triggers, and row-locked concurrency.")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory/transfers">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {t("inventory.internalTransfer", "Internal Transfer")}
            </Button>
          </Link>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("inventory.newSku", "New Product SKU")}
          </Button>
        </div>
      </div>

      {/* Reorder Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-amber-300">{t("inventory.replenishmentTrigger", "Replenishment Trigger Activated")}</div>
          <div className="text-slate-300">
            {locale === "ar" ? "لفائف ورق حراري" : "Thermal Paper Roll"} (SKU: <span className="font-mono text-amber-300">PRD-REC-ROLL</span>) {t("inventory.replenishmentNotice", "has fallen to 14 units, below the 50 unit safety stock threshold.")}
          </div>
        </div>
      </div>

      {/* Quants Table */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader>
          <div>
            <CardTitle>{t("inventory.quantsTitle", "Physical Stock Quants (WH-NORTH)")}</CardTitle>
            <CardDescription>
              {t("inventory.quantsSubtitle", "Protected by PostgreSQL row locks (FOR UPDATE) to prevent overselling across simultaneous POS terminals.")}
            </CardDescription>
          </div>
          <Badge variant="indigo" className="font-mono text-[10px]">
            {t("inventory.concurrencySafe", "CONCURRENCY SAFE")}
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400">
                <th className="pb-3 font-medium text-start">{t("inventory.sku", "SKU")}</th>
                <th className="pb-3 font-medium text-start">{t("inventory.productDesc", "Product Description")}</th>
                <th className="pb-3 font-medium text-start">{t("inventory.location", "Location")}</th>
                <th className="pb-3 font-medium text-start">{t("inventory.costAvco", "Cost (AVCO)")}</th>
                <th className="pb-3 font-medium text-start">{t("inventory.sellingPrice", "Selling Price")}</th>
                <th className="pb-3 font-medium text-center">{t("inventory.onHand", "On Hand")}</th>
                <th className="pb-3 font-medium text-center">{t("inventory.safetyMin", "Safety Min")}</th>
                <th className="pb-3 font-medium text-end">{t("inventory.stockStatus", "Stock Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {products.map((item) => {
                const isLow = item.onHand <= item.minAlert;
                return (
                  <tr key={item.sku} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-mono text-amber-400 font-semibold text-start">{item.sku}</td>
                    <td className="py-3.5 text-slate-200 text-start">
                      <div>{locale === "ar" && item.nameAr ? item.nameAr : item.name}</div>
                      <div className="text-[10px] text-slate-400">{locale === "ar" && item.categoryAr ? item.categoryAr : item.category}</div>
                    </td>
                    <td className="py-3.5 text-slate-300 font-mono text-start">{item.location}</td>
                    <td className="py-3.5 text-slate-300 font-mono text-start">${item.costPrice.toFixed(2)}</td>
                    <td className="py-3.5 text-slate-100 font-mono font-medium text-start">${item.sellingPrice.toFixed(2)}</td>
                    <td className="py-3.5 text-center font-mono font-bold text-slate-100">
                      {item.onHand} {t("common.units", "units")}
                    </td>
                    <td className="py-3.5 text-center font-mono text-slate-400">
                      {item.minAlert}
                    </td>
                    <td className="py-3.5 text-end">
                      {isLow ? (
                        <Badge variant="amber" className="font-mono text-[10px]">
                          {t("inventory.lowStock", "LOW STOCK")}
                        </Badge>
                      ) : (
                        <Badge variant="emerald" className="font-mono text-[10px]">
                          {t("inventory.optimal", "OPTIMAL")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
