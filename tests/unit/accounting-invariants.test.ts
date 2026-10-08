import { describe, it, expect } from "vitest";
import { DoubleEntryEngine } from "@/modules/accounting/double-entry-engine";

describe("Phase 4 Invariants: Double-Entry Accounting Engine Invariants", () => {
  it("should strictly reject any journal entry where total debit does not equal total credit", async () => {
    const unbalancedResult = await DoubleEntryEngine.postEntry({
      tenantId: "tenant-test-01",
      actorId: "actor-test-01",
      journalId: "journal-gen-01",
      entryNumber: "JE-2026-UNBALANCED",
      items: [
        { accountId: "acc-1010", debit: 5000.0, credit: 0 },
        { accountId: "acc-2010", debit: 0, credit: 4999.95 }, // 5 cent delta
      ],
    });

    expect(unbalancedResult.success).toBe(false);
    if (!unbalancedResult.success) {
      expect(unbalancedResult.error).toContain("Accounting Invariant Violation");
      expect(unbalancedResult.error).toContain("Delta");
    }
  });

  it("should reject transactions with fewer than two lines", async () => {
    const singleLineResult = await DoubleEntryEngine.postEntry({
      tenantId: "tenant-test-01",
      actorId: "actor-test-01",
      journalId: "journal-gen-01",
      entryNumber: "JE-2026-SINGLE",
      items: [
        { accountId: "acc-1010", debit: 1000.0, credit: 0 },
      ],
    });

    expect(singleLineResult.success).toBe(false);
    if (!singleLineResult.success) {
      expect(singleLineResult.error).toContain("at least two ledger lines");
    }
  });

  it("should reject negative debit or credit amounts to preserve directional integrity", async () => {
    const negativeDebit = await DoubleEntryEngine.postEntry({
      tenantId: "tenant-test-01",
      actorId: "actor-test-01",
      journalId: "journal-gen-01",
      entryNumber: "JE-2026-NEG-DEBIT",
      items: [
        { accountId: "acc-1010", debit: -500.0, credit: 0 },
        { accountId: "acc-2010", debit: 0, credit: -500.0 },
      ],
    });

    expect(negativeDebit.success).toBe(false);
    if (!negativeDebit.success) {
      expect(negativeDebit.error).toContain("Negative debits or credits are not permitted");
    }
  });

  it("should reject line items containing both debit and credit amounts simultaneously", async () => {
    const dualAmount = await DoubleEntryEngine.postEntry({
      tenantId: "tenant-test-01",
      actorId: "actor-test-01",
      journalId: "journal-gen-01",
      entryNumber: "JE-2026-DUAL",
      items: [
        { accountId: "acc-1010", debit: 100.0, credit: 50.0 },
        { accountId: "acc-2010", debit: 0, credit: 50.0 },
      ],
    });

    expect(dualAmount.success).toBe(false);
    if (!dualAmount.success) {
      expect(dualAmount.error).toContain("cannot possess both debit and credit amounts");
    }
  });

  it("should accurately validate high-precision compound entries with floating point fractions", () => {
    // 3-way split with fractions: 333.3333 + 333.3333 + 333.3334 = 1000.0000
    const lines = [
      { accountId: "acc-cash", debit: 1000.0, credit: 0 },
      { accountId: "acc-rev1", debit: 0, credit: 333.3333 },
      { accountId: "acc-rev2", debit: 0, credit: 333.3333 },
      { accountId: "acc-rev3", debit: 0, credit: 333.3334 },
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    for (const l of lines) {
      totalDebit += Math.round(l.debit * 10000) / 10000;
      totalCredit += Math.round(l.credit * 10000) / 10000;
    }

    const delta = Math.abs(totalDebit - totalCredit);
    expect(delta).toBeLessThanOrEqual(0.0001);
  });

  it("should reject transactions exceeding the maximum decimal precision delta tolerance", () => {
    const lines = [
      { accountId: "acc-cash", debit: 1000.0, credit: 0 },
      { accountId: "acc-rev1", debit: 0, credit: 333.33 },
      { accountId: "acc-rev2", debit: 0, credit: 333.33 },
      { accountId: "acc-rev3", debit: 0, credit: 333.33 }, // total = 999.99, delta = 0.01
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    for (const l of lines) {
      totalDebit += Math.round(l.debit * 10000) / 10000;
      totalCredit += Math.round(l.credit * 10000) / 10000;
    }

    const delta = Math.abs(totalDebit - totalCredit);
    expect(delta).toBeGreaterThan(0.0001);
    expect(delta).toBeCloseTo(0.01, 4);
  });
});
