"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Package,
  Layers,
  Send,
  Download,
  X,
  Trash2,
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
  type: string;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface TransferLineItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string };
  quantity: number;
  receivedQty: number;
}

interface TransferRecord {
  id: string;
  transferNumber: string;
  sourceLocation: LocationItem;
  destLocation: LocationItem;
  status: "DRAFT" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  lines: TransferLineItem[];
}

export default function StockTransfersPage() {
  const { t, locale } = useI18n();

  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    transferNumber: `TR-${Date.now().toString().slice(-6)}`,
    sourceLocationId: "",
    destLocationId: "",
    notes: "",
    items: [{ productId: "", quantity: 1 }],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/inventory/transfers");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load transfers");
      }
      setTransfers(json.data.transfers);
      setLocations(json.data.locations);
      setProducts(json.data.products);

      if (json.data.locations.length >= 2 && !form.sourceLocationId) {
        setForm((prev) => ({
          ...prev,
          sourceLocationId: json.data.locations[0].id,
          destLocationId: json.data.locations[1].id,
          items: [{ productId: json.data.products[0]?.id || "", quantity: 5 }],
        }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch transfers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sourceLocationId || !form.destLocationId) {
      toast.warning("Select origin and destination locations");
      return;
    }
    if (form.sourceLocationId === form.destLocationId) {
      toast.error("Source and destination locations cannot be the same");
      return;
    }
    if (form.items.some((i) => !i.productId || i.quantity <= 0)) {
      toast.warning("Specify valid products and quantities for all lines");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create transfer");
      }

      toast.success("Transfer Created in DRAFT Status", {
        description: `Transfer #${form.transferNumber} initialized. Ready for warehouse dispatch.`,
      });
      setShowModal(false);
      setForm({
        transferNumber: `TR-${Date.now().toString().slice(-6)}`,
        sourceLocationId: locations[0]?.id || "",
        destLocationId: locations[1]?.id || "",
        notes: "",
        items: [{ productId: products[0]?.id || "", quantity: 5 }],
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (transferId: string, trNumber: string) => {
    try {
      const res = await fetch("/api/v1/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatch", transferId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Dispatch failed");
      }
      toast.success(`Dispatched Transfer #${trNumber}`, {
        description: "Stock reserved and deducted from source shelf under row-level lock.",
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Dispatch failed");
    }
  };

  const handleReceive = async (transferId: string, trNumber: string) => {
    try {
      const res = await fetch("/api/v1/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", transferId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reception failed");
      }
      toast.success(`Received Transfer #${trNumber}`, {
        description: "Destination inventory credited. Transfer lifecycle completed.",
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Reception failed");
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  return (
    <ErrorBoundary fallbackMessage="Inter-Branch Transfers interface encountered an error.">
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="emerald" className="text-xs">
                {t("nav.inventory", "Inventory & Logistics")}
              </Badge>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs font-mono">Row-Level Locking</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ArrowLeftRight className="h-7 w-7 text-amber-500" />
              {t("transfers.title", "Inter-Branch Stock Transfers")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("transfers.subtitle", "Multi-warehouse transit workflow, dispatch locks, and inbound receiving.")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-border/60 hover:bg-accent/40"
            >
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin text-amber-400" : ""}`} />
              {t("common.refresh", "Refresh")}
            </Button>
            <Button
              id="new-transfer-btn"
              size="sm"
              onClick={() => setShowModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-600/20"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("transfers.newTransfer", "Initiate Transfer")}
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-card/60 backdrop-blur-md rounded-xl border border-border/40 w-fit">
          {["ALL", "DRAFT", "IN_TRANSIT", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === st
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "ALL" ? "All Transfers" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Transfers Datatable */}
        <div className="bg-card/70 border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-500" />
              Transit Operations Ledger
            </h3>
            <span className="text-xs font-mono text-muted-foreground">
              {filteredTransfers.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40 text-muted-foreground font-medium uppercase tracking-wider">
                  <th className="py-3 px-4 text-start">{t("transfers.transferNumber", "Transfer #")}</th>
                  <th className="py-3 px-4 text-start">{t("transfers.sourceLocation", "Origin")}</th>
                  <th className="py-3 px-4 text-start">{t("transfers.destLocation", "Destination")}</th>
                  <th className="py-3 px-4 text-start">Items</th>
                  <th className="py-3 px-4 text-start">Status</th>
                  <th className="py-3 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground italic">
                      No stock transfers found in this view.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-amber-400 text-start">
                        {tr.transferNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground text-start">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {tr.sourceLocation.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground text-start">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {tr.destLocation.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-start">
                        {tr.lines.map((l) => (
                          <div key={l.id} className="text-[11px]">
                            <span className="font-mono text-slate-300 font-semibold">{l.product.sku}</span>: {l.quantity} units
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-start">
                        {tr.status === "DRAFT" && (
                          <Badge variant="amber" className="text-[10px]">
                            {t("transfers.statusDraft", "Draft")}
                          </Badge>
                        )}
                        {tr.status === "IN_TRANSIT" && (
                          <Badge variant="indigo" className="text-[10px]">
                            {t("transfers.statusInTransit", "In Transit")}
                          </Badge>
                        )}
                        {tr.status === "COMPLETED" && (
                          <Badge variant="emerald" className="text-[10px]">
                            {t("transfers.statusCompleted", "Completed")}
                          </Badge>
                        )}
                        {tr.status === "CANCELLED" && (
                          <Badge variant="rose" className="text-[10px]">
                            {t("transfers.statusCancelled", "Cancelled")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-end">
                        {tr.status === "DRAFT" && (
                          <Button
                            size="sm"
                            onClick={() => handleDispatch(tr.id, tr.transferNumber)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7 px-3"
                          >
                            <Send className="h-3 w-3 me-1.5" />
                            {t("transfers.dispatch", "Dispatch Stock")}
                          </Button>
                        )}
                        {tr.status === "IN_TRANSIT" && (
                          <Button
                            size="sm"
                            onClick={() => handleReceive(tr.id, tr.transferNumber)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3"
                          >
                            <CheckCircle2 className="h-3 w-3 me-1.5" />
                            {t("transfers.receive", "Confirm Receipt")}
                          </Button>
                        )}
                        {tr.status === "COMPLETED" && (
                          <span className="text-emerald-400 text-xs font-mono">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Initiate Transfer Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-amber-500" />
                  <h3 className="font-bold text-base text-white">
                    {t("transfers.newTransfer", "Initiate Transfer")}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTransfer} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t("transfers.transferNumber", "Transfer #")}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.transferNumber}
                    onChange={(e) => setForm({ ...form, transferNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t("transfers.sourceLocation", "Origin Location")}
                    </label>
                    <select
                      value={form.sourceLocationId}
                      onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t("transfers.destLocation", "Destination Location")}
                    </label>
                    <select
                      value={form.destLocationId}
                      onChange={(e) => setForm({ ...form, destLocationId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                      Items to Transfer
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          ...form,
                          items: [...form.items, { productId: products[0]?.id || "", quantity: 1 }],
                        })
                      }
                      className="text-xs text-amber-400 h-6 px-2"
                    >
                      + Add Item
                    </Button>
                  </div>

                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[idx].productId = e.target.value;
                          setForm({ ...form, items: newItems });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[idx].quantity = Number(e.target.value);
                          setForm({ ...form, items: newItems });
                        }}
                        className="w-20 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-center font-mono"
                      />
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = form.items.filter((_, i) => i !== idx);
                            setForm({ ...form, items: newItems });
                          }}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Transit Notes</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Express van delivery"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  >
                    {submitting ? "Creating..." : "Save Draft Transfer"}
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
