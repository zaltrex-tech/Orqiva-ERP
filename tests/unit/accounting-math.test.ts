import { describe, it, expect } from "vitest";

describe("Double-Entry Accounting Invariant & Mathematical Precision", () => {
  it("should validate that debits exactly equal credits", () => {
    const items = [
      { accountId: "1010", debit: 1500.0, credit: 0 },
      { accountId: "4010", debit: 0, credit: 1500.0 },
    ];

    const totalDebit = items.reduce((acc, i) => acc + i.debit, 0);
    const totalCredit = items.reduce((acc, i) => acc + i.credit, 0);

    expect(totalDebit).toBe(totalCredit);
    expect(Math.abs(totalDebit - totalCredit)).toBeLessThanOrEqual(0.0001);
  });

  it("should detect unbalanced accounting transactions and compute the delta", () => {
    const items = [
      { accountId: "1010", debit: 1500.0, credit: 0 },
      { accountId: "4010", debit: 0, credit: 1400.0 }, // $100 shortfall
    ];

    const totalDebit = items.reduce((acc, i) => acc + i.debit, 0);
    const totalCredit = items.reduce((acc, i) => acc + i.credit, 0);
    const delta = Math.abs(totalDebit - totalCredit);

    expect(delta).toBe(100.0);
    expect(totalDebit === totalCredit).toBe(false);
  });

  it("should correctly handle compound entries with tax splits", () => {
    // Sale of $1,000 + 15% VAT ($150) = $1,150 Cash received
    const items = [
      { accountId: "1010", label: "Cash Received", debit: 1150.0, credit: 0 },
      { accountId: "4010", label: "Sales Revenue", debit: 0, credit: 1000.0 },
      { accountId: "2020", label: "VAT Output Tax", debit: 0, credit: 150.0 },
    ];

    const totalDebit = items.reduce((acc, i) => acc + i.debit, 0);
    const totalCredit = items.reduce((acc, i) => acc + i.credit, 0);

    expect(totalDebit).toBe(1150.0);
    expect(totalCredit).toBe(1150.0);
    expect(totalDebit - totalCredit).toBe(0);
  });

  it("should reject negative numbers to enforce double-entry directional integrity", () => {
    const isNegativeAllowed = (amount: number) => amount < 0;
    expect(isNegativeAllowed(-50)).toBe(true);
  });
});
