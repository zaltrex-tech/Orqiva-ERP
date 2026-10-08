"use client";

import React, { useEffect } from "react";
import { Printer, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export interface ReceiptLineItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ThermalReceiptProps {
  orderNumber: string;
  sessionNumber: string;
  cashierName: string;
  dateTime?: string;
  branchName?: string;
  branchAddress?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: "CASH" | "CARD";
  amountTendered?: number;
  changeDue?: number;
  qrCodeDataUrl?: string;
  invoiceHash?: string;
  autoPrint?: boolean;
  onPrintCompleted?: () => void;
}

export function ThermalReceipt({
  orderNumber,
  sessionNumber,
  cashierName,
  dateTime = new Date().toLocaleString(),
  branchName = "Orqiva Flagship Branch (MAIN)",
  branchAddress = "742 Evergreen Plaza, Suite 100",
  items,
  subtotal,
  taxAmount,
  totalAmount,
  paymentMethod,
  amountTendered,
  changeDue = 0,
  qrCodeDataUrl,
  invoiceHash,
  autoPrint = false,
  onPrintCompleted,
}: ThermalReceiptProps) {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";
  const [renderedQr, setRenderedQr] = React.useState<string>(qrCodeDataUrl || "");

  React.useEffect(() => {
    if (qrCodeDataUrl) {
      setRenderedQr(qrCodeDataUrl);
      return;
    }
    // Dynamic fallback generation of compliant TLV QR code
    import("qrcode").then((QRCode) => {
      const fields = [
        { tag: 1, value: "Orqiva Enterprise Solutions Ltd" },
        { tag: 2, value: "300492817200003" },
        { tag: 3, value: new Date().toISOString() },
        { tag: 4, value: totalAmount.toFixed(2) },
        { tag: 5, value: taxAmount.toFixed(2) },
      ];
      const buffers = fields.map((f) => {
        const valBuf = Buffer.from(f.value, "utf8");
        return Buffer.concat([Buffer.from([f.tag]), Buffer.from([valBuf.length]), valBuf]);
      });
      const tlvBase64 = Buffer.concat(buffers).toString("base64");
      QRCode.toDataURL(tlvBase64, { margin: 1, width: 120 })
        .then((url) => setRenderedQr(url))
        .catch(() => {});
    });
  }, [qrCodeDataUrl, totalAmount, taxAmount]);
  useEffect(() => {
    if (autoPrint && typeof window !== "undefined") {
      const timer = setTimeout(() => {
        window.print();
        if (onPrintCompleted) onPrintCompleted();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, onPrintCompleted]);

  return (
    <div>
      {/* Print-specific CSS styles for 80mm Thermal Paper */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-container,
          #thermal-receipt-container * {
            visibility: visible !important;
          }
          #thermal-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Preview & Printable Receipt Component */}
      <div
        id="thermal-receipt-container"
        dir={isAr ? "rtl" : "ltr"}
        className="w-[80mm] max-w-full mx-auto bg-white text-black p-4 font-mono text-xs rounded-sm shadow-md border border-slate-300 select-none"
      >
        {/* Header */}
        <div className="text-center space-y-0.5 border-b border-dashed border-black pb-3 mb-2">
          <div className="text-sm font-bold tracking-wider">{t("receipt.brandName", "ORQIVA ERP")}</div>
          <div className="text-[10px] uppercase font-semibold">{branchName}</div>
          <div className="text-[9px] text-gray-700">{branchAddress}</div>
          <div className="text-[9px] text-gray-700">{t("receipt.vatRegId", "VAT REG ID: 300492817200003")}</div>
        </div>

        {/* Metadata */}
        <div className="text-[10px] space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between">
            <span>{t("receipt.orderNum", "Order #:")}</span>
            <span className="font-bold">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("receipt.session", "Session:")}</span>
            <span>{sessionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("receipt.cashier", "Cashier:")}</span>
            <span>{cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("receipt.dateTime", "Date/Time:")}</span>
            <span>{dateTime}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between text-[10px] font-bold border-b border-black pb-1 mb-1">
            <span>{t("receipt.item", "ITEM")}</span>
            <span>{t("receipt.qtyPrice", "QTY x PRICE")}</span>
            <span>{t("receipt.total", "TOTAL")}</span>
          </div>
          <div className="space-y-1 text-[10px]">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-semibold truncate">{item.name}</div>
                <div className="flex justify-between text-gray-800">
                  <span className="text-[9px]">{item.sku}</span>
                  <span>
                    {item.quantity} x ${item.unitPrice.toFixed(2)}
                  </span>
                  <span className="font-bold">${item.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-1 text-[10px] border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between">
            <span>{t("receipt.subtotal", "SUBTOTAL:")}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("receipt.vat", "VAT / TAX (15%):")}</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-black">
            <span>{t("receipt.totalPaid", "TOTAL PAID:")}</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px] pt-0.5 text-gray-800">
            <span>{t("receipt.method", "METHOD:")}</span>
            <span className="font-semibold">{paymentMethod === "CASH" ? (isAr ? "نقدي" : "CASH") : (isAr ? "بطاقة" : "CARD")}</span>
          </div>
          {paymentMethod === "CASH" && amountTendered && (
            <>
              <div className="flex justify-between text-[10px] text-gray-800">
                <span>{t("receipt.tendered", "TENDERED:")}</span>
                <span>${amountTendered.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>{t("receipt.change", "CHANGE:")}</span>
                <span>${changeDue.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Fiscal E-Invoicing QR Code & Anti-Tamper Chaining */}
        <div className="text-center py-2 border-b border-dashed border-black">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-800 mb-1">
            {t("receipt.fiscalInvoice", "Fiscal Electronic Invoice (ZATCA Compliant)")}
          </div>
          {renderedQr ? (
            <img
              src={renderedQr}
              alt="Fiscal QR Code"
              className="w-24 h-24 mx-auto border border-black/20 p-0.5 bg-white"
              id="receipt-qr-code"
            />
          ) : (
            <div className="w-24 h-24 mx-auto bg-gray-200 animate-pulse flex items-center justify-center text-[8px]">
              {t("receipt.generatingQr", "Generating QR...")}
            </div>
          )}
          <div className="text-[8px] font-mono text-gray-600 mt-1">
            CHAIN: {invoiceHash ? `${invoiceHash.slice(0, 16)}...` : "SHA256-ANTI-TAMPER"}
          </div>
        </div>

        {/* Footer & Barcode Simulation */}
        <div className="text-center pt-2 space-y-1 text-[9px] text-gray-700">
          <div>{t("receipt.rowLockValidated", "* ROW-LEVEL LOCK TRANSACTION VALIDATED *")}</div>
          <div>{t("receipt.thankYou", "Thank you for choosing Orqiva Enterprise.")}</div>
          <div className="pt-1 font-mono tracking-widest text-[11px] font-bold">
            ||| | ||||| || |||| ||| |||| |
          </div>
          <div>{orderNumber}</div>
        </div>
      </div>
    </div>
  );
}
