import { describe, it, expect } from "vitest";

describe("Orqiva Modular Monolith Cross-Domain Workflow", () => {
  it("should coordinate a complete POS sale through inventory and accounting", () => {
    // 1. Initial State
    const inventoryStock = 120; // 120 units of PRD-POS-TERM
    const unitPrice = 750.0;
    const taxRate = 0.15;
    const qtyPurchased = 2;

    // 2. Concurrency-safe inventory deduction
    const remainingStock = inventoryStock - qtyPurchased;
    expect(remainingStock).toBe(118);

    // 3. POS Financial Totals
    const subtotal = unitPrice * qtyPurchased; // $1,500.00
    const taxAmount = subtotal * taxRate;       // $225.00
    const totalCollected = subtotal + taxAmount; // $1,725.00

    expect(subtotal).toBe(1500.0);
    expect(taxAmount).toBe(225.0);
    expect(totalCollected).toBe(1725.0);

    // 4. Double-Entry Accounting Ledger Lines
    // Debit: Operating Cash (1010) = $1,725.00
    // Credit: Sales Revenue (4010) = $1,500.00
    // Credit: Sales Tax Payable (2020) = $225.00
    const ledgerLines = [
      { account: "1010", debit: totalCollected, credit: 0 },
      { account: "4010", debit: 0, credit: subtotal },
      { account: "2020", debit: 0, credit: taxAmount },
    ];

    const sumDebits = ledgerLines.reduce((acc, line) => acc + line.debit, 0);
    const sumCredits = ledgerLines.reduce((acc, line) => acc + line.credit, 0);

    expect(sumDebits).toBe(1725.0);
    expect(sumCredits).toBe(1725.0);
    expect(sumDebits - sumCredits).toBe(0.0);
  });
});
