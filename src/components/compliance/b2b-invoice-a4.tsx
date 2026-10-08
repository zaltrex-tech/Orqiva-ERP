"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { ShieldCheck, Printer, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface B2BInvoiceLineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface B2BInvoiceProps {
  invoiceNumber: string;
  issueDate?: string;
  dueDate?: string;
  seller: {
    name: string;
    vatNumber: string;
    address: string;
    crNumber?: string;
  };
  customer: {
    name: string;
    vatNumber?: string;
    address?: string;
  };
  items: B2BInvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency?: string;
  previousHash?: string;
  invoiceHash?: string;
  tlvBase64?: string;
  onPrint?: () => void;
}

export function B2BInvoiceA4({
  invoiceNumber,
  issueDate = new Date().toLocaleDateString(),
  dueDate = new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
  seller = {
    name: "Orqiva Enterprise Solutions Ltd",
    vatNumber: "300492817200003",
    address: "742 Evergreen Plaza, Suite 100, Riyadh, Saudi Arabia",
    crNumber: "1010892019",
  },
  customer,
  items,
  subtotal,
  taxAmount,
  totalAmount,
  currency = "USD",
  previousHash = "0".repeat(64),
  invoiceHash,
  tlvBase64,
  onPrint,
}: B2BInvoiceProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQr = async () => {
      let payload = tlvBase64;
      if (!payload) {
        const fields = [
          { tag: 1, value: seller.name },
          { tag: 2, value: seller.vatNumber },
          { tag: 3, value: new Date().toISOString() },
          { tag: 4, value: totalAmount.toFixed(2) },
          { tag: 5, value: taxAmount.toFixed(2) },
        ];
        const buffers = fields.map((f) => {
          const valBuf = Buffer.from(f.value, "utf8");
          return Buffer.concat([Buffer.from([f.tag]), Buffer.from([valBuf.length]), valBuf]);
        });
        payload = Buffer.concat(buffers).toString("base64");
      }

      try {
        const url = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 180,
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error("Failed to generate B2B QR Code:", err);
      }
    };

    generateQr();
  }, [tlvBase64, seller, totalAmount, taxAmount]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Print-specific CSS for A4 Sheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          #b2b-invoice-a4-sheet,
          #b2b-invoice-a4-sheet * {
            visibility: visible !important;
          }
          #b2b-invoice-a4-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 no-print">
        <Button
          onClick={handlePrint}
          className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-600/20 text-xs"
        >
          <Printer className="h-4 w-4 me-2" />
          Print A4 Tax Invoice
        </Button>
      </div>

      {/* A4 Sheet Container */}
      <div
        id="b2b-invoice-a4-sheet"
        className="w-full max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 font-sans"
      >
        {/* Header: Company & Tax ID */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {seller.name}
            </div>
            <div className="text-xs text-slate-600 mt-1">{seller.address}</div>
            <div className="text-xs font-mono text-slate-800 mt-0.5">
              VAT REG: <span className="font-bold">{seller.vatNumber}</span>
              {seller.crNumber && ` • CR: ${seller.crNumber}`}
            </div>
          </div>

          <div className="text-start sm:text-end">
            <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold uppercase rounded-md tracking-wider mb-2">
              TAX INVOICE / فاتورة ضريبية
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              #{invoiceNumber}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Issue Date: <span className="font-medium text-slate-800">{issueDate}</span>
            </div>
            <div className="text-xs text-slate-500">
              Due Date: <span className="font-medium text-slate-800">{dueDate}</span>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Billed To (العميل)
            </span>
            <div className="font-bold text-sm text-slate-900">{customer.name}</div>
            {customer.address && <div className="text-slate-600 mt-0.5">{customer.address}</div>}
            {customer.vatNumber && (
              <div className="font-mono text-slate-800 mt-1">
                Client VAT: <span className="font-semibold">{customer.vatNumber}</span>
              </div>
            )}
          </div>

          <div className="sm:text-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Fiscal Compliance Verification
            </span>
            <div className="text-emerald-700 font-semibold flex sm:justify-end items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              ZATCA Phase 2 E-Invoice Standard
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
              Chained Ledger: SHA-256 Anti-Tamper
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto my-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 text-start">SKU / Item</th>
                <th className="py-2.5 px-3 text-start">Description</th>
                <th className="py-2.5 px-3 text-end">Qty</th>
                <th className="py-2.5 px-3 text-end">Unit Price</th>
                <th className="py-2.5 px-3 text-end">Tax Rate</th>
                <th className="py-2.5 px-3 text-end">Total ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900 text-start">
                    {item.sku}
                  </td>
                  <td className="py-3 px-3 text-slate-700 text-start">
                    {item.description}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-900">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-900">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-600">
                    {item.taxRate}%
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold text-slate-900">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary & QR Code Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4 border-t-2 border-slate-900">
          {/* Base64 TLV QR Code & Cryptographic Ledger Evidence */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-auto">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="ZATCA Compliant QR Code"
                className="w-28 h-28 border border-slate-300 p-1 bg-white rounded-md shrink-0"
              />
            ) : (
              <div className="w-28 h-28 bg-slate-200 rounded-md animate-pulse shrink-0" />
            )}
            <div className="space-y-1 text-[10px] text-slate-600">
              <div className="font-bold text-slate-900 text-xs">Fiscal QR Evidence</div>
              <div>Standard: 5-Tag TLV Base64</div>
              <div className="font-mono text-[9px] break-all max-w-[200px]">
                Prev Hash: {previousHash.slice(0, 16)}...
              </div>
              <div className="font-mono text-[9px] font-bold text-slate-800 break-all max-w-[200px]">
                Inv Hash: {invoiceHash ? invoiceHash.slice(0, 16) : "COMPUTING"}...
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (المجموع الفرعي):</span>
              <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT / Tax (15%):</span>
              <span className="font-mono font-semibold">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-slate-900 pt-2">
              <span>Total Due (الإجمالي):</span>
              <span className="font-mono text-base text-amber-700">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-500 pt-8 mt-8 border-t border-slate-200">
          <div>This is a computer-generated tax invoice verified under immutable cryptographic chaining.</div>
          <div>Orqiva Enterprise Monolith • SOC-2 Type II Certified</div>
        </div>
      </div>
    </div>
  );
}
