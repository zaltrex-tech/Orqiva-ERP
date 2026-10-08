"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CircleDollarSign,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  taxRate: number;
  stockAvailable: number;
}

const catalog: CatalogItem[] = [
  {
    id: "1",
    sku: "PRD-POS-TERM",
    name: "Orqiva Touch POS Terminal Pro (15.6\")",
    price: 750.0,
    taxRate: 15.0,
    stockAvailable: 120,
  },
  {
    id: "2",
    sku: "PRD-BAR-SCAN",
    name: "Omni-directional 2D Barcode Scanner",
    price: 140.0,
    taxRate: 15.0,
    stockAvailable: 350,
  },
  {
    id: "3",
    sku: "PRD-REC-ROLL",
    name: "Thermal Paper Roll (80mm x 80m)",
    price: 3.5,
    taxRate: 15.0,
    stockAvailable: 14,
  },
];

interface CartItem extends CatalogItem {
  qty: number;
}

export default function PosPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  const addToCart = (product: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const handleCheckout = (method: "CASH" | "CARD") => {
    if (cart.length === 0) return;
    const orderNo = `POS-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setCheckoutSuccess(`Order ${orderNo} fulfilled via ${method}. Stock quant decremented under row-level lock.`);
    setCart([]);
    setTimeout(() => setCheckoutSuccess(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              POS Terminal 01 • Session #POS-SESS-00045
              <Badge variant="emerald" className="text-[10px] py-0">OPENED</Badge>
            </div>
            <div className="text-xs text-slate-400">
              Cashier: <span className="text-slate-200">Sarah Jenkins</span> • Opening Cash Float: <span className="font-mono text-amber-400">$250.00</span>
            </div>
          </div>
        </div>

        <Badge variant="indigo" className="font-mono text-[11px] self-start md:self-auto">
          ISOLATION: READ COMMITTED + FOR UPDATE
        </Badge>
      </div>

      {checkoutSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs text-emerald-200 font-medium">{checkoutSuccess}</div>
        </div>
      )}

      {/* POS Grid: Catalog on left, Cart on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Quick Touch Catalog
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {catalog.map((item) => (
              <Card
                key={item.id}
                hoverEffect
                onClick={() => addToCart(item)}
                className="bg-slate-900/40 border-slate-800 p-4 space-y-2 select-none"
              >
                <div className="font-mono text-[11px] text-amber-400 font-semibold">{item.sku}</div>
                <div className="text-xs font-semibold text-slate-200 line-clamp-2 min-h-[32px]">{item.name}</div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="text-sm font-bold text-slate-100 font-mono">${item.price.toFixed(2)}</div>
                  <Badge variant="slate" className="text-[10px]">
                    {item.stockAvailable} in stock
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Live Register Cart */}
        <Card className="bg-slate-900/60 border-slate-800 flex flex-col justify-between h-[520px]">
          <div>
            <CardHeader>
              <CardTitle>Current Order Register</CardTitle>
              <Badge variant="amber" className="font-mono text-[10px]">
                {cart.length} ITEMS
              </Badge>
            </CardHeader>

            <div className="overflow-y-auto max-h-[260px] space-y-2 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Cart is empty. Select items from the catalog.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 max-w-[140px]">
                      <div className="font-medium text-slate-200 truncate">{item.name}</div>
                      <div className="font-mono text-slate-400 text-[10px]">
                        ${item.price.toFixed(2)} ea
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-900 rounded border border-slate-800">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="p-1 hover:text-amber-400 text-slate-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-mono font-bold text-slate-200">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="p-1 hover:text-amber-400 text-slate-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="font-mono font-semibold text-slate-100 w-16 text-right">
                        ${(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing & Checkout */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax (15% VAT):</span>
                <span className="font-mono text-slate-200">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-100 pt-1.5 border-t border-slate-800/80">
                <span>Total Amount:</span>
                <span className="font-mono text-amber-400">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={cart.length === 0}
                onClick={() => handleCheckout("CASH")}
                className="gap-1.5"
              >
                <Banknote className="w-3.5 h-3.5" />
                Pay Cash
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={cart.length === 0}
                onClick={() => handleCheckout("CARD")}
                className="gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Credit / Card
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
