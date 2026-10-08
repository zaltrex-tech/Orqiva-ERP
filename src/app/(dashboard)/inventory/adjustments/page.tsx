"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Scale,
  Building2,
  Package,
  Layers,
  BookOpen,
  X,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";

interface LocationItem {
  id: string;
  name: string;
}

interface ProductQuant {
  locationId: string;
  quantity: number;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  quants: ProductQuant[];
}

interface AdjustmentLineItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string; costPrice: number };
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  costImpact: number;
}

interface AdjustmentRecord {
  id: string;
  adjustmentNumber: string;
  locationId: string;
  location: { id: string; name: string };
  reason: "SPOILAGE" | "SHRINKAGE" | "COUNT_CORRECTION" | "FOUND";
  journalEntryId?: string | null;
  notes?: string | null;
  createdAt: string;
  lines: AdjustmentLineItem[];
}

export default function StockAdjustmentsPage() {
  const { t, locale } = useI18n();

  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");

  // Reconcile Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    adjustmentNumber: `ADJ-${Date.now().toString().slice(-6)}`,
    locationId: "",
    reason: "COUNT_CORRECTION" as "SPOILAGE" | "SHRINKAGE" | "COUNT_CORRECTION" | "FOUND",
    notes: "",
    items: [{ productId: "", countedQuantity: 0 }],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/inventory/adjustments");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load stock adjustments");
      }
      setAdjustments(json.data.adjustments);
      setLocations(json.data.locations);
      setProducts(json.data.products);

      if (json.data.locations.length > 0 && !form.locationId) {
        const defaultLocId = json.data.locations[0].id;
        const defaultProd = json.data.products[0];
        const defaultSysQty = defaultProd?.quants?.find((q: ProductQuant) => q.locationId === defaultLocId)?.quantity || 0;
        setForm((prev) => ({
          ...prev,
          locationId: defaultLocId,
          items: [{ productId: defaultProd?.id || "", countedQuantity: defaultSysQty }],
        }));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load stock adjustments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    const locId = locations[0]?.id || "";
    const prod = products[0];
    const sysQty = prod?.quants?.find((q) => q.locationId === locId)?.quantity || 0;
    setForm({
      adjustmentNumber: `ADJ-${Date.now().toString().slice(-6)}`,
      locationId: locId,
      reason: "COUNT_CORRECTION",
      notes: "",
      items: [{ productId: prod?.id || "", countedQuantity: sysQty }],
    });
    setShowModal(true);
  };

  const getSystemQty = (productId: string, locationId: string) => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return 0;
    const q = p.quants.find((quant) => quant.locationId === locationId);
    return q ? q.quantity : 0;
  };

  const getProductCost = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    return p ? p.costPrice : 0;
  };

  const handleAddItemRow = () => {
    const remainingProds = products.filter(
      (p) => !form.items.some((item) => item.productId === p.id)
    );
    const nextProd = remainingProds[0] || products[0];
    if (!nextProd) return;
    const sysQty = getSystemQty(nextProd.id, form.locationId);
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: nextProd.id, countedQuantity: sysQty }],
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (form.items.length <= 1) {
      toast.error(locale === "ar" ? "يجب جرد صنف واحد على الأقل" : "At least one item is required");
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemProductChange = (index: number, newProductId: string) => {
    const sysQty = getSystemQty(newProductId, form.locationId);
    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { productId: newProductId, countedQuantity: sysQty };
      return { ...prev, items: updated };
    });
  };

  const handleItemCountChange = (index: number, countedQuantity: number) => {
    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], countedQuantity };
      return { ...prev, items: updated };
    });
  };

  const handleLocationChange = (newLocationId: string) => {
    setForm((prev) => {
      const updatedItems = prev.items.map((item) => {
        const sysQty = getSystemQty(item.productId, newLocationId);
        return { ...item, countedQuantity: sysQty };
      });
      return { ...prev, locationId: newLocationId, items: updatedItems };
    });
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.locationId) {
      toast.error(locale === "ar" ? "يرجى تحديد المستودع المفحوص" : "Please select an audited location");
      return;
    }

    if (form.items.some((i) => !i.productId)) {
      toast.error(locale === "ar" ? "يرجى تحديد المنتجات بكافة الأسطر" : "Please select products for all lines");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentNumber: form.adjustmentNumber,
          locationId: form.locationId,
          reason: form.reason,
          notes: form.notes,
          lines: form.items.map((it) => ({
            productId: it.productId,
            countedQuantity: Number(it.countedQuantity),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to post adjustment");
      }

      toast.success(
        locale === "ar"
          ? `تم ترحيل التسوية بنجاح وقيد اليومية ${json.data.journalEntryId ? `(${json.data.journalEntryId})` : ""}`
          : `Reconciliation posted successfully! Ledger entry ${json.data.journalEntryId || "synced"}`
      );
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to post adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    if (reasonFilter === "ALL") return true;
    return adj.reason === reasonFilter;
  });

  // KPI Metrics
  const totalAdjustmentsCount = adjustments.length;
  const netUnitsVariance = adjustments.reduce((acc, adj) => {
    return acc + adj.lines.reduce((lAcc, l) => lAcc + l.varianceQuantity, 0);
  }, 0);
  const netFinancialImpact = adjustments.reduce((acc, adj) => {
    return acc + adj.lines.reduce((lAcc, l) => lAcc + l.costImpact, 0);
  }, 0);
  const spoilageShrinkageCount = adjustments.filter(
    (a) => a.reason === "SPOILAGE" || a.reason === "SHRINKAGE"
  ).length;

  // Real-time calculation in modal
  const modalNetVariance = form.items.reduce((acc, item) => {
    const sys = getSystemQty(item.productId, form.locationId);
    return acc + (item.countedQuantity - sys);
  }, 0);

  const modalCostImpact = form.items.reduce((acc, item) => {
    const sys = getSystemQty(item.productId, form.locationId);
    const cost = getProductCost(item.productId);
    return acc + (item.countedQuantity - sys) * cost;
  }, 0);

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "SPOILAGE":
        return <Badge variant="rose">{t("adjustments.spoilage", "Damaged / Spoilage")}</Badge>;
      case "SHRINKAGE":
        return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">{t("adjustments.shrinkage", "Shrinkage / Loss")}</Badge>;
      case "FOUND":
        return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{t("adjustments.found", "Surplus / Found")}</Badge>;
      case "COUNT_CORRECTION":
      default:
        return <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">{t("adjustments.countCorrection", "Count Correction")}</Badge>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-amber-400" />
              {t("adjustments.title", "Physical Inventory Reconciliation")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "adjustments.subtitle",
                "Stocktake auditing (جرد فعلي), count variance detection, and automated general ledger adjustments."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2 bg-background/50 border-border/60 hover:bg-muted/50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{locale === "ar" ? "تحديث" : "Refresh"}</span>
            </Button>
            <Button
              onClick={handleOpenModal}
              className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>{t("adjustments.newAdjustment", "New Stocktake Count")}</span>
            </Button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 backdrop-blur-sm shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center justify-between">
                <span>{locale === "ar" ? "إجمالي عمليات الجرد" : "Total Stocktakes"}</span>
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground mt-1">
                {totalAdjustmentsCount}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 backdrop-blur-sm shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center justify-between">
                <span>{t("adjustments.varianceQty", "Net Units Variance")}</span>
                <Scale className="w-4 h-4 text-blue-400" />
              </CardDescription>
              <CardTitle className={`text-2xl font-bold mt-1 ${netUnitsVariance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {netUnitsVariance > 0 ? `+${netUnitsVariance}` : netUnitsVariance} {locale === "ar" ? "وحدة" : "units"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 backdrop-blur-sm shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center justify-between">
                <span>{t("adjustments.costImpact", "Financial Ledger Impact")}</span>
                {netFinancialImpact >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </CardDescription>
              <CardTitle className={`text-2xl font-bold mt-1 ${netFinancialImpact >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {netFinancialImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 backdrop-blur-sm shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center justify-between">
                <span>{locale === "ar" ? "تسويات العجز والتلف" : "Spoilage / Shrinkage"}</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground mt-1">
                {spoilageShrinkageCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-3">
          {[
            { id: "ALL", labelEn: "All Audits", labelAr: "كافة الجرود" },
            { id: "COUNT_CORRECTION", labelEn: "Corrections", labelAr: "تصحيحات عددية" },
            { id: "SPOILAGE", labelEn: "Spoilage / Damage", labelAr: "تلف ومطروحات" },
            { id: "SHRINKAGE", labelEn: "Loss / Shrinkage", labelAr: "عجز وفقدان" },
            { id: "FOUND", labelEn: "Surplus / Found", labelAr: "فائض وعثور" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={reasonFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setReasonFilter(tab.id)}
              className={`text-xs rounded-full px-3 py-1 ${
                reasonFilter === tab.id
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600/40"
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {locale === "ar" ? tab.labelAr : tab.labelEn}
            </Button>
          ))}
        </div>

        {/* Adjustments History Datatable */}
        <Card className="bg-card/60 border-border/50 overflow-hidden shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 text-start">{t("adjustments.adjustmentNumber", "Adjustment #")}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "التاريخ" : "Date"}</th>
                  <th className="px-4 py-3 text-start">{t("adjustments.location", "Audited Location")}</th>
                  <th className="px-4 py-3 text-start">{t("adjustments.reason", "Reason")}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الأصناف المحصورة" : "Audited Items"}</th>
                  <th className="px-4 py-3 text-end">{t("adjustments.varianceQty", "Variance")}</th>
                  <th className="px-4 py-3 text-end">{t("adjustments.costImpact", "Cost Impact")}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "قيد اليومية" : "Ledger Entry"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                        <span>{locale === "ar" ? "جاري تحميل سجلات الجرد..." : "Loading stocktake records..."}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="font-medium text-base">
                        {locale === "ar" ? "لا توجد سجلات تسوية مطابقة" : "No reconciliation records found"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {locale === "ar" ? "ابدأ جرد المستودع واضغط 'تسجيل جرد فعلي' لترحيل الفروقات." : "Start an audit count and reconcile book quantities with actual shelf inventory."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAdjustments.map((adj) => {
                    const totalAdjVariance = adj.lines.reduce((a, l) => a + l.varianceQuantity, 0);
                    const totalAdjCost = adj.lines.reduce((a, l) => a + l.costImpact, 0);

                    return (
                      <tr key={adj.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-amber-400">
                          {adj.adjustmentNumber}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(adj.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{adj.location.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getReasonBadge(adj.reason)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 max-w-[220px]">
                            {adj.lines.slice(0, 2).map((line) => (
                              <div key={line.id} className="text-xs flex items-center justify-between text-muted-foreground">
                                <span className="truncate pe-2">{line.product.name}</span>
                                <span className="font-mono text-foreground font-semibold">
                                  {line.systemQuantity} → {line.countedQuantity}
                                </span>
                              </div>
                            ))}
                            {adj.lines.length > 2 && (
                              <span className="text-[10px] text-muted-foreground/70 italic">
                                +{adj.lines.length - 2} {locale === "ar" ? "أصناف إضافية" : "more items"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-end font-mono">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              totalAdjVariance < 0
                                ? "bg-rose-500/10 text-rose-400"
                                : totalAdjVariance > 0
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {totalAdjVariance > 0 ? `+${totalAdjVariance}` : totalAdjVariance}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-end font-mono text-xs">
                          <span
                            className={`font-semibold ${
                              totalAdjCost < 0 ? "text-rose-400" : totalAdjCost > 0 ? "text-emerald-400" : "text-muted-foreground"
                            }`}
                          >
                            {totalAdjCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {adj.journalEntryId ? (
                            <Badge variant="outline" className="font-mono text-[11px] gap-1 bg-emerald-950/20 text-emerald-400 border-emerald-800/40">
                              <BookOpen className="w-3 h-3" />
                              <span>{adj.journalEntryId.slice(0, 10)}...</span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              {locale === "ar" ? "قيد مسودة" : "No entry"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Physical Inventory Reconciliation Dialog */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border/70 rounded-xl shadow-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      {t("adjustments.newAdjustment", "Physical Inventory Reconciliation")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {locale === "ar"
                        ? "مطابقة الأرصدة الفعلية مع دفاتر النظام وتوليد القيود المحاسبية التلقائية"
                        : "Compare counted shelf stock against system quants and post balanced journal adjustments"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitReconciliation} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Adjustment # */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("adjustments.adjustmentNumber", "Adjustment #")}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.adjustmentNumber}
                      onChange={(e) => setForm({ ...form, adjustmentNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-background/60 border border-border/60 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Audited Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("adjustments.location", "Audited Location")}
                    </label>
                    <select
                      required
                      value={form.locationId}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-background/60 border border-border/60 focus:border-amber-500 focus:outline-none"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reason Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("adjustments.reason", "Discrepancy Reason")}
                    </label>
                    <select
                      required
                      value={form.reason}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          reason: e.target.value as "SPOILAGE" | "SHRINKAGE" | "COUNT_CORRECTION" | "FOUND",
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg bg-background/60 border border-border/60 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="COUNT_CORRECTION">{t("adjustments.countCorrection", "Count Correction")}</option>
                      <option value="SPOILAGE">{t("adjustments.spoilage", "Damaged / Spoilage")}</option>
                      <option value="SHRINKAGE">{t("adjustments.shrinkage", "Shrinkage / Loss")}</option>
                      <option value="FOUND">{t("adjustments.found", "Surplus / Found")}</option>
                    </select>
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    {locale === "ar" ? "ملاحظات وتفاصيل التدقيق" : "Audit Notes / Justification"}
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={locale === "ar" ? "مثال: جرد ربع سنوي شامل لمستودع المعرض" : "e.g. Q4 comprehensive stocktake count"}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-background/60 border border-border/60 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Products Count Lines */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>{locale === "ar" ? "أصناف الجرد والأرصدة" : "Counted Inventory Lines"}</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItemRow}
                      className="gap-1.5 text-xs border-border/60 hover:bg-muted/50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{locale === "ar" ? "إضافة صنف للجرد" : "Add Product"}</span>
                    </Button>
                  </div>

                  <div className="border border-border/50 rounded-lg overflow-hidden bg-background/30">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/40">
                        <tr>
                          <th className="px-3 py-2 text-start">{locale === "ar" ? "المنتج" : "Product"}</th>
                          <th className="px-3 py-2 text-end">{t("adjustments.systemQty", "System Qty")}</th>
                          <th className="px-3 py-2 text-center">{t("adjustments.countedQty", "Counted Qty")}</th>
                          <th className="px-3 py-2 text-end">{t("adjustments.varianceQty", "Variance")}</th>
                          <th className="px-3 py-2 text-end">{t("adjustments.costImpact", "Cost Impact")}</th>
                          <th className="px-2 py-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {form.items.map((item, index) => {
                          const sysQty = getSystemQty(item.productId, form.locationId);
                          const variance = item.countedQuantity - sysQty;
                          const cost = getProductCost(item.productId);
                          const impact = variance * cost;

                          return (
                            <tr key={index} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleItemProductChange(index, e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded bg-card border border-border/60 focus:border-amber-500 focus:outline-none"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.sku}) - {p.costPrice.toFixed(2)} SAR
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-end font-mono font-medium text-muted-foreground">
                                {sysQty}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.countedQuantity}
                                  onChange={(e) => handleItemCountChange(index, Number(e.target.value))}
                                  className="w-24 px-2 py-1 text-center font-mono font-bold text-foreground text-xs rounded bg-card border border-border/70 focus:border-amber-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 text-end font-mono font-semibold">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] ${
                                    variance < 0
                                      ? "text-rose-400 bg-rose-500/10"
                                      : variance > 0
                                      ? "text-emerald-400 bg-emerald-500/10"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {variance > 0 ? `+${variance}` : variance}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-end font-mono">
                                <span className={impact < 0 ? "text-rose-400" : impact > 0 ? "text-emerald-400" : "text-muted-foreground"}>
                                  {impact.toFixed(2)} SAR
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(index)}
                                  className="p-1 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Reconciliation Summary Box */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/10 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {locale === "ar" ? "أثر التسوية على الحسابات العامة (Double-Entry Invariant)" : "Automated Double-Entry Posting"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {modalCostImpact < 0
                          ? locale === "ar"
                            ? "مدين: حساب خسائر الجرد (5010) / دائن: حساب المخزون (1030)"
                            : "Debit: Inventory Loss (5010) | Credit: Inventory Asset (1030)"
                          : modalCostImpact > 0
                          ? locale === "ar"
                            ? "مدين: حساب المخزون (1030) / دائن: حساب أرباح الجرد (4010)"
                            : "Debit: Inventory Asset (1030) | Credit: Inventory Gain (4010)"
                          : locale === "ar"
                          ? "الأرصدة متطابقة، لا يتطلب أي قيود محاسبية"
                          : "No variances detected. Ledger remains balanced."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-end">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">{locale === "ar" ? "فرق الكميات" : "Units Variance"}</span>
                      <span className={`text-base font-bold font-mono ${modalNetVariance < 0 ? "text-rose-400" : modalNetVariance > 0 ? "text-emerald-400" : "text-foreground"}`}>
                        {modalNetVariance > 0 ? `+${modalNetVariance}` : modalNetVariance}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">{locale === "ar" ? "الأثر المالي" : "Financial Impact"}</span>
                      <span className={`text-base font-bold font-mono ${modalCostImpact < 0 ? "text-rose-400" : modalCostImpact > 0 ? "text-emerald-400" : "text-foreground"}`}>
                        {modalCostImpact.toFixed(2)} SAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    {locale === "ar" ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium shadow-lg shadow-amber-950/40"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{t("adjustments.postAdjustment", "Post Ledger Adjustment")}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
