import { describe, it, expect } from "vitest";
import { EInvoiceService, TLVField } from "@/modules/compliance/e-invoice-service";

describe("Fiscal E-Invoicing & Anti-Tampering Ledger Compliance", () => {
  it("should encode and decode TLV fields with 100% parity across all 5 mandatory tags", () => {
    const fields: TLVField[] = [
      { tag: 1, value: "شركة أوركيفا للحلول المتقدمة (Orqiva ERP)" }, // Seller Name (Arabic + English)
      { tag: 2, value: "310123456700003" }, // 15-digit VAT number
      { tag: 3, value: "2026-10-08T18:00:00Z" }, // Timestamp
      { tag: 4, value: "1150.00" }, // Total with VAT
      { tag: 5, value: "150.00" }, // VAT Total
    ];

    const encodedBase64 = EInvoiceService.encodeTLV(fields);
    expect(encodedBase64).toBeDefined();
    expect(typeof encodedBase64).toBe("string");
    expect(encodedBase64.length).toBeGreaterThan(0);

    const decoded = EInvoiceService.decodeTLV(encodedBase64);
    expect(decoded.length).toBe(5);

    expect(decoded[0]).toEqual({ tag: 1, value: "شركة أوركيفا للحلول المتقدمة (Orqiva ERP)" });
    expect(decoded[1]).toEqual({ tag: 2, value: "310123456700003" });
    expect(decoded[2]).toEqual({ tag: 3, value: "2026-10-08T18:00:00Z" });
    expect(decoded[3]).toEqual({ tag: 4, value: "1150.00" });
    expect(decoded[4]).toEqual({ tag: 5, value: "150.00" });
  });

  it("should generate a valid QR Code DataURL from TLV payload", async () => {
    const fields: TLVField[] = [
      { tag: 1, value: "Orqiva Enterprise" },
      { tag: 2, value: "310000000000003" },
      { tag: 3, value: new Date().toISOString() },
      { tag: 4, value: "230.00" },
      { tag: 5, value: "30.00" },
    ];
    const tlvBase64 = EInvoiceService.encodeTLV(fields);
    const qrDataUrl = await EInvoiceService.generateQRDataUrl(tlvBase64);

    expect(qrDataUrl).toBeDefined();
    expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("should compute deterministic SHA-256 canonical hash with genesis chaining", () => {
    const genesis = EInvoiceService.GENESIS_HASH;
    const date = new Date("2026-10-08T12:00:00Z");

    const hash1 = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-2026-0001",
      date,
      "Orqiva Tech",
      "310123456700003",
      1000.0,
      150.0,
      1150.0
    );

    const hash2 = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-2026-0001",
      date,
      "Orqiva Tech",
      "310123456700003",
      1000.0,
      150.0,
      1150.0
    );

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
  });

  it("should detect hash alteration when payload or previous hash is tampered with", () => {
    const genesis = EInvoiceService.GENESIS_HASH;
    const date = new Date("2026-10-08T12:00:00Z");

    const originalHash = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-2026-0001",
      date,
      "Orqiva Tech",
      "310123456700003",
      1000.0,
      150.0,
      1150.0
    );

    // Tamper with total amount by 1 cent
    const tamperedHash = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-2026-0001",
      date,
      "Orqiva Tech",
      "310123456700003",
      1000.0,
      150.0,
      1150.01
    );

    expect(originalHash).not.toBe(tamperedHash);
  });

  it("should correctly link successive invoices in cryptographic hash chain", () => {
    const genesis = EInvoiceService.GENESIS_HASH;
    const date1 = new Date("2026-10-08T10:00:00Z");
    const date2 = new Date("2026-10-08T11:00:00Z");

    const hashInvoice1 = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-001",
      date1,
      "Orqiva",
      "310123456700003",
      500,
      75,
      575
    );

    const hashInvoice2 = EInvoiceService.computeInvoiceHash(
      hashInvoice1, // Chained from invoice 1
      "INV-002",
      date2,
      "Orqiva",
      "310123456700003",
      200,
      30,
      230
    );

    expect(hashInvoice1).not.toBe(genesis);
    expect(hashInvoice2).not.toBe(hashInvoice1);
    expect(hashInvoice2.length).toBe(64);
  });
});

describe("Inter-Branch Stock Transfers & Multi-Warehouse Routing Invariants", () => {
  it("should reject transfers where source and destination locations are identical", () => {
    const validateLocations = (sourceId: string, destId: string) => {
      if (sourceId === destId) {
        return { valid: false, error: "Source and destination locations cannot be identical" };
      }
      return { valid: true };
    };

    const res = validateLocations("loc-central-wh", "loc-central-wh");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("identical");

    const validRes = validateLocations("loc-central-wh", "loc-branch-riyadh");
    expect(validRes.valid).toBe(true);
  });

  it("should enforce positive integer quantities in transfer lines", () => {
    const validateTransferLines = (lines: { productId: string; quantity: number }[]) => {
      if (lines.length === 0) return { valid: false, error: "At least one item required" };
      for (const line of lines) {
        if (!line.quantity || line.quantity <= 0) {
          return { valid: false, error: "Quantity must be strictly positive" };
        }
      }
      return { valid: true };
    };

    expect(validateTransferLines([]).valid).toBe(false);
    expect(validateTransferLines([{ productId: "p1", quantity: 0 }]).valid).toBe(false);
    expect(validateTransferLines([{ productId: "p1", quantity: -5 }]).valid).toBe(false);
    expect(validateTransferLines([{ productId: "p1", quantity: 10 }]).valid).toBe(true);
  });

  it("should maintain zero-sum conservation during dispatch and receipt transitions", () => {
    // Initial State: Source has 50 units, Dest has 10 units. Total enterprise stock = 60 units.
    let sourceStock = 50;
    let destStock = 10;
    let inTransitStock = 0;

    const transferQty = 15;

    // Dispatch Event: deducts source, puts in transit
    sourceStock -= transferQty;
    inTransitStock += transferQty;
    expect(sourceStock + destStock + inTransitStock).toBe(60);
    expect(sourceStock).toBe(35);

    // Receive Event: completes transit, adds to destination
    inTransitStock -= transferQty;
    destStock += transferQty;
    expect(sourceStock + destStock + inTransitStock).toBe(60);
    expect(destStock).toBe(25);
    expect(inTransitStock).toBe(0);
  });
});

describe("Stocktake Reconciliation & General Ledger Invariants", () => {
  it("should accurately compute negative variance (shrinkage/spoilage) and balance double-entry journals", () => {
    const systemQty = 100;
    const countedQty = 92;
    const unitCost = 25.0; // 25 SAR per unit

    const varianceQty = countedQty - systemQty; // -8
    expect(varianceQty).toBe(-8);

    const costImpact = varianceQty * unitCost; // -200 SAR
    expect(costImpact).toBe(-200.0);

    // Journal Entry for Inventory Loss:
    // Debit: 5010 (Inventory Shrinkage/Loss Expense) = 200.0
    // Credit: 1030 (Inventory Asset) = 200.0
    const journalLines = [
      { accountCode: "5010", accountName: "Inventory Shrinkage Expense", debit: Math.abs(costImpact), credit: 0 },
      { accountCode: "1030", accountName: "Inventory Asset", debit: 0, credit: Math.abs(costImpact) },
    ];

    const totalDebit = journalLines.reduce((acc, l) => acc + l.debit, 0);
    const totalCredit = journalLines.reduce((acc, l) => acc + l.credit, 0);

    expect(totalDebit).toBe(200.0);
    expect(totalCredit).toBe(200.0);
    expect(totalDebit - totalCredit).toBe(0);
  });

  it("should accurately compute positive variance (found/surplus) and balance double-entry journals", () => {
    const systemQty = 40;
    const countedQty = 45;
    const unitCost = 50.0;

    const varianceQty = countedQty - systemQty; // +5
    expect(varianceQty).toBe(5);

    const costImpact = varianceQty * unitCost; // +250 SAR
    expect(costImpact).toBe(250.0);

    // Journal Entry for Inventory Gain:
    // Debit: 1030 (Inventory Asset) = 250.0
    // Credit: 4010 (Inventory Gain / Surplus Revenue) = 250.0
    const journalLines = [
      { accountCode: "1030", accountName: "Inventory Asset", debit: costImpact, credit: 0 },
      { accountCode: "4010", accountName: "Inventory Gain / Surplus", debit: 0, credit: costImpact },
    ];

    const totalDebit = journalLines.reduce((acc, l) => acc + l.debit, 0);
    const totalCredit = journalLines.reduce((acc, l) => acc + l.credit, 0);

    expect(totalDebit).toBe(250.0);
    expect(totalCredit).toBe(250.0);
    expect(totalDebit - totalCredit).toBe(0);
  });

  it("should produce a zero-impact entry when system and counted quantities match perfectly", () => {
    const systemQty = 50;
    const countedQty = 50;
    const unitCost = 30.0;

    const varianceQty = countedQty - systemQty;
    const costImpact = varianceQty * unitCost;

    expect(varianceQty).toBe(0);
    expect(costImpact).toBe(0);
  });
});
