"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Boxes, ArrowRightLeft, ShieldCheck, AlertTriangle, CheckCircle, Plus } from "lucide-react";

interface ProductRow {
  sku: string;
  name: string;
  category: string;
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
    category: "Hardware",
    location: "WH-NORTH/Stock",
    costPrice: 420.0,
    sellingPrice: 750.0,
    onHand: 120,
    minAlert: 15,
  },
  {
    sku: "PRD-BAR-SCAN",
    name: "Omni-directional 2D Barcode Scanner",
    category: "Hardware",
    location: "WH-NORTH/Stock",
    costPrice: 65.0,
    sellingPrice: 140.0,
    onHand: 350,
    minAlert: 25,
  },
  {
    sku: "PRD-REC-ROLL",
    name: "Thermal Paper Roll (80mm x 80m)",
    category: "Consumables",
    location: "WH-NORTH/Stock",
    costPrice: 1.2,
    sellingPrice: 3.5,
    onHand: 14,
    minAlert: 50,
  },
];

export default function InventoryPage() {
  const [products] = useState<ProductRow[]>(mockProducts);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            Inventory & Multi-Warehouse Operations
          </h1>
          <p className="text-xs text-slate-400">
            Real-time stock quants with Odoo-style AVCO valuation, min-stock replenishment triggers, and row-locked concurrency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Internal Transfer
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Product SKU
          </Button>
        </div>
      </div>

      {/* Reorder Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-amber-300">Replenishment Trigger Activated</div>
          <div className="text-slate-300">
            Thermal Paper Roll (SKU: <span className="font-mono text-amber-300">PRD-REC-ROLL</span>) has fallen to 14 units, below the 50 unit safety stock threshold.
          </div>
        </div>
      </div>

      {/* Quants Table */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader>
          <div>
            <CardTitle>Physical Stock Quants (WH-NORTH)</CardTitle>
            <CardDescription>
              Protected by PostgreSQL row locks (FOR UPDATE) to prevent overselling across simultaneous POS terminals.
            </CardDescription>
          </div>
          <Badge variant="indigo" className="font-mono text-[10px]">
            CONCURRENCY SAFE
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400">
                <th className="pb-3 font-medium">SKU</th>
                <th className="pb-3 font-medium">Product Description</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Cost (AVCO)</th>
                <th className="pb-3 font-medium">Selling Price</th>
                <th className="pb-3 font-medium text-center">On Hand</th>
                <th className="pb-3 font-medium text-center">Safety Min</th>
                <th className="pb-3 font-medium text-right">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {products.map((item) => {
                const isLow = item.onHand <= item.minAlert;
                return (
                  <tr key={item.sku} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-mono text-amber-400 font-semibold">{item.sku}</td>
                    <td className="py-3.5 text-slate-200">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.category}</div>
                    </td>
                    <td className="py-3.5 text-slate-300 font-mono">{item.location}</td>
                    <td className="py-3.5 text-slate-300 font-mono">${item.costPrice.toFixed(2)}</td>
                    <td className="py-3.5 text-slate-100 font-mono font-medium">${item.sellingPrice.toFixed(2)}</td>
                    <td className="py-3.5 text-center font-mono font-bold text-slate-100">
                      {item.onHand} units
                    </td>
                    <td className="py-3.5 text-center font-mono text-slate-400">
                      {item.minAlert}
                    </td>
                    <td className="py-3.5 text-right">
                      {isLow ? (
                        <Badge variant="amber" className="font-mono text-[10px]">
                          LOW STOCK
                        </Badge>
                      ) : (
                        <Badge variant="emerald" className="font-mono text-[10px]">
                          OPTIMAL
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
