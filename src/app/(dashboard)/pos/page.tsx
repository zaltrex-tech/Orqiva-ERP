"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ThermalReceipt, ReceiptLineItem } from "@/components/pos/thermal-receipt";
import { useI18n } from "@/lib/i18n/context";
import {
  CircleDollarSign,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle2,
  ShoppingBag,
  Printer,
  RefreshCw,
  X,
  Barcode,
  ScanLine,
  Volume2,
} from "lucide-react";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  taxRate: number;
  stockAvailable: number;
}

interface CartItem extends ProductItem {
  qty: number;
}

interface ActiveSessionData {
  id: string;
  sessionNumber: string;
  cashierId?: string;
  cashierName: string;
  openingBalance: number;
  totalSales: number;
}

interface LocationData {
  stockLocationId: string;
  customerLocationId: string;
}

export default function PosPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [locations, setLocations] = useState<LocationData>({ stockLocationId: "", customerLocationId: "" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    orderNumber: string;
    items: ReceiptLineItem[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: "CASH" | "CARD";
    qrCodeDataUrl?: string;
    invoiceHash?: string;
  } | null>(null);

  // Fetch live products and session from PostgreSQL database
  const loadPosData = async () => {
    try {
      const res = await fetch("/api/v1/pos/products");
      const json = await res.json();
      if (json.success && json.data) {
        setProducts(json.data.products);
        setSession(json.data.session);
        setLocations(json.data.locations);
      }
    } catch (err) {
      console.error("Failed to load POS data:", err);
      toast.error(t("pos.networkErrorTitle", "Failed to connect to POS database"), {
        description: t("pos.networkErrorDesc", "Verify database status in health dashboard."),
      });
    }
  };

  const [manualBarcode, setManualBarcode] = useState("");

  useEffect(() => {
    loadPosData();
  }, []);

  const productsRef = React.useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Web Audio Hardware Beep Synthesizer
  const playScannerBeep = (type: "success" | "error" = "success") => {
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1250, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // AudioContext unavailable in non-interactive/mock test environments
    }
  };

  const processBarcodeScan = (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    const matched = productsRef.current.find(
      (p) =>
        p.sku.toLowerCase() === trimmed.toLowerCase() ||
        p.id === trimmed ||
        p.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (matched) {
      if (matched.stockAvailable <= 0) {
        playScannerBeep("error");
        toast.warning(t("pos.scannedOutOfStock", "Scanned Product Out of Stock"), {
          description: `${t("pos.product", "Product")} ${matched.name} ${t("pos.scannedOutOfStockDesc", "has zero available shelf quants.")}`,
        });
        return;
      }
      addToCart(matched);
      playScannerBeep("success");
      toast.success(`${t("pos.scannedSuccess", "Scanned")}: ${matched.name}`, {
        description: `[${matched.sku}] ${t("pos.scannedSuccessDesc", "automatically appended to POS register.")}`,
        duration: 3000,
      });
    } else {
      playScannerBeep("error");
      toast.error(`${t("pos.barcodeNotFound", "Barcode Not Found")}: "${trimmed}"`, {
        description: t("pos.barcodeNotFoundDesc", "SKU is not registered in the active inventory catalog."),
        duration: 4000,
      });
    }
  };

  // Global Hardware Barcode Scanner Listener (<50ms burst detection)
  useEffect(() => {
    let buffer = "";
    let lastCharTime = 0;
    let intervals: number[] = [];

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      const now = Date.now();
      const interval = now - lastCharTime;
      lastCharTime = now;

      if (e.key === "Enter") {
        const trimmed = buffer.trim();
        const avgInterval =
          intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 999;

        // Scanners emit rapid bursts (typically < 60ms between characters)
        const isRapidBurst = trimmed.length >= 2 && (avgInterval < 75 || !isInputFocused);

        if (isRapidBurst) {
          e.preventDefault();
          e.stopPropagation();
          processBarcodeScan(trimmed);
        }

        buffer = "";
        intervals = [];
        return;
      }

      if (e.key.length !== 1) return;

      if (interval > 180) {
        buffer = e.key;
        intervals = [];
      } else {
        buffer += e.key;
        intervals.push(interval);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  const addToCart = (product: ProductItem) => {
    if (product.stockAvailable <= 0) {
      toast.warning(t("pos.outOfStock", "Product Out of Stock"), {
        description: `${product.name} ${t("pos.outOfStockDesc", "currently has 0 units available on shelf.")}`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockAvailable) {
          toast.warning(t("pos.limitReached", "Quantity Limit Reached"), {
            description: `${t("pos.only", "Only")} ${product.stockAvailable} ${t("common.units", "units")} ${t("pos.availableInStock", "available in stock.")}`,
          });
          return prev;
        }
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
            const product = products.find((p) => p.id === id);
            if (product && newQty > product.stockAvailable) {
              toast.warning(t("pos.stockExceeded", "Stock Exceeded"), {
                description: `${t("pos.maximum", "Maximum")} ${product.stockAvailable} ${t("pos.available", "available.")}`,
              });
              return i;
            }
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

  const handleCheckout = async (paymentMethod: "CASH" | "CARD") => {
    if (cart.length === 0) return;
    if (!session || !locations.stockLocationId) {
      toast.error(t("pos.sessionInactive", "POS Register Session Inactive"), {
        description: t("pos.sessionInactiveDesc", "Cannot process orders without an active cashier session."),
      });
      return;
    }

    setIsProcessing(true);
    const orderNumber = `POS-ORD-${Date.now().toString().slice(-6)}`;

    const payload = {
      tenantId: "ORQ-MAIN",
      cashierId: session.cashierId || "cashier-user",
      sessionId: session.id,
      orderNumber,
      stockLocationId: locations.stockLocationId,
      customerLocationId: locations.customerLocationId,
      paymentMethod,
      items: cart.map((i) => ({
        productId: i.id,
        quantity: i.qty,
        unitPrice: i.price,
        taxAmount: Math.round(i.price * i.qty * 0.15 * 100) / 100,
      })),
    };

    try {
      const res = await fetch("/api/v1/pos/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorText = data.error || "Transaction could not be completed.";

        // Specific detection of concurrency / row-level lock conflicts
        if (
          errorText.toLowerCase().includes("insufficient stock") ||
          errorText.toLowerCase().includes("lock") ||
          errorText.toLowerCase().includes("depleted")
        ) {
          toast.error(t("pos.stockConflictTitle", "Stock Depleted by Another Transaction"), {
            description: t("pos.stockConflictDesc", "A concurrent terminal claimed this inventory shelf under row-level lock. Re-syncing stock..."),
            duration: 6000,
          });
        } else {
          toast.error(t("pos.checkoutRejectedTitle", "Checkout Transaction Rejected"), {
            description: errorText,
            duration: 5000,
          });
        }

        // Refresh live inventory quants
        await loadPosData();
        return;
      }

      // Success UX: Notify Cashier
      toast.success(t("pos.txnApprovedTitle", "Transaction Approved & Stock Locked"), {
        description: `${orderNumber} ${t("pos.txnApprovedDesc", "committed to ledger. Dispatching 80mm thermal print job...")}`,
        duration: 5000,
      });

      // Prepare Thermal Receipt
      const receiptItems: ReceiptLineItem[] = cart.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.qty,
        unitPrice: item.price,
        subtotal: item.price * item.qty,
      }));

      setReceiptData({
        orderNumber,
        items: receiptItems,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        paymentMethod,
        qrCodeDataUrl: data.data?.qrDataUrl,
        invoiceHash: data.data?.invoiceHash,
      });

      // Clear cart & refresh database stock quantities
      setCart([]);
      await loadPosData();
    } catch (err: unknown) {
      console.error("Network or execution failure during POS order:", err);
      toast.error(t("pos.networkErrorTitle", "Network Interruption"), {
        description: t("pos.networkErrorDesc", "Failed to communicate with the ERP transaction coordinator."),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ErrorBoundary fallbackMessage={t("common.error", "Point of Sale Terminal interface encountered an error. Hardware safety lock engaged.")}>
      <div className="space-y-6">
        {/* Session Status Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                {t("pos.title", "POS Terminal 01")} • {session?.sessionNumber || "POS-SESS-00045"}
                <Badge variant="emerald" className="text-[10px] py-0 font-mono">
                  {t("pos.opened", "OPENED")}
                </Badge>
              </div>
              <div className="text-xs text-slate-400">
                {t("pos.cashier", "Cashier")}: <span className="text-slate-200">{session?.cashierName || "Sarah Jenkins"}</span> • {t("pos.cashFloat", "Cash Float")}:{" "}
                <span className="font-mono text-amber-400">${session?.openingBalance?.toFixed(2) || "250.00"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
              <Barcode className="w-3.5 h-3.5" />
              <span>{t("pos.scannerActive", "SCANNER ACTIVE (<50ms)")}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadPosData} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("pos.resyncCatalog", "Re-sync Catalog")}
            </Button>
            <Badge variant="indigo" className="font-mono text-[10px] self-start md:self-auto">
              {t("pos.lockingInfo", "LOCKING: FOR UPDATE + READ COMMITTED")}
            </Badge>
          </div>
        </div>

        {/* Catalog & Live Register Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog: 10 Seeded Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                {t("pos.catalogTitle", "Live Product Catalog")} ({products.length} {t("pos.skus", "SKUs")})
              </h2>

              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <ScanLine className="w-3.5 h-3.5 absolute start-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("pos.searchPlaceholder", "Scan Barcode / SKU...")}
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualBarcode.trim()) {
                        e.preventDefault();
                        processBarcodeScan(manualBarcode.trim());
                        setManualBarcode("");
                      }
                    }}
                    className="bg-slate-950/80 border border-slate-800 rounded-lg ps-8 pe-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 w-52 font-mono"
                    data-testid="barcode-input"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {products.map((item) => {
                const isOutOfStock = item.stockAvailable <= 0;
                return (
                  <Card
                    key={item.id}
                    hoverEffect={!isOutOfStock}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    className={`bg-slate-900/40 border-slate-800 p-4 space-y-2 select-none transition-all ${
                      isOutOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[11px] text-amber-400 font-semibold">{item.sku}</span>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 line-clamp-2 min-h-[32px]">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="text-sm font-bold text-slate-100 font-mono">
                        ${item.price.toFixed(2)}
                      </div>
                      <Badge
                        variant={isOutOfStock ? "rose" : item.stockAvailable <= 20 ? "amber" : "slate"}
                        className="text-[10px]"
                      >
                        {item.stockAvailable} {t("pos.onShelf", "on shelf")}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Live Register Cart */}
          <Card className="bg-slate-900/60 border-slate-800 flex flex-col justify-between h-[560px]">
            <div>
              <CardHeader>
                <CardTitle>{t("pos.activeCart", "Active Register Cart")}</CardTitle>
                <Badge variant="amber" className="font-mono text-[10px]">
                  {cart.length} {t("pos.itemsCount", "ITEMS")}
                </Badge>
              </CardHeader>

              <div className="overflow-y-auto max-h-[300px] space-y-2 pe-1">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    {t("pos.emptyCart", "Cart is empty. Tap products to add to current ticket.")}
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 max-w-[130px]">
                        <div className="font-medium text-slate-200 truncate">{item.name}</div>
                        <div className="font-mono text-slate-400 text-[10px]">
                          ${item.price.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-900 rounded border border-slate-800">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1.5 font-mono font-bold text-slate-200">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-mono font-semibold text-slate-100 w-16 text-end">
                          ${(item.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Financial Summary & Payment Triggers */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{t("pos.subtotal", "Subtotal")}:</span>
                  <span className="font-mono text-slate-200">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t("pos.vat", "VAT / Sales Tax (15%):")}</span>
                  <span className="font-mono text-slate-200">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-100 pt-1.5 border-t border-slate-800/80">
                  <span>{t("pos.totalDue", "Total Amount Due:")}</span>
                  <span className="font-mono text-amber-400">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => handleCheckout("CASH")}
                  className="gap-1.5"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  {isProcessing ? t("pos.locking", "Locking...") : t("pos.payCash", "Pay Cash")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => handleCheckout("CARD")}
                  className="gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {isProcessing ? t("pos.locking", "Locking...") : t("pos.payCard", "Pay Card")}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Thermal Receipt Print Preview Modal */}
        {receiptData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-luxury-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-slate-100 text-sm">{t("pos.receiptTitle", "80mm Thermal Receipt")}</span>
                </div>
                <button
                  onClick={() => setReceiptData(null)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Thermal Receipt Component with autoPrint enabled */}
              <div className="max-h-[440px] overflow-y-auto rounded bg-slate-950 p-2">
                <ThermalReceipt
                  orderNumber={receiptData.orderNumber}
                  sessionNumber={session?.sessionNumber || "POS-SESS-00045"}
                  cashierName={session?.cashierName || "Sarah Jenkins"}
                  items={receiptData.items}
                  subtotal={receiptData.subtotal}
                  taxAmount={receiptData.taxAmount}
                  totalAmount={receiptData.totalAmount}
                  paymentMethod={receiptData.paymentMethod}
                  qrCodeDataUrl={receiptData.qrCodeDataUrl}
                  invoiceHash={receiptData.invoiceHash}
                  autoPrint={true}
                  onPrintCompleted={() => {
                    toast.info(t("pos.receiptDialogTitle", "Thermal Print Dialog Triggered"), {
                      description: t("pos.receiptDialogDesc", "Document routed to 80mm thermal spooler."),
                    });
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t("pos.reprintReceipt", "Re-print Receipt")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setReceiptData(null)}
                >
                  {t("pos.done", "Done")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
