"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Building2,
  Receipt,
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  PackageCheck,
  ShieldCheck,
  DollarSign,
  X,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";

interface VendorItem {
  id: string;
  name: string;
  code: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  balance: number;
  paymentTerms: string;
  _count?: { purchaseOrders: number };
}

interface POItem {
  id: string;
  orderNumber: string;
  vendor: { id: string; name: string; code: string };
  warehouse: { id: string; name: string; code: string };
  status: "DRAFT" | "CONFIRMED" | "RECEIVED" | "BILLED" | "CANCELLED";
  totalAmount: number;
  taxAmount: number;
  orderDate: string;
  items: Array<{
    id: string;
    product: { id: string; name: string; sku: string };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    receivedQuantity: number;
  }>;
}

export default function PurchasesPage() {
  const { t, locale } = useI18n();

  const [activeTab, setActiveTab] = useState<"orders" | "vendors">("orders");
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [orders, setOrders] = useState<POItem[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; costPrice: number }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<POItem | null>(null);

  // Vendor form
  const [vendorForm, setVendorForm] = useState({
    name: "",
    code: "",
    taxId: "",
    email: "",
    phone: "",
    paymentTerms: "NET30",
  });

  // PO form
  const [poForm, setPoForm] = useState({
    vendorId: "",
    warehouseId: "",
    orderNumber: `PO-${Date.now().toString().slice(-5)}`,
    items: [{ productId: "", quantity: 10, unitPrice: 100, taxRate: 15 }],
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, oRes, pRes] = await Promise.all([
        fetch("/api/v1/purchases/vendors"),
        fetch("/api/v1/purchases/orders"),
        fetch("/api/v1/pos/products"),
      ]);

      const vData = await vRes.json();
      const oData = await oRes.json();
      const pData = await pRes.json();

      if (vData.success) setVendors(vData.data.vendors || []);
      if (oData.success) setOrders(oData.data.orders || []);
      if (pData.success) {
        setProducts(pData.data.products || []);
        if (pData.data.locations?.stockLocationId) {
          setWarehouses([
            {
              id: pData.data.locations.stockLocationId,
              name: "Orqiva Flagship Branch (MAIN)",
              code: "BRANCH-MAIN",
            },
          ]);
        }
      }
    } catch {
      toast.error(t("purchases.loadError", "Failed to load procurement records"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name || !vendorForm.code) {
      toast.error(t("purchases.nameCodeRequired", "Name and Code are required."));
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/purchases/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("purchases.vendorCreated", "Supplier registered successfully"));
        setShowVendorModal(false);
        setVendorForm({ name: "", code: "", taxId: "", email: "", phone: "", paymentTerms: "NET30" });
        fetchData();
      } else {
        toast.error(data.error || "Failed to create vendor");
      }
    } catch {
      toast.error(t("purchases.vendorNetworkError", "Network error while creating vendor"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.vendorId || poForm.items.length === 0 || !poForm.items[0].productId) {
      toast.error(t("purchases.selectVendorProductWarning", "Please select a vendor and at least one product."));
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/purchases/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...poForm,
          warehouseId: warehouses[0]?.id || "loc-branch-main-stock",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("purchases.poCreated", "Purchase order confirmed successfully"));
        setShowPOModal(false);
        setPoForm({
          vendorId: "",
          warehouseId: "",
          orderNumber: `PO-${Date.now().toString().slice(-5)}`,
          items: [{ productId: "", quantity: 10, unitPrice: 100, taxRate: 15 }],
        });
        fetchData();
      } else {
        toast.error(data.error || "Failed to create purchase order");
      }
    } catch {
      toast.error(t("purchases.poNetworkError", "Network error while creating purchase order"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveGoods = async (order: POItem) => {
    try {
      const itemsToReceive = order.items.map((i) => ({
        productId: i.product.id,
        quantityReceived: Number(i.quantity),
        unitCost: Number(i.unitPrice),
      }));

      const res = await fetch("/api/v1/purchases/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: order.id,
          locationId: "loc-branch-main-stock",
          items: itemsToReceive,
          notes: "Automated Goods Receipt at Flagship Depot",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(t("purchases.goodsReceived", "Goods received and AVCO inventory updated"));
        fetchData();
      } else {
        toast.error(data.error || "Failed to process goods receipt");
      }
    } catch {
      toast.error(t("purchases.receiveNetworkError", "Network error while receiving goods"));
    }
  };

  const handlePostBill = async (order: POItem) => {
    try {
      const res = await fetch("/api/v1/purchases/bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: order.id,
          billReference: `BILL-REF-${order.orderNumber}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(t("purchases.billPosted", "Vendor bill and balanced journal entry posted"));
        fetchData();
      } else {
        toast.error(data.error || "Failed to post vendor bill");
      }
    } catch {
      toast.error(t("purchases.billNetworkError", "Network error while posting vendor bill"));
    }
  };

  const getStatusBadgeVariant = (status: string): BadgeProps["variant"] => {
    switch (status) {
      case "CONFIRMED":
        return "amber";
      case "RECEIVED":
        return "indigo";
      case "BILLED":
        return "emerald";
      default:
        return "slate";
    }
  };

  return (
    <ErrorBoundary fallbackMessage="Procurement cycle encounter state.">
      <div className="space-y-8 animate-fadeIn">
        {/* Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 shadow-luxury-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
                {t("purchases.title", "Procurement & Procure-to-Pay")}
              </h1>
              <Badge variant="emerald" className="font-mono text-[10px]">
                3-WAY MATCHING
              </Badge>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {t(
                "purchases.subtitle",
                "Vendor relationship governance, 3-way matching validation, and automated inventory receipt."
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("common.refresh", "Refresh")}</span>
            </Button>
            <Button
              id="new-vendor-btn"
              variant="secondary"
              size="md"
              onClick={() => setShowVendorModal(true)}
              className="gap-2"
            >
              <Building2 className="w-4 h-4" />
              {t("purchases.newVendor", "New Supplier")}
            </Button>
            <Button
              id="new-po-btn"
              variant="primary"
              size="md"
              onClick={() => setShowPOModal(true)}
              className="gap-2 shadow-glow-amber"
            >
              <Plus className="w-4 h-4" />
              {t("purchases.newPO", "Create Purchase Order")}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "orders"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-luxury-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t("purchases.purchaseOrders", "Purchase Orders")} ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "vendors"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-luxury-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t("purchases.vendors", "Suppliers & Vendors")} ({vendors.length})
          </button>
        </div>

        {/* Tab Content: Purchase Orders */}
        {activeTab === "orders" && (
          <Card className="bg-slate-900/40 border-slate-800 p-0 overflow-hidden shadow-luxury-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5 text-start">{t("purchases.orderNumber", "PO Number")}</th>
                    <th className="py-3.5 px-4 text-start">{t("purchases.vendorName", "Supplier")}</th>
                    <th className="py-3.5 px-4 text-start">{t("purchases.warehouse", "Depot")}</th>
                    <th className="py-3.5 px-4 text-start">{t("purchases.orderStatus", "Status")}</th>
                    <th className="py-3.5 px-4 text-end">{t("purchases.totalAmount", "Total Amount")}</th>
                    <th className="py-3.5 px-5 text-end">{t("purchases.actionsHeader", "Actions (3-Way Cycle)")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                        {t("common.loading", "Loading orders...")}
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        {t("purchases.noOrders", "No purchase orders recorded yet. Click \"Create Purchase Order\" above.")}
                      </td>
                    </tr>
                  ) : (
                    orders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-amber-400 font-semibold text-start">
                          {po.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 text-start">
                          <div className="font-semibold text-slate-200">{po.vendor.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{po.vendor.code}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-start">
                          {po.warehouse.name}
                        </td>
                        <td className="py-3.5 px-4 text-start">
                          <Badge
                            variant={getStatusBadgeVariant(po.status)}
                            className="font-mono text-[10px]"
                          >
                            {po.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono font-bold text-slate-100">
                          ${Number(po.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-end">
                          <div className="flex items-center justify-end gap-2">
                            {po.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleReceiveGoods(po)}
                                className="text-[11px] py-1 px-2.5 h-7 gap-1"
                              >
                                <PackageCheck className="w-3.5 h-3.5 text-indigo-400" />
                                {t("purchases.receiveStock", "Receive Goods")}
                              </Button>
                            )}

                            {po.status === "RECEIVED" && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handlePostBill(po)}
                                className="text-[11px] py-1 px-2.5 h-7 gap-1"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                                {t("purchases.vendorBill", "Post Bill (AP)")}
                              </Button>
                            )}

                            {po.status === "BILLED" && (
                              <Badge variant="emerald" className="font-mono text-[10px]">
                                <CheckCircle2 className="w-3 h-3 me-1" />
                                3-WAY MATCHED
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab Content: Vendors List */}
        {activeTab === "vendors" && (
          <Card className="bg-slate-900/40 border-slate-800 p-0 overflow-hidden shadow-luxury-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5 text-start">{t("purchases.vendorName", "Supplier")}</th>
                    <th className="py-3.5 px-4 text-start">{t("purchases.vendorCode", "Code")}</th>
                    <th className="py-3.5 px-4 text-start">{t("purchases.taxId", "VAT / Tax ID")}</th>
                    <th className="py-3.5 px-4 text-start">{t("purchases.paymentTermsHeader", "Payment Terms")}</th>
                    <th className="py-3.5 px-5 text-end">{t("purchases.balance", "Outstanding AP Balance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-5 text-start">
                        <div className="font-semibold text-slate-100">{v.name}</div>
                        <div className="text-[10px] text-slate-400">{v.email || v.phone || "No contact"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-400 text-start">{v.code}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-start">
                        {v.taxId || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-start">
                        <Badge variant="slate" className="font-mono text-[10px]">
                          {v.paymentTerms}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-end font-mono font-bold text-amber-400">
                        ${Number(v.balance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Create Supplier Dialog */}
        {showVendorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-luxury-lg overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    {t("purchases.createVendorTitle", "Register New Supplier")}
                  </h3>
                  <p className="text-xs text-slate-400">{t("purchases.vendorDirectoryDesc", "Add an approved vendor to the supply directory.")}</p>
                </div>
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateVendor} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.vendorName", "Supplier Name")} *</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    placeholder={t("purchases.vendorNamePlaceholder", "e.g. Al-Futtaim Supply Corp")}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.vendorCode", "Code / Symbol")} *</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.code}
                    onChange={(e) => setVendorForm({ ...vendorForm, code: e.target.value })}
                    placeholder={t("purchases.vendorCodePlaceholder", "e.g. VEN-004")}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.taxId", "VAT / Tax ID")}</label>
                  <input
                    type="text"
                    value={vendorForm.taxId}
                    onChange={(e) => setVendorForm({ ...vendorForm, taxId: e.target.value })}
                    placeholder={t("purchases.vendorTaxIdPlaceholder", "e.g. 300492817200003")}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.paymentTermsHeader", "Payment Terms")}</label>
                  <select
                    value={vendorForm.paymentTerms}
                    onChange={(e) => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  >
                    <option value="DUE_ON_RECEIPT">{t("purchases.dueOnReceipt", "Due on Receipt")}</option>
                    <option value="NET15">{t("purchases.net15", "NET 15 Days")}</option>
                    <option value="NET30">{t("purchases.net30", "NET 30 Days")}</option>
                    <option value="NET60">{t("purchases.net60", "NET 60 Days")}</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="outline" size="md" onClick={() => setShowVendorModal(false)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={submitting}>
                    {submitting ? t("purchases.saving", "Saving...") : t("purchases.registerVendor", "Register Vendor")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Purchase Order Dialog */}
        {showPOModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-luxury-lg overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    {t("purchases.createPOTitle", "Create Purchase Order")}
                  </h3>
                  <p className="text-xs text-slate-400">{t("purchases.createPoDesc", "Authorize formal replenishment from registered vendor.")}</p>
                </div>
                <button
                  onClick={() => setShowPOModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePO} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.vendorName", "Supplier")} *</label>
                    <select
                      required
                      value={poForm.vendorId}
                      onChange={(e) => setPoForm({ ...poForm, vendorId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    >
                      <option value="">{t("purchases.selectSupplierPlaceholder", "Select Supplier...")}</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.orderNumber", "PO Number")}</label>
                    <input
                      type="text"
                      readOnly
                      value={poForm.orderNumber}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.productSku", "Product SKU")} *</label>
                  <select
                    required
                    value={poForm.items[0]?.productId || ""}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find((p) => p.id === prodId);
                      setPoForm({
                        ...poForm,
                        items: [
                          {
                            productId: prodId,
                            quantity: 20,
                            unitPrice: prod ? Number(prod.costPrice) || 120 : 120,
                            taxRate: 15,
                          },
                        ],
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  >
                    <option value="">{t("purchases.selectProductPlaceholder", "Select Product...")}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.quantityLabel", "Quantity")}</label>
                    <input
                      type="number"
                      min="1"
                      value={poForm.items[0]?.quantity || 1}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        setPoForm({
                          ...poForm,
                          items: [{ ...poForm.items[0], quantity: q }],
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("purchases.unitCost", "Unit Cost ($)")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={poForm.items[0]?.unitPrice || 0}
                      onChange={(e) => {
                        const p = Number(e.target.value);
                        setPoForm({
                          ...poForm,
                          items: [{ ...poForm.items[0], unitPrice: p }],
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-400">{t("purchases.totalWithVat", "Total with 15% VAT:")}</span>
                  <span className="font-mono font-bold text-amber-400">
                    $
                    {(
                      (poForm.items[0]?.quantity || 0) *
                      (poForm.items[0]?.unitPrice || 0) *
                      1.15
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="outline" size="md" onClick={() => setShowPOModal(false)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={submitting}>
                    {submitting ? t("purchases.issuing", "Issuing...") : t("purchases.confirmSendPo", "Confirm & Send PO")}
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
