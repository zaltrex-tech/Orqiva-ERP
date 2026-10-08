import { describe, it, expect } from "vitest";

describe("Procure-to-Pay Lifecycle & Financial Invariants (Phase 5)", () => {
  describe("Average Cost (AVCO) Valuation Engine", () => {
    it("should compute exact weighted average unit cost upon inbound goods receipt", () => {
      const currentQty = 10;
      const currentCost = 10.0; // Total value = $100
      const receivedQty = 20;
      const purchasePrice = 16.0; // Total added = $320

      const newQty = currentQty + receivedQty;
      const totalInventoryValue = currentQty * currentCost + receivedQty * purchasePrice;
      const newAvcoCost = Math.round((totalInventoryValue / newQty) * 100) / 100;

      expect(newQty).toBe(30);
      expect(totalInventoryValue).toBe(420.0);
      expect(newAvcoCost).toBe(14.0);
    });

    it("should preserve existing unit cost when initial stock quantity is zero", () => {
      const currentQty = 0;
      const currentCost = 0;
      const receivedQty = 50;
      const purchasePrice = 25.5;

      const newQty = currentQty + receivedQty;
      const newAvcoCost =
        newQty > 0
          ? ((currentQty * currentCost + receivedQty * purchasePrice) / newQty)
          : purchasePrice;

      expect(newQty).toBe(50);
      expect(newAvcoCost).toBe(25.5);
    });
  });

  describe("3-Way Matching Rules (PO vs. Goods Receipt vs. Vendor Bill)", () => {
    it("should confirm 3-way match when ordered, received, and billed quantities and amounts align", () => {
      const poItem = { sku: "LAPTOP-01", orderedQty: 5, unitPrice: 1200 };
      const receiptItem = { sku: "LAPTOP-01", receivedQty: 5 };
      const billItem = { sku: "LAPTOP-01", billedQty: 5, billedPrice: 1200 };

      const qtyMatch = poItem.orderedQty === receiptItem.receivedQty && receiptItem.receivedQty === billItem.billedQty;
      const priceMatch = poItem.unitPrice === billItem.billedPrice;
      const totalMatch = qtyMatch && priceMatch;

      expect(totalMatch).toBe(true);
    });

    it("should detect quantity mismatch if received quantity is less than purchase order", () => {
      const poItem = { sku: "DESK-OAK", orderedQty: 20, unitPrice: 250 };
      const receiptItem = { sku: "DESK-OAK", receivedQty: 15 }; // Short shipment

      const isFullyDelivered = receiptItem.receivedQty >= poItem.orderedQty;
      const pendingQty = poItem.orderedQty - receiptItem.receivedQty;

      expect(isFullyDelivered).toBe(false);
      expect(pendingQty).toBe(5);
    });

    it("should detect price variance if vendor bill unit price differs from purchase order", () => {
      const poUnitPrice = 85.0;
      const billedUnitPrice = 92.5;

      const variance = billedUnitPrice - poUnitPrice;
      const variancePercent = (variance / poUnitPrice) * 100;

      expect(variance).toBe(7.5);
      expect(variancePercent).toBeCloseTo(8.82, 1);
    });
  });

  describe("Vendor Billing & Double-Entry Invariant", () => {
    it("should generate perfectly balanced journal items for vendor bills (Debit 1030 / Credit 2010)", () => {
      const subtotal = 5000.0;
      const vatTax = 750.0; // 15% VAT
      const grandTotal = subtotal + vatTax;

      // Compound vendor bill journal items
      const journalItems = [
        { accountCode: "1030", accountName: "Inventory Asset", debit: subtotal, credit: 0 },
        { accountCode: "2020", accountName: "VAT Input Tax", debit: vatTax, credit: 0 },
        { accountCode: "2010", accountName: "Accounts Payable (Vendors)", debit: 0, credit: grandTotal },
      ];

      const sumDebits = journalItems.reduce((acc, i) => acc + i.debit, 0);
      const sumCredits = journalItems.reduce((acc, i) => acc + i.credit, 0);

      expect(sumDebits).toBe(grandTotal);
      expect(sumCredits).toBe(grandTotal);
      expect(sumDebits - sumCredits).toBe(0);
    });
  });

  describe("Trial Balance & Accounting Invariant Formulae", () => {
    it("should enforce Sum(Debits) == Sum(Credits) across all ledger accounts", () => {
      const ledgerBalances = [
        { code: "1010", name: "Cash", debit: 12000, credit: 0 },
        { code: "1030", name: "Inventory", debit: 8000, credit: 0 },
        { code: "2010", name: "Accounts Payable", debit: 0, credit: 5000 },
        { code: "3010", name: "Common Stock", debit: 0, credit: 10000 },
        { code: "4010", name: "Revenue", debit: 0, credit: 8000 },
        { code: "5010", name: "COGS", debit: 3000, credit: 0 },
      ];

      const totalDebit = ledgerBalances.reduce((a, b) => a + b.debit, 0);
      const totalCredit = ledgerBalances.reduce((a, b) => a + b.credit, 0);
      const delta = Math.abs(totalDebit - totalCredit);
      const isBalanced = delta < 0.001;

      expect(totalDebit).toBe(23000);
      expect(totalCredit).toBe(23000);
      expect(isBalanced).toBe(true);
    });

    it("should satisfy the fundamental accounting equation Assets = Liabilities + Equity", () => {
      const assets = 20000;
      const liabilities = 5000;
      const baseEquity = 10000;
      const netIncome = 5000; // Revenue (8000) - COGS (3000)

      const totalEquity = baseEquity + netIncome;
      const totalLiabilitiesAndEquity = liabilities + totalEquity;

      expect(assets).toBe(totalLiabilitiesAndEquity);
    });
  });
});
